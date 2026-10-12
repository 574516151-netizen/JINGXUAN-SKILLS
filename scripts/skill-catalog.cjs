// Catalog availability is independent of task execution or scoring.
const statuses=['available','excluded','retired'];
function normalize(item){
  const result={...item},old=result.assessment;
  if(!result.availability)result.availability=old?.status==='retired'?{status:'retired',reason:'来源已下架；个人副本保留',retiredAt:old.retiredAt}:old?.status==='excluded'||old?.cost?.status==='paid'?{status:'excluded',reason:'核心工具或 API 的长期免费条件尚未确认'}:{status:'available'};
  if(!result.cost&&old?.cost)result.cost={status:old.cost.status,evidence:'使用依赖及费用请查看来源说明'};
  for(const key of ['assessment','selectionStatus','selectionReason','selectionScore'])delete result[key];
  if(result.review){result.review={...result.review};delete result.review.runtimeTested;if(/实测|效果验收/.test(result.review.reason||''))result.review.reason='结合用途、文档完整性、维护情况和来源关注度整理。';}
  if(typeof result.notes==='string')result.notes=result.notes.replace(/执行效果尚未(?:逐条)?实测。?/g,'');
  return result;
}
function validateAvailability(item){if(!statuses.includes(item.availability?.status))throw Error('目录可用状态无效');if(item.cost&&!['free','paid','unknown'].includes(item.cost.status))throw Error('费用信息无效');}
function normalizeCatalog(value){return {...value,items:Array.isArray(value?.items)?value.items.map(normalize):value?.items};}
function sameSource(a,b){return !!(a&&b&&a.repo===b.repo&&a.ref===b.ref&&(a.path||'')===(b.path||'')&&JSON.stringify([...(a.licenseFiles||[])].sort())===JSON.stringify([...(b.licenseFiles||[])].sort()));}
function validateSelection(value){
  if(value===undefined)return;
  if(!value || value.enforceAll!==true || !Number.isSafeInteger(value.minRepositoryStars) || value.minRepositoryStars<5000
    || !Array.isArray(value.removedIds) || value.removedIds.length>5000 || new Set(value.removedIds).size!==value.removedIds.length
    || value.removedIds.some(id=>!/^[a-z0-9-]{1,100}$/.test(id)))throw Error('精选全量门槛声明无效');
}
function meetsSelection(item,selection){
  if(!selection)return true;
  const p=item.popularity;let url;try{url=new URL(p?.repositoryUrl);}catch{}
  return !!(item.source?.repo && p?.provider==='GitHub' && p.scope==='repository' && Number.isSafeInteger(p.stars) && p.stars>=selection.minRepositoryStars
    && Number.isFinite(Date.parse(p.checkedAt)) && url?.origin==='https://github.com' && !url.username && !url.password && !url.search && !url.hash
    && url.pathname.toLowerCase()==='/'+item.source.repo.toLowerCase() && !selection.removedIds.includes(item.id));
}
function merge(previous,next,now){
  const selection=next.selection || previous.selection;
  validateSelection(selection);
  const incoming=new Set(next.items.map(x=>x.id));
  const items=[...next.items.map(item=>{const old=previous.items.find(x=>x.id===item.id);if(!item.delivery&&old?.delivery&&sameSource(item.source,old.source))return {...item,delivery:old.delivery,guide:old.guide,usage:old.usage,prompt:old.prompt,requirements:old.requirements,description:old.description};return item;}),
    ...previous.items.filter(x=>!incoming.has(x.id)).map(x=>({...normalize(x),availability:{status:'retired',reason:'新版目录已移除此条目；本地收藏和个人副本保留',retiredAt:x.availability?.retiredAt||now}}))];
  return {...next,...(selection?{selection}:{}),items:items.filter(item=>meetsSelection(item,selection))};
}
function changes(previous,next){const old=new Map(previous.items.map(x=>[x.id,normalize(x)]));let added=0,updated=0,retired=0;for(const x of next.items){const before=old.get(x.id);if(!before)added++;else if(x.availability?.status==='retired'&&before.availability.status!=='retired')retired++;else if(JSON.stringify(x)!==JSON.stringify(before))updated++;}const ids=new Set(next.items.map(item=>item.id));const removed=previous.items.filter(item=>!ids.has(item.id)).length;return {added,updated,retired,removed};}
module.exports={normalize,normalizeCatalog,validateAvailability,validateSelection,meetsSelection,merge,changes};
