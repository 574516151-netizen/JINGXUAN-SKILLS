const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const policy=require('../electron/engine/github-hot-policy'),{metricFor}=require('./github-hot-collect.cjs');
const {isReady,isUnfinished}=require('../electron/engine/github-hot-admission');
// Recompute a published period exclusively from preserved observations. No network,
// fresh Star counts, invented source metadata, or changes to the original edition.
function correct({directory,editionId,now=new Date().toISOString(),write=false}){
 const file=path.join(directory,'github-hot.json'),feed=policy.validateFeed(JSON.parse(fs.readFileSync(file))),original=feed.editions.find(e=>e.id===(editionId||feed.editions[0].revisionOf||feed.editions[0].id));assert(original,'原期不存在');
 const existing=feed.editions.find(e=>e.revisionOf===original.id&&e.weeklyPolicyVersion===policy.WEEKLY_POLICY_VERSION);if(existing)return {changed:false,edition:existing.id,weekly:existing.boards.weekly.length};
 assert(!original.revisionOf,'请选择原始期次');assert(Number.isFinite(Date.parse(now))&&Date.parse(now)>=Date.parse(feed.generatedAt),'修订发布时间不能早于当前数据');
 const state=JSON.parse(fs.readFileSync(path.join(directory,'github-hot-state.json'))),end=state.snapshots.find(s=>s.at===original.windowEnd);assert(end,'缺少本期原始 Star 快照，不能重算');
 const metadata=new Map();for(const e of feed.editions.filter(e=>Date.parse(e.windowEnd)<=Date.parse(original.windowEnd)))for(const item of e.items)if(!metadata.has(item.id))metadata.set(item.id,item);
 const eligible=Object.entries(end.stars).filter(([id,stars])=>policy.repoPattern.test(id)&&Number.isSafeInteger(stars)&&stars>(original.thresholdExclusive??feed.thresholdExclusive));
 const items=eligible.filter(([id])=>metadata.has(id)).map(([id,stars])=>({...structuredClone(metadata.get(id)),stars}));
 const fallbacks=original.boards.weekly.filter(r=>r.metric==='github-trending').map(({id,delta,metric,observedAt,periodStart,periodEnd})=>({id,delta,metric,observedAt,periodStart,periodEnd})),metrics=new Map(items.map(item=>[item.id,metricFor(item,state.snapshots,end.at,fallbacks)])),weeklyItems=items.filter(item=>metrics.get(item.id)).sort((a,b)=>metrics.get(b.id).delta-metrics.get(a.id).delta||b.stars-a.stars||a.id.localeCompare(b.id));
 const prior=feed.editions.find(e=>Date.parse(e.windowEnd)<Date.parse(original.windowEnd)),weekly=policy.boardRows(weeklyItems,prior?.boards.weekly,r=>metrics.get(r.id));assert(weekly.length>original.boards.weekly.length,'重算后没有新增有效项目，保留原期');
 const stars=structuredClone(original.boards.stars),used=new Set([...stars,...weekly].map(r=>r.id));for(const row of stars){assert(items.some(i=>i.id===row.id),'快照缺少原高星项目');assert.equal(end.stars[row.id],original.items.find(i=>i.id===row.id).stars,'原期 Star 与快照不一致');}
 const base=original.id.split('-r')[0];let revision=2;while(feed.editions.some(e=>e.id===base+'-r'+revision))revision++;
 const edition={...structuredClone(original),id:base+'-r'+revision,publishedAt:now,revisionOf:original.id,weeklyPolicyVersion:policy.WEEKLY_POLICY_VERSION,revisionReason:'修复采集时间偏移导致七天快照漏匹配',items:items.filter(i=>used.has(i.id)),boards:{stars,weekly},coverage:original.coverage+' 修正版只使用本期原始 Star 快照和已留存的公开项目信息；缺少资料的候选不补造。',weeklyNote:'周增长优先采用最接近七天的真实 Star 快照，允许采集时刻偏差 ±12 小时；每项显示实际起止时间。没有合格快照时仅复用原期已发布的 GitHub 周榜增长，不以总 Star 代替。净增下降按 0 展示。'};
 edition.guideReadyCount=edition.items.filter(isReady).length;edition.guidePendingCount=edition.items.filter(isUnfinished).length;
 const updated={...feed,weeklyPolicyVersion:policy.WEEKLY_POLICY_VERSION,generatedAt:now,editions:[edition,...feed.editions].slice(0,12)};policy.validateFeed(updated);
 const report={changed:true,edition:edition.id,revisionOf:original.id,before:original.boards.weekly.length,weekly:weekly.length,stars:stars.length,matchedCandidates:weeklyItems.length,missingMetadata:eligible.filter(([id])=>!metadata.has(id)).map(([id])=>id),metrics:{snapshot:weekly.filter(r=>r.metric==='snapshot').length,trending:weekly.filter(r=>r.metric==='github-trending').length},actualPeriods:[...new Set(weekly.map(r=>r.periodStart+' — '+r.periodEnd))],oldEditionsUnchanged:feed.editions.every((e,i)=>JSON.stringify(e)===JSON.stringify(updated.editions[i+1]))};
 if(write){const temp=file+'.correction.tmp';try{fs.writeFileSync(temp,JSON.stringify(updated,null,2)+'\n');fs.renameSync(temp,file);}finally{fs.rmSync(temp,{force:true});}}
 return report;
}
if(require.main===module){const args=process.argv.slice(2),value=name=>args[args.indexOf(name)+1];try{console.log(JSON.stringify(correct({directory:path.resolve(args.includes('--directory')?value('--directory'):'catalog'),editionId:args.includes('--edition')?value('--edition'):undefined,write:args.includes('--write')}),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={correct};
