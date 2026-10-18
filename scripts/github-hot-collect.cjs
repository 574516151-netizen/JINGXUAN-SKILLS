const fs=require('node:fs/promises'),path=require('node:path'),https=require('node:https');
const policy=require('../electron/engine/github-hot-policy');
const {enrich}=require('../electron/engine/github-hot-guides');
const {prepare:prepareGuides,newState}=require('./github-hot-guide-queue.cjs'),{createCompleter}=require('./github-hot-guide-ai.cjs'),{assertPublished}=require('../electron/engine/github-hot-admission');
const DAY=86400000;
function request(url,{token='',accept='application/vnd.github+json',maxBytes=4*1024*1024,redirects=3}={}){
  const u=new URL(url);if(u.protocol!=='https:'||!['github.com','api.github.com','raw.githubusercontent.com'].includes(u.hostname)||u.username||u.password)throw Error('不支持的数据源地址');
  return new Promise((resolve,reject)=>{const headers={'User-Agent':'Cockpit-GitHub-Hot','Accept':accept};if(token&&u.hostname==='api.github.com')headers.Authorization='Bearer '+token;
    const req=https.get(u,{headers,timeout:20000},res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();if(!redirects)return reject(Error('重定向过多'));return request(new URL(res.headers.location,u).href,{token,accept,maxBytes,redirects:redirects-1}).then(resolve,reject);}
      if(res.statusCode!==200){res.resume();return reject(Error('GitHub 接口 HTTP '+res.statusCode));}
      const chunks=[];let size=0;res.on('data',x=>{size+=x.length;if(size>maxBytes){req.destroy(Error('数据超出大小限制'));return;}chunks.push(x);});res.on('error',reject);res.on('end',()=>resolve(Buffer.concat(chunks)));
    });req.on('error',reject);req.on('timeout',()=>req.destroy(Error('GitHub 请求超时')));
  });
}
const decode=s=>s.replace(/&#x([a-f0-9]+);|&#(\d+);|&(amp|quot|lt|gt|apos);/gi,(_m,hex,num,named)=>hex||num?String.fromCodePoint(parseInt(hex||num,hex?16:10)):({amp:'&',quot:'"',lt:'<',gt:'>',apos:"'"}[named.toLowerCase()]));
function parseTrending(html,now){
  const articles=html.match(/<article\b[^>]*class="[^"]*Box-row[^"]*"[\s\S]*?<\/article>/g)||[];if(!articles.length)throw Error('GitHub Trending 页面结构变化');
  const rows=[];for(const article of articles){const heading=article.match(/<h2\b[\s\S]*?<\/h2>/)?.[0]||'',id=heading.match(/href="\/([^"?#]+\/[^"?#]+)"/)?.[1],label=decode(article.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' '),count=label.match(/([\d,]+)\s+stars this week/i)?.[1];if(id&&policy.repoPattern.test(id)&&count)rows.push({id:id.toLowerCase(),delta:Number(count.replace(/,/g,'')),metric:'github-trending',observedAt:now,periodStart:new Date(Date.parse(now)-7*DAY).toISOString(),periodEnd:now});}
  if(!rows.length)throw Error('GitHub Trending 未提供可识别的周增长');return rows;
}
function plainReadme(value){
 const text=value.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/<[^>]+>/g,'').replace(/\r\n/g,'\n');
 if(text.length<=6000)return text;
 const selected=[text.slice(0,2200)],headings=[...text.matchAll(/^#{1,4}\s+(.+)$/gm)];let size=2200;
 for(let i=0;i<headings.length&&size<6000;i++){const h=headings[i];if(h.index<2200||!/install|quick.?start|getting.?started|usage|examples?|how.to|使用|安装|入门|快速|deploy|requirements|prerequisites/i.test(h[1]))continue;const end=headings[i+1]?.index||text.length,section=text.slice(h.index,Math.min(end,h.index+1800, h.index+6000-size-2));if(section.length>10){selected.push(section);size+=section.length+2;}}
 if(selected.length===1)return text.slice(0,6000);return selected.join('\n\n').slice(0,6000);
}

function categoryFor(repo){const s=(repo.full_name+' '+(repo.description||'')+' '+(repo.topics||[]).join(' ')).toLowerCase();const cats=[];
 for(const [name,re]of [['3D 与游戏',/\b(blender|3d|game|godot|threejs|three\.js)\b/],['设计与创意',/design|drawing|canvas|ui-ux|illustration|figma|shadcn|bootstrap/],['图像、视频与音频',/video|audio|image|diffusion|comfyui|youtube|yt-dlp|iptv/],['学习与教程',/awesome|tutorial|learn|course|interview|roadmap|book|algorithm|beginners|cs-notes/],['AI 与智能体',/\b(ai|llm|agent|gpt|claude|codex|model|skills|ollama|transformers|tensorflow)\b/],['数据与知识管理',/database|knowledge|note-taking|rag|vector|search|markitdown|graphify/],['效率与办公',/productivity|automation|workflow|office|self-hosted|selfhosted|n8n/],['系统与实用工具',/linux|system|terminal|proxy|vpn|scrcpy|rustdesk|powertoys|zsh|activation|v2ray|free-for-dev|freedomain/]])if(re.test(s))cats.push(name);
 return cats.length?cats.slice(0,3):['开发与编程'];}
function normalize(repo,editorial,readme,now){const custom=editorial[repo.full_name.toLowerCase()]||{},cats=custom.categories||categoryFor(repo),home=repo.homepage||'';let homepage='';try{homepage=policy.httpsUrl(home);}catch(_){}
 const item=enrich({id:repo.full_name.toLowerCase(),fullName:repo.full_name,url:'https://github.com/'+repo.full_name,homepage,stars:repo.stargazers_count,forks:repo.forks_count||0,archived:false,fork:false,description:(repo.description||'').slice(0,3000),summary:'',categories:cats,platforms:custom.platforms||['按官方说明'],readmeUrl:readme?.url||'https://github.com/'+repo.full_name+'#readme',readmeExcerpt:readme?.text||'',readmeFetchedAt:readme?.fetchedAt||null,language:repo.language||'未标注',license:repo.license?.spdx_id||'未标注',pushedAt:repo.pushed_at||now,checkedAt:now,topics:(repo.topics||[]).slice(0,50)});
 // Keep project-specific overrides when maintained, rather than replacing them with category boilerplate.
 for(const key of ['scenarios','usage','requirements','quickStart'])if(custom[key])item[key]=custom[key];
 return item;}
function metricFor(repo,snapshots,now,trending){const target=Date.parse(now)-7*DAY,candidates=snapshots.filter(s=>Math.abs(Date.parse(s.at)-target)<=3600000&&Number.isSafeInteger(s.stars[repo.id]));candidates.sort((a,b)=>Math.abs(Date.parse(a.at)-target)-Math.abs(Date.parse(b.at)-target));if(candidates.length)return {delta:Math.max(0,repo.stars-candidates[0].stars[repo.id]),metric:'snapshot',observedAt:now,periodStart:candidates[0].at,periodEnd:now};return trending.find(x=>x.id===repo.id)||null;}
async function collect({directory,editorialFile,token='',publish=false,now=new Date().toISOString(),fetch=request,complete,aiConfig,aiKeys,maxGuideCompletions=6}){
 await fs.mkdir(directory,{recursive:true});const read=async(name,fallback)=>{try{return JSON.parse(await fs.readFile(path.join(directory,name),'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}};
 const guideState=await read('github-hot-guide-state.json',newState());
 const old=await read('github-hot.json',null),state=await read('github-hot-state.json',{snapshots:[],readmes:{}}),editorial=JSON.parse(await fs.readFile(editorialFile,'utf8'));if(old)policy.validateFeed(old);
 const repos=[];let total=0;for(let page=1;page<=10;page++){const data=JSON.parse((await fetch('https://api.github.com/search/repositories?q='+encodeURIComponent('stars:>'+policy.THRESHOLD+' archived:false fork:false')+'&sort=stars&order=desc&per_page=100&page='+page,{token})).toString());if(data.incomplete_results||!Array.isArray(data.items)||!Number.isInteger(data.total_count))throw Error('GitHub 搜索结果不完整，保留原榜单');total=data.total_count;if(total>1000)throw Error('候选超过搜索上限，需要拆分查询后才能发布');repos.push(...data.items);if(repos.length>=total)break;}
 const eligible=[...new Map(repos.filter(r=>r.stargazers_count>policy.THRESHOLD&&!r.archived&&!r.fork&&!r.disabled).map(r=>[r.full_name.toLowerCase(),r])).values()];if(repos.length<total)throw Error('候选采集不完整');
 let trending=[],trendingError='';try{trending=parseTrending((await fetch('https://github.com/trending?since=weekly',{accept:'text/html'})).toString(),now);}catch(_){trendingError='GitHub 周榜暂不可用；只使用已积累的七天快照';}
 const snapshots=state.snapshots.filter(s=>Date.parse(now)-Date.parse(s.at)<45*DAY&&Date.parse(s.at)<Date.parse(now)-12*3600000);snapshots.push({at:now,stars:Object.fromEntries(eligible.map(r=>[r.full_name.toLowerCase(),r.stargazers_count]))});
 const beijing=new Date(Date.parse(now)+8*3600000),editionDate=beijing.toISOString().slice(0,10),monday=beijing.getUTCDay()===1,policyChanged=old&&(old.thresholdExclusive!==policy.THRESHOLD||old.maxItems!==policy.MAX);
 let editionId=editionDate;const sameDay=old?.editions.filter(e=>e.id.slice(0,10)===editionDate)||[];if(sameDay.length&&policyChanged){let revision=2;while(sameDay.some(e=>e.id===editionDate+'-r'+revision))revision++;editionId=editionDate+'-r'+revision;}
 const shouldPublish=(!old||publish||monday)&&(!sameDay.length||policyChanged);
 let index=0,readmeFailures=0;const readmes={};await Promise.all(Array.from({length:4},async()=>{for(;;){const r=eligible[index++];if(!r)break;const id=r.full_name.toLowerCase(),cached=state.readmes[id];if(cached&&Date.parse(now)-Date.parse(cached.fetchedAt)<7*DAY){readmes[id]=cached;continue;}try{const data=JSON.parse((await fetch('https://api.github.com/repos/'+r.full_name+'/readme',{token,maxBytes:1024*1024})).toString());if(data.encoding!=='base64'||typeof data.content!=='string')throw Error();readmes[id]={text:plainReadme(Buffer.from(data.content,'base64').toString('utf8')),url:data.html_url||'https://github.com/'+r.full_name+'#readme',fetchedAt:now};}catch(_){readmeFailures++;if(cached)readmes[id]=cached;}}}));
 const allItems=eligible.map(r=>normalize(r,editorial,readmes[r.full_name.toLowerCase()],now)),metrics=new Map(allItems.map(r=>[r.id,metricFor(r,snapshots,now,trending)])),previous=old?.editions[0];
 const targets=[...new Set([...allItems].sort((a,b)=>b.stars-a.stars||a.id.localeCompare(b.id)).slice(0,policy.MAX).map(r=>r.id).concat(allItems.filter(r=>metrics.get(r.id)).sort((a,b)=>metrics.get(b.id).delta-metrics.get(a.id).delta||b.stars-a.stars||a.id.localeCompare(b.id)).slice(0,policy.MAX).map(r=>r.id)))];
 if(aiConfig===undefined){try{aiConfig=JSON.parse(await fs.readFile(path.join(directory,'github-hot-ai-config.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw Error('中文补全服务配置异常');}}
 if(aiKeys===undefined){try{aiKeys=JSON.parse(process.env.COCKPIT_HOT_GUIDE_KEYS||'{}');}catch(_){throw Error('中文补全凭据配置异常');}}
 const completer=complete||(aiConfig?.enabled&&Object.keys(aiKeys).length?createCompleter({providers:aiConfig.providers,keys:aiKeys,budget:guideState.budget}):undefined);
 const prepared=await prepareGuides({items:allItems,targets,state:guideState,complete:completer,now,maxPerRun:maxGuideCompletions,checkpoint:value=>atomic(path.join(directory,'github-hot-guide-state.json'),value)}),items=prepared.items;
 await atomic(path.join(directory,'github-hot-guide-state.json'),guideState);
 await atomic(path.join(directory,'github-hot-state.json'),{snapshots,readmes});
 if(!shouldPublish||!items.length)return {published:false,candidates:allItems.length,ready:items.length,pending:prepared.pendingCount,completed:prepared.completed,reason:!items.length?'awaiting-complete-chinese-guides':'edition-preserved'};

 const stars=policy.boardRows([...items].sort((a,b)=>b.stars-a.stars||a.id.localeCompare(b.id)),previous?.boards.stars),weeklyItems=items.filter(r=>metrics.get(r.id)).sort((a,b)=>metrics.get(b.id).delta-metrics.get(a.id).delta||b.stars-a.stars||a.id.localeCompare(b.id)),weekly=policy.boardRows(weeklyItems,previous?.boards.weekly,r=>metrics.get(r.id));
 const used=new Set([...stars,...weekly].map(r=>r.id)),edition={id:editionId,thresholdExclusive:policy.THRESHOLD,publishedAt:now,windowStart:new Date(Date.parse(now)-7*DAY).toISOString(),windowEnd:now,candidateCount:allItems.length,guideReadyCount:items.length,guidePendingCount:prepared.pendingCount,coverage:'GitHub 搜索中 Star > '+policy.THRESHOLD+'、非 Fork、未归档的公开仓库。每榜最多 '+policy.MAX+' 项；不足显示实际数量。仅发布具备完整中文介绍、用途、场景及入门方法的项目。周热榜只包含可验证七天增长的项目，不代表 GitHub 官方全球 Top'+policy.MAX+'。',weeklyNote:'周增长优先使用两次 Star 快照净变化；尚无七天快照时采用 GitHub 周榜页面的 stars this week。'+(trendingError?' '+trendingError:'')+(readmeFailures?' 部分 README 暂不可用，保留原文入口。':''),items:items.filter(r=>used.has(r.id)),boards:{stars,weekly}};
 const feed={schemaVersion:1,guidePolicyVersion:1,thresholdExclusive:policy.THRESHOLD,maxItems:policy.MAX,generatedAt:now,editions:[edition,...(old?.editions||[]).map(e=>({...e,thresholdExclusive:e.thresholdExclusive??old.thresholdExclusive}))].slice(0,12)};policy.validateFeed(feed);assertPublished(feed);
 await atomic(path.join(directory,'github-hot.json'),feed);return {published:true,candidates:allItems.length,stars:stars.length,weekly:weekly.length,ready:items.length,pending:prepared.pendingCount,completed:prepared.completed,readmeFailures};
}
async function atomic(file,value){const pending=file+'.tmp';await fs.writeFile(pending,JSON.stringify(value,null,2)+'\n');await fs.rename(pending,file);}
module.exports={collect,parseTrending,metricFor,normalize,categoryFor,request,plainReadme};
if(require.main===module){const args=process.argv.slice(2),value=key=>args[args.indexOf(key)+1];collect({directory:path.resolve(args.includes('--directory')?value('--directory'):'catalog/github-hot-data'),editorialFile:path.resolve(args.includes('--editorial')?value('--editorial'):'catalog/github-hot-editorial.json'),token:process.env.GITHUB_TOKEN||'',publish:args.includes('--publish')}).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});}
