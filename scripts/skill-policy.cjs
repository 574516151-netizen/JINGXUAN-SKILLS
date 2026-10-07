const crypto=require('node:crypto');
function sourceRef(item){return item.source?.ref||('local-template-sha256:'+crypto.createHash('sha256').update(item.prompt||'').digest('hex'));}
const weights={effect:40,usability:20,stability:15,maintenance:10,popularity:10,chinese:5};
const statuses=['candidate','featured','excluded','retired'];
function score(item){
  const ratings=item.assessment?.ratings||{};
  // Star is repository attention, not individual Skill usage. No invented task scores.
  const stars=item.popularity?.stars;
  const popularity=Number.isSafeInteger(stars)?Math.min(5,Math.log10(stars+1)):0;
  return Math.round(Object.entries(weights).reduce((sum,[key,weight])=>sum+(key==='popularity'?popularity:Number(ratings[key]||0))*weight/5,0));
}
function qualify(item){
  const a=item.assessment;
  if(a?.status==='retired')return {status:'retired',reason:a.reason||'已从推荐目录下架'};
  if(a?.status==='excluded'||a?.cost?.status==='paid')return {status:'excluded',reason:a.reason||'需要付费，不在免费精选范围'};
  const tests=a?.tests;
  const verified=Array.isArray(tests)&&tests.length>=2&&tests.some(t=>t.kind==='normal')&&tests.some(t=>t.kind==='boundary')&&tests.every(t=>t.passed===true&&t.task?.trim()&&t.result?.trim()&&t.artifacts?.length);
  const sameVersion=a?.sourceRef===sourceRef(item);
  const complete=['effect','usability','stability','maintenance','chinese'].every(k=>Number.isFinite(a?.ratings?.[k])&&a.ratings[k]>=0&&a.ratings[k]<=5);
  const pass=a?.status==='featured'&&a.cost?.status==='free'&&a.cost.evidence?.trim()&&Number.isFinite(Date.parse(a.cost.verifiedAt))&&/^reports\/[a-z0-9-]+\.md$/.test(a.report||'')&&a.environment?.trim()&&Number.isFinite(Date.parse(a.testedAt))&&verified&&sameVersion&&complete&&item.downloadAllowed!==false&&item.review?.licenseChecked===true&&score(item)>=80;
  return pass?{status:'featured',reason:a.reason||'免费真实任务验收通过'}:{status:'candidate',reason:a?.reason||'尚未完成免费运行与真实任务验收'};
}
function validateAssessment(item){
  const a=item.assessment;if(!a)return;
  if(!statuses.includes(a.status)||!['free','paid','unknown'].includes(a.cost?.status))throw Error('资源验收状态无效');
  if(a.status==='featured'&&qualify(item).status!=='featured')throw Error('精选必须免费、固定版本实测通过且评分至少80分');
  if(a.tests&&!Array.isArray(a.tests))throw Error('实测记录格式无效');
  for(const t of a.tests||[]){if(!['normal','boundary'].includes(t.kind)||typeof t.passed!=='boolean'||!Array.isArray(t.artifacts)||t.artifacts.some(x=>!/^artifacts\/[a-z0-9-]+\/[a-z0-9.-]+$/.test(x.path||'')||! /^[a-f0-9]{64}$/.test(x.sha256||'')))throw Error('实测记录格式无效');}
}
function present(item){const selection=qualify(item);return {...item,selectionStatus:selection.status,selectionReason:selection.reason,selectionScore:selection.status==='featured'?score(item):null};}
function merge(previous,next,now){
  const incoming=new Set(next.items.map(x=>x.id));
  return {...next,items:[...next.items,...previous.items.filter(x=>!incoming.has(x.id)).map(x=>({...x,assessment:{...x.assessment,status:'retired',reason:'新版目录已移除此条目；本地收藏和个人副本保留',cost:x.assessment?.cost||{status:'unknown'},retiredAt:now}}))]};
}
function changes(previous,next){
  const old=new Map(previous.items.map(x=>[x.id,x]));let added=0,updated=0,retired=0;
  for(const x of next.items){const before=old.get(x.id);if(!before)added++;else if(qualify(x).status==='retired'&&qualify(before).status!=='retired')retired++;else if(JSON.stringify(x)!==JSON.stringify(before))updated++;}
  return {added,updated,retired};
}
module.exports={sourceRef,weights,score,qualify,validateAssessment,present,merge,changes};
