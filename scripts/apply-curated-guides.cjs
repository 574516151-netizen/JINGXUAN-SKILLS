const fs=require('node:fs'),path=require('node:path'),{sourceHash,sourceText,problems,isReady}=require('../electron/engine/github-hot-admission'),{types}=require('../electron/engine/github-hot-guides'),policy=require('../electron/engine/github-hot-policy'),{CONTENT}=require('./github-hot-guide-queue.cjs'),{summarize}=require('../electron/engine/github-hot-status');
function build(item,draft,now){
 const hash=sourceHash(item),text=sourceText(item),evidence=Object.entries(draft.evidence||{}).map(([field,anchor])=>{const at=text.indexOf(anchor);if(at<0)throw Error(item.id+': missing source anchor '+anchor);return {field,quote:text.slice(Math.max(0,at-80),Math.min(text.length,at+String(anchor).length+260))};});
 const guide={version:2,language:'zh-CN',kind:types[draft.kind]?.[0],purpose:draft.purpose,audience:draft.audience,example:draft.scenarios?.[0],steps:draft.steps,verification:draft.verification,evidence,sourceHash:hash,sourceUrl:item.readmeUrl,basis:'依据官方简介及 README 逐项整理并核对原文对应关系，附可检查的入门步骤；未实际运行项目，不代表效果已测试。',curated:true,review:{approved:true,sourceHash:hash,checkedAt:now,method:'source-reading-and-structure-check'}};
 const result={...item,summary:draft.summary,usage:draft.purpose,scenarios:draft.scenarios,requirements:draft.requirements,quickStart:draft.steps.map((s,i)=>(i+1)+'. '+s).join('\n'),guide,editorialStatus:'中文导读 · 官方原文已核对'};delete result.publication;
 const issues=problems(result);if(issues.length)throw Error(item.id+': '+issues.join(', '));policy.validateRepo(result);return result;
}
function apply({directory,sourceDirectory,drafts,batch,write=false,now=new Date().toISOString()}){
 const files=['github-hot.json','github-hot-guide-state.json','github-hot-state.json','github-hot-curation-audit.json'],before=Object.fromEntries(files.map(n=>[n,fs.existsSync(path.join(directory,n))?fs.readFileSync(path.join(directory,n)):null]));
 const feed=JSON.parse(before[files[0]]),state=JSON.parse(before[files[1]]),raw=JSON.parse(before[files[2]]),audit=before[files[3]]?JSON.parse(before[files[3]]):{schemaVersion:1,batches:[]},boards=JSON.stringify(feed.editions.map(e=>e.boards)),results=[];
 for(const draft of drafts){const input=JSON.parse(fs.readFileSync(path.join(sourceDirectory,draft.id.replaceAll('/','--')+'.source.json')));if(input.id!==draft.id)throw Error('Source identity mismatch');const result=build(input,draft,now),content=Object.fromEntries(CONTENT.map(k=>[k,result[k]]));let copies=0;
  for(const edition of feed.editions)for(let i=0;i<edition.items.length;i++)if(edition.items[i].id===draft.id){const old=edition.items[i];edition.items[i]={...old,...Object.fromEntries(['description','readmeExcerpt','readmeUrl','readmeFetchedAt',...CONTENT].map(k=>[k,result[k]]))};delete edition.items[i].publication;copies++;}
  if(!copies)throw Error('Project absent from published editions: '+draft.id);
  state.guides[draft.id]={sourceHash:sourceHash(result),completedAt:now,content};delete state.pending[draft.id];for(const key of Object.keys(state.drafts||{}))if(key.startsWith(draft.id+'|'))delete state.drafts[key];
  raw.readmes[draft.id]={text:result.readmeExcerpt,url:result.readmeUrl,fetchedAt:result.readmeFetchedAt};results.push({id:draft.id,sourceHash:sourceHash(result),editionCopies:copies});
 }
 for(const edition of feed.editions){edition.guideReadyCount=edition.items.filter(isReady).length;edition.guidePendingCount=edition.items.length-edition.guideReadyCount;}
 feed.generatedAt=now;feed.updateStatus=summarize(state,now);if(JSON.stringify(feed.editions.map(e=>e.boards))!==boards)throw Error('Historical rankings changed');policy.validateFeed(feed);
 audit.batches.push({batch,reviewedAt:now,method:'source-reading-and-structure-check',projects:results});
 if(write){try{for(const [i,value]of [feed,state,raw,audit].entries()){const file=path.join(directory,files[i]),temp=file+'.curation.tmp';fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n');fs.renameSync(temp,file);}}catch(e){for(const name of files){const file=path.join(directory,name);if(before[name])fs.writeFileSync(file,before[name]);else if(fs.existsSync(file))fs.unlinkSync(file);}throw e;}}
 return {batch,write,completed:results.length,pending:Object.keys(state.pending).length,rankingsPreserved:true,results};
}
module.exports={build,apply};
if(require.main===module){const args=process.argv.slice(2),option=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;try{console.log(JSON.stringify(apply({directory:path.resolve(option('--directory')||'catalog'),sourceDirectory:path.resolve(option('--source-directory')),drafts:JSON.parse(fs.readFileSync(path.resolve(option('--drafts')))),batch:option('--batch'),write:args.includes('--write')}),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
