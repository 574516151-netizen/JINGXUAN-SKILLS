const {enrich}=require('../electron/engine/github-hot-guides'),{isReady,sourceHash,sourceText,problems}=require('../electron/engine/github-hot-admission');
const {safeReason}=require('./github-hot-guide-ai.cjs');
const CONTENT=['summary','scenarios','usage','requirements','quickStart','guide','editorialStatus'];
function newState(){return {schemaVersion:1,guides:{},pending:{},drafts:{},budget:{day:'',counts:{}}};}
function cached(item,state){const value=state.guides[item.id];if(value?.sourceHash!==sourceHash(item)||!value.content)return item;const content=Object.fromEntries(CONTENT.map(k=>[k,value.content[k]]));const result={...item,...content};return isReady(result)?result:item;}
async function prepare({items,targets,state=newState(),complete,now,maxPerRun=6,checkpoint=async()=>{}}){
 if(state.schemaVersion!==1||!state.guides||!state.pending||!state.budget)throw Error('中文导读队列格式异常，已停止发布');
 const ids=new Set(targets),map=new Map(items.map(item=>[item.id,cached(enrich(item),state)]));let attempted=0,completed=0;
 const ordered=[...targets].sort((a,b)=>(state.pending[a]?.attempts||0)-(state.pending[b]?.attempts||0));
 for(const id of ordered){let item=map.get(id);if(!item)continue;
  if(isReady(item)){delete state.pending[id];continue;}
  const hash=sourceHash(item),prior=state.pending[id],pending=prior?.sourceHash===hash?prior:{id,sourceHash:hash,firstSeenAt:prior?.firstSeenAt||now,attempts:0};
  Object.assign(pending,{lastSeenAt:now,readmeUrl:item.readmeUrl,reason:pending.reason||'awaiting-chinese-guide'});state.pending[id]=pending;
  if(!complete){pending.reason='missing-api-configuration';continue;}
  if(attempted>=maxPerRun||Date.parse(pending.nextAttemptAt||0)>Date.parse(now))continue;
  attempted++;pending.attempts++;pending.lastAttemptAt=now;
  try{
   if(sourceText(item).length<100||!item.readmeExcerpt)throw Error('insufficient-source');
   const result=await complete(item,now);if(problems(result).length)throw Error('guide-validation-failed');
   // Content-only caching cannot override identity, ranking metrics or source material.
   const content=Object.fromEntries(CONTENT.map(k=>[k,result[k]]));const merged={...item,...content};if(!isReady(merged))throw Error('guide-validation-failed');
   state.guides[id]={sourceHash:hash,completedAt:now,content};map.set(id,merged);delete state.pending[id];completed++;
  }catch(e){pending.reason=safeReason(e);const wait=/http-(401|402|403|404|429)|free-model/.test(pending.reason)?24*3600000:3600000;pending.nextAttemptAt=pending.reason==='daily-budget-exhausted'?new Date(Date.parse(now.slice(0,10)+'T00:00:00Z')+86400000).toISOString():new Date(Date.parse(now)+wait).toISOString();}
  await checkpoint(state);
 }
 // Keep unfinished IDs out of the published feed, but retain their state for later retries.
 for(const [id,p]of Object.entries(state.pending))if(!ids.has(id)&&Date.parse(now)-Date.parse(p.lastSeenAt)>45*86400000)delete state.pending[id];
 return {items:[...map.values()].filter(isReady),state,attempted,completed,pendingCount:targets.filter(id=>!isReady(map.get(id)||{})).length};
}
module.exports={newState,prepare,cached,CONTENT};
