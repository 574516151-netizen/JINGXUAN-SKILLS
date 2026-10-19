const THRESHOLD=50000,MAX=300;
const {assertPublished}=require('./github-hot-admission');
const categories=['AI 与智能体','开发与编程','设计与创意','图像、视频与音频','3D 与游戏','效率与办公','数据与知识管理','系统与实用工具','学习与教程'];
const repoPattern=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
function check(value,message){if(!value)throw Error('GitHub 热榜数据无效：'+message);}
function text(value,max=1000){check(typeof value==='string'&&value.length<=max,'文本');return value;}
function date(value){check(typeof value==='string'&&Number.isFinite(Date.parse(value)),'时间');return value;}
function httpsUrl(value){if(value==='')return '';let url;try{url=new URL(value);}catch(_){throw Error('GitHub 热榜地址无效');}check(url.protocol==='https:'&&!url.username&&!url.password,'仅允许 HTTPS 链接');return url.href;}
function validateRepo(r,threshold=THRESHOLD){
  check(r&&typeof r.fullName==='string'&&repoPattern.test(r.id)&&r.id===r.fullName.toLowerCase(),'项目标识');
  check(Number.isSafeInteger(r.stars)&&r.stars>threshold,'Star 必须严格超过 '+threshold);
  check(Number.isSafeInteger(r.forks)&&r.forks>=0,'Fork 数量');
  check(r.archived===false&&r.fork===false,'归档或派生仓库');
  check(r.url==='https://github.com/'+r.fullName,'仓库地址');httpsUrl(r.homepage);httpsUrl(r.readmeUrl);
  text(r.fullName,220);text(r.summary,1200);text(r.description,3000);text(r.language,100);text(r.license,150);
  check(Array.isArray(r.categories)&&r.categories.length>0&&r.categories.every(x=>categories.includes(x)),'用途分类');
  check(Array.isArray(r.platforms)&&r.platforms.length<=8&&r.platforms.every(x=>typeof x==='string'&&x.length<=40),'使用平台');
  check(Array.isArray(r.scenarios)&&r.scenarios.length<=6&&r.scenarios.every(x=>typeof x==='string'&&x.length<=600),'场景');
  text(r.usage,1800);text(r.requirements,1800);text(r.quickStart,4000);text(r.readmeExcerpt,24000);date(r.checkedAt);date(r.pushedAt);
  if(r.guide!==undefined){const g=r.guide;check(g&&Number.isInteger(g.version)&&g.version>=1&&typeof g.curated==='boolean','项目导读');text(g.kind,80);text(g.audience,600);text(g.example,600);text(g.basis,600);check(Array.isArray(g.steps)&&g.steps.length>0&&g.steps.length<=6,'入门步骤');g.steps.forEach(s=>text(s,1000));}
  if(r.readmeFetchedAt)date(r.readmeFetchedAt);
  check(Array.isArray(r.topics)&&r.topics.length<=50&&r.topics.every(x=>typeof x==='string'&&x.length<=100),'主题');
  return r;
}
function validateEdition(e,maxItems=MAX,threshold=THRESHOLD){
  check(e&&/^\d{4}-\d{2}-\d{2}(?:-r(?:[2-9]|[1-9]\d+))?$/.test(e.id),'期号');date(e.publishedAt);date(e.windowStart);date(e.windowEnd);
  const editionThreshold=e.thresholdExclusive??threshold;check([50000,100000].includes(editionThreshold),'历史门槛');
  check(Date.parse(e.windowEnd)>Date.parse(e.windowStart)&&Date.parse(e.windowEnd)-Date.parse(e.windowStart)===7*86400000,'统计窗口');
  check(Array.isArray(e.items)&&e.items.length<=1000,'项目数量');const ids=new Set();for(const r of e.items){validateRepo(r,Math.max(threshold,editionThreshold));check(!ids.has(r.id),'项目重复');ids.add(r.id);}
  check(e.boards&&Array.isArray(e.boards.stars)&&Array.isArray(e.boards.weekly),'榜单');
  const map=new Map(e.items.map(r=>[r.id,r]));
  for(const kind of ['stars','weekly']){
    const rows=e.boards[kind];check(rows.length<=maxItems,'每榜最多 '+maxItems+' 项');const seen=new Set();let previous=Infinity;
    for(const [i,row] of rows.entries()){
      check(map.has(row.id)&&!seen.has(row.id)&&row.rank===i+1,'排名或引用');seen.add(row.id);
      check(Number.isInteger(row.streak)&&row.streak>=1&&row.streak<=10000,'连续入榜');check(row.change===null||Number.isInteger(row.change),'排名变化');
      const value=kind==='stars'?map.get(row.id).stars:row.delta;check(Number.isSafeInteger(value)&&value>=0&&value<=previous,'排序或增长数量');previous=value;
      if(kind==='weekly'){
        check(['snapshot','github-trending'].includes(row.metric),'热度来源');date(row.observedAt);date(row.periodStart);date(row.periodEnd);
        const span=Date.parse(row.periodEnd)-Date.parse(row.periodStart);check(Math.abs(span-7*86400000)<=3600000,'增长统计周期');
        check(Date.parse(row.periodEnd)<=Date.parse(e.windowEnd)+3600000&&Date.parse(row.periodEnd)>=Date.parse(e.windowEnd)-86400000,'过期热度');
      }
    }
  }
  check(Number.isInteger(e.candidateCount)&&e.candidateCount>=e.items.length,'候选数量');text(e.coverage,2000);text(e.weeklyNote,1200);return e;
}
function validateFeed(feed){check(feed?.schemaVersion===1&&[THRESHOLD,100000].includes(feed.thresholdExclusive)&&[100,MAX].includes(feed.maxItems),'规则版本');date(feed.generatedAt);check(Array.isArray(feed.editions)&&feed.editions.length>0&&feed.editions.length<=12,'最近 12 期');let previous=Infinity;const seen=new Set();for(const e of feed.editions){validateEdition(e,feed.maxItems,feed.thresholdExclusive);check(!seen.has(e.id)&&Date.parse(e.publishedAt)<=previous,'期号重复或顺序');previous=Date.parse(e.publishedAt);seen.add(e.id);}if(feed.guidePolicyVersion!==undefined){check([1,2].includes(feed.guidePolicyVersion),'中文导读规则版本');assertPublished(feed);}if(feed.updateStatus){const s=feed.updateStatus;date(s.lastCollectedAt);check(Number.isInteger(s.pendingCount)&&s.pendingCount>=0&&s.pendingCount<=10000,'队列数量');check(Number.isInteger(s.readyCount)&&s.readyCount>=0&&s.readyCount<=10000,'完成数量');check(Array.isArray(s.reasons)&&s.reasons.length<=30,'队列原因');for(const r of s.reasons){text(r.code,80);text(r.label,100);text(r.action,200);check(Number.isInteger(r.count)&&r.count>0&&r.count<=10000,'原因数量');if(r.nextAttemptAt)date(r.nextAttemptAt);}}return feed;}
function boardRows(items,previous=[],metric=null){const prior=new Map(previous.map(x=>[x.id,x]));return items.slice(0,MAX).map((r,i)=>{const old=prior.get(r.id);return {id:r.id,rank:i+1,change:old?old.rank-(i+1):null,streak:old?(old.streak||1)+1:1,...(metric?metric(r):{})};});}
module.exports={THRESHOLD,MAX,categories,repoPattern,validateRepo,validateEdition,validateFeed,boardRows,httpsUrl};
