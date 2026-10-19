const crypto=require('node:crypto'),profiles=require('../../catalog/github-hot-profiles.json'),baseline=new Set(require('../../catalog/github-hot-guide-baseline.json'));
const {types,enrich}=require('./github-hot-guides');
const SOURCE_FIELDS=['summary','purpose','scenarios','steps','verification'];
const sourceText=item=>[(item.description||'').trim(),(item.readmeExcerpt||'').trim()].join('\n\n');
const sourceHash=item=>crypto.createHash('sha256').update(item.id+'\n'+sourceText(item)).digest('hex');
function chinese(text,min=6,max=1200){return typeof text==='string'&&text.length<=max&&(text.match(/[\u3400-\u9fff]/g)||[]).length>=min&&!/待(?:翻译|补充|完善|核对)|尚未|暂无|TBD|TODO|lorem ipsum|具体能力见|请结合下方/i.test(text);}
function problems(item){
 const g=item.guide,profile=profiles[item.id];
 // The already-written 302 project guides remain available. New IDs cannot use this exception.
 if(baseline.has(item.id)&&profile&&g?.version===1&&g.curated===true&&item.summary===profile.summary&&g.example===profile.example&&g.kind===types[profile.kind]?.[0])return [];
 const errors=[];
 if(g?.version!==2||g.language!=='zh-CN'||g.curated!==true)return ['missing-complete-chinese-guide'];
 for(const [field,value,min,max]of [['summary',item.summary,16,1200],['purpose',g.purpose,10,1200],['audience',g.audience,4,600],['example',g.example,8,600],['requirements',item.requirements,6,1800],['verification',g.verification,8,1000]])if(!chinese(value,min,max))errors.push('invalid-chinese-'+field);
 if(!Object.values(types).some(t=>t[0]===g.kind&&t[0]!==types.unknown[0]))errors.push('unknown-project-type');
 if(!Array.isArray(item.scenarios)||!item.scenarios.length||item.scenarios.length>4||!item.scenarios.every(s=>chinese(s,8,600)))errors.push('missing-chinese-scenarios');
 if(!Array.isArray(g.steps)||g.steps.length<2||g.steps.length>6||!g.steps.every(s=>chinese(s,5,1000))||new Set(g.steps).size!==g.steps.length)errors.push('missing-chinese-start-steps');
 const boilerplate=new Set(Object.values(types).flatMap(t=>[t[2],t[3]]));
 if(g.steps?.some?.(s=>boilerplate.has(s)))errors.push('generic-start-steps');
 const hash=sourceHash(item),source=sourceText(item);
 const quoted=[item.summary,g.purpose,...(Array.isArray(g.steps)?g.steps:[]),g.verification].filter(v=>typeof v==='string').join('\n').match(/`([^`\n]+)`/g)||[];
 if(quoted.some(q=>!source.includes(q.slice(1,-1))))errors.push('unsupported-inline-code');
 if(g.sourceHash!==hash||!item.readmeExcerpt||g.sourceUrl!==item.readmeUrl)errors.push('source-mismatch');
 if(!Array.isArray(g.evidence)||g.evidence.length>12||SOURCE_FIELDS.some(field=>!g.evidence.some(e=>e?.field===field&&typeof e.quote==='string'&&e.quote.trim().length>=12&&e.quote.length<=1000&&source.includes(e.quote))))errors.push('missing-source-evidence');
 if(g.review?.approved!==true||g.review.sourceHash!==hash||!Number.isFinite(Date.parse(g.review.checkedAt)))errors.push('missing-source-review');
 return errors;
}
const isReady=item=>problems(item).length===0;
function isLimited(item){const p=item.publication;return p?.status==='rate-limited'&&p.reason==='http-429'&&p.sourceHash===sourceHash(item)&&Number.isFinite(Date.parse(p.attemptedAt))&&Number.isFinite(Date.parse(p.nextAttemptAt))&&Date.parse(p.nextAttemptAt)>Date.parse(p.attemptedAt)&&!!item.description?.trim()&&!!item.readmeExcerpt?.trim()&&item.summary==='中文介绍未补齐 · 请查看官方原文'&&!item.guide&&item.scenarios?.length===0&&item.usage===''&&item.quickStart==='';}
const isPublishable=(item,version=2)=>isReady(item)||(version===2&&isLimited(item));
function limitedItem(item,pending){if(pending?.reason!=='http-429'||pending.sourceHash!==sourceHash(item))return null;const value={...item,summary:'中文介绍未补齐 · 请查看官方原文',scenarios:[],usage:'',quickStart:'',requirements:'中文说明待补齐，使用前请核对官方 README。',editorialStatus:'模型限流 · 中文介绍未补齐',publication:{status:'rate-limited',reason:'http-429',sourceHash:pending.sourceHash,attemptedAt:pending.lastAttemptAt,nextAttemptAt:pending.nextAttemptAt}};delete value.guide;return isLimited(value)?value:null;}
function assertPublished(feed){for(const e of feed.editions)for(const item of e.items)if(!isPublishable(item,feed.guidePolicyVersion||1))throw Error('GitHub 热榜项目缺少完整中文导读：'+item.id);return feed;}
function visibleFeed(feed){let hidden=0;const editions=feed.editions.map(e=>{const items=e.items.map(item=>isLimited(item)?item:enrich(item)).filter(item=>{if(isPublishable(item,feed.guidePolicyVersion||1))return true;hidden++;return false;}),ids=new Set(items.map(i=>i.id));const boards=Object.fromEntries(['stars','weekly'].map(kind=>{const filtered=e.boards[kind].filter(row=>ids.has(row.id)),changed=filtered.length!==e.boards[kind].length;return [kind,filtered.map((r,i)=>({...r,rank:i+1,...(changed?{change:null,streak:1}:{})}))];}));return {...e,items,boards};});return {feed:{...feed,editions},hidden};}
module.exports={SOURCE_FIELDS,sourceText,sourceHash,chinese,problems,isReady,isLimited,isPublishable,limitedItem,assertPublished,visibleFeed};
