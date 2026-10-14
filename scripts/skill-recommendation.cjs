const contexts = { blender: 'Blender 建模与渲染', threejs: 'Three.js 网页三维', mcp: 'MCP 执行工具' };
function validate(input) {
  if (input.usageContext !== undefined && !contexts[input.usageContext]) throw Error('资源用途标识无效');
  const r = input.recommendation;
  if (r && (r.tier !== 'specialist' || typeof r.reason !== 'string' || !r.reason.trim() || r.reason.length > 2000)) throw Error('专项推荐依据无效');
  const w = input.workflow;
  if (w && (typeof w.entry !== 'string' || !/^[a-z0-9-]{1,64}$/.test(w.entry)
    || !Array.isArray(w.stages) || w.stages.length < 3 || w.stages.length > 12 || w.stages.some(x => typeof x !== 'string' || x.length > 100)
    || !Array.isArray(w.scenarios) || !w.scenarios.length || w.scenarios.length > 10
    || w.scenarios.some(x => typeof x.name !== 'string' || !x.name.trim() || x.name.length > 100 || typeof x.prompt !== 'string' || !x.prompt.trim() || x.prompt.length > 20000))) throw Error('完整工作流说明无效');
  const v = input.runtimeVerification;
  if (v && (!['sample-passed', 'untested'].includes(v.status) || v.sourceRef !== (input.source || input.origin)?.ref
    || v.entrySha256 !== input.delivery?.entrySha256)) throw Error('样例验证必须对应当前来源与入口版本');
  if (v?.status === 'sample-passed') {
    if (!Number.isFinite(Date.parse(v.testedAt)) || !['headless-python', 'agent-mcp'].includes(v.method)
      || typeof v.environment !== 'string' || !v.environment.trim() || v.environment.length > 300
      || typeof v.task !== 'string' || !v.task.trim() || v.task.length > 2000
      || !Array.isArray(v.checks) || v.checks.length < 3 || v.checks.length > 20 || v.checks.some(x => typeof x !== 'string' || x.length > 1000)
      || !Array.isArray(v.limits) || !v.limits.length || v.limits.length > 10 || v.limits.some(x => typeof x !== 'string' || x.length > 1000)
      || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/blob\/[\w.-]+\/[^?#]+$/.test(v.reportUrl || '')) throw Error('样例验证证据不完整');
  }
}
function metadata(input) {
  validate(input);
  return Object.fromEntries(['usageContext', 'recommendation', 'workflow', 'runtimeVerification'].filter(key => input[key] !== undefined).map(key => [key, structuredClone(input[key])]));
}
function isSpecialist(item) { return item.recommendation?.tier === 'specialist'; }
function validateCatalog(value){
  if(value?.schemaVersion!==2||value.tier!=='specialist'||value.selection!==undefined||!Number.isFinite(Date.parse(value.updatedAt))||!Array.isArray(value.items)||value.items.length>20)throw Error('专项推荐必须使用独立目录，最多 20 项');
  const ids=new Set();
  for(const item of value.items){
    validate(item);const p=item.popularity,s=item.source,d=item.delivery;let url;try{url=new URL(p?.repositoryUrl);}catch{}
    if(!/^[a-z0-9-]{1,100}$/.test(item.id)||ids.has(item.id))throw Error('专项推荐 ID 无效或重复');ids.add(item.id);
    if(!isSpecialist(item)||item.type!=='skill'||!item.workflow||!contexts[item.usageContext]||item.availability?.status!=='available'||d?.status!=='verified'||!d.usageVerified||!item.downloadAllowed||item.cost?.status!=='free'||!item.review?.sourceChecked||!item.review.structureChecked||!item.review.licenseChecked)throw Error('专项推荐需要完整工作流、来源、许可、配套及免费条件核对：'+item.id);
    if(!/^[\w.-]+\/[\w.-]+$/.test(s?.repo)||!/^[a-f0-9]{40}$/.test(s.ref)||!s.path||p?.provider!=='GitHub'||p.scope!=='repository'||!Number.isSafeInteger(p.stars)||p.stars<0||!Number.isFinite(Date.parse(p.checkedAt))||url?.href.toLowerCase()!==('https://github.com/'+s.repo).toLowerCase())throw Error('专项推荐必须显示实际来源仓库及固定版本');
    if(!/^[a-f0-9]{64}$/.test(d.entrySha256)||d.ref!==s.ref||d.scopeVersion!==2||!Array.isArray(d.skillPaths)||!d.skillPaths.includes(s.path+'/SKILL.md')||!d.skillPaths.every(x=>d.filePaths?.includes(x))||!s.licenseFiles?.length||!s.licenseFiles.every(x=>d.filePaths.includes(x)))throw Error('专项推荐配套清单不完整');
    if(item.workflow.entry!==s.path.split('/').at(-1)||!item.guide?.inputs?.length||!item.guide.outputs?.length||!item.guide.verification?.length||!item.prompt?.trim()||!d.setup?.length)throw Error('专项推荐安装、入口及使用说明不完整');
  }
  return value;
}
module.exports = { contexts, validate, metadata, isSpecialist,validateCatalog };
