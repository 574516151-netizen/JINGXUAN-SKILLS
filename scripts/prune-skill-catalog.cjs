const fs=require('node:fs/promises');
const path=require('node:path');
const policy=require('../catalog/selection-policy.json');
function prune(catalog,records,checkedAt=new Date().toISOString(),minStars=policy.minRepositoryStars) {
  if(!Number.isSafeInteger(minStars)||minStars<5000||!Number.isFinite(Date.parse(checkedAt)))throw Error('无效的精选清理规则');
  const metadata=new Map(records.map(record=>[record.repo.toLowerCase(),record]));
  const output=structuredClone(catalog),retained=[],removed=[];
  for(const item of output.items) {
    const repo=item.source?.repo;
    if(!repo) {removed.push({id:item.id,name:item.displayName,reason:'缺少可核对的实际来源仓库'});continue;}
    const latest=metadata.get(repo.toLowerCase());
    if(!latest || !Number.isSafeInteger(latest.stars) || latest.stars<0 || !Number.isSafeInteger(latest.forks) || latest.forks<0
      || !Number.isFinite(Date.parse(latest.checkedAt)) || latest.url?.toLowerCase()!=='https://github.com/'+repo.toLowerCase())throw Error('来源仓库核对数据不完整：'+repo);
    item.popularity={provider:'GitHub',scope:'repository',stars:latest.stars,forks:latest.forks,checkedAt:latest.checkedAt,repositoryUrl:latest.url};
    if(latest.stars<minStars)removed.push({id:item.id,name:item.displayName,repo,stars:latest.stars,reason:'来源仓库 Star 低于 '+minStars});
    else retained.push(item);
  }
  output.items=retained;output.updatedAt=checkedAt;
  const active=new Set(retained.map(item=>item.id));
  output.selection={enforceAll:true,minRepositoryStars:minStars,removedIds:[...new Set([...(catalog.selection?.removedIds||[]),...removed.map(item=>item.id)])].filter(id=>!active.has(id)).sort()};
  return {catalog:output,report:{checkedAt,minRepositoryStars:minStars,before:catalog.items.length,retained:retained.length,removedCount:removed.length,repositories:records,removed}};
}
async function fetchMetadata(catalog,fetcher=fetch) {
  const repos=[...new Set(catalog.items.map(item=>item.source?.repo).filter(Boolean))],records=[],errors=[];let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,repos.length)},async()=>{
    for(;;) {
      const repo=repos[cursor++];if(!repo)return;
      try {
        const response=await fetcher('https://api.github.com/repos/'+repo,{headers:{'User-Agent':'Cockpit-Curated-Catalog'},signal:AbortSignal.timeout(30000)});
        if(!response.ok)throw Error('HTTP '+response.status);
        const data=await response.json();
        records.push({repo,url:data.html_url,stars:data.stargazers_count,forks:data.forks_count,checkedAt:new Date().toISOString()});
      }catch(error){errors.push(repo+': '+error.message);}
    }
  }));
  if(errors.length)throw Error('关注度核对失败，未修改目录：'+errors.join('；'));
  return records.sort((a,b)=>a.repo.localeCompare(b.repo));
}
function supportingFiles(catalog,guides,audit) {
  const ids=new Set(catalog.items.map(item=>item.id));
  // These read-only references are also used by previously saved personal
  // copies. Removing a curated card must not remove its installation guidance.
  const nextGuides=guides;
  const items=audit.items.filter(item=>ids.has(item.id));
  const nextAudit={...audit,total:items.length,bundles:items.filter(item=>item.kind==='bundle').length,single:items.filter(item=>item.kind==='single').length,
    singleSkill:items.filter(item=>item.skillPaths.length===1).length,multiSkill:items.filter(item=>item.skillPaths.length>1).length,items};
  return {guides:nextGuides,audit:nextAudit};
}
async function writeResult(root,result) {
  const dir=path.join(root,'catalog');
  require('./skill-admission.cjs').validate(result.catalog);
  // The app validator is available in this repository; the standalone public
  // catalog uses its own pre-publication validator instead.
  if(root===path.resolve(__dirname,'..') && require('node:fs').existsSync(path.join(root,'electron/engine/skills.js')))require('../electron/engine/skills').validateCatalog(result.catalog);
  const outputs=[['skills.json',result.catalog],['selection-audit.json',result.report]];
  const exists=async file=>fs.stat(file).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
  const hasGuides=await exists(path.join(dir,'source-guides.json')),hasAudit=await exists(path.join(dir,'source-audit.json'));
  if(hasGuides!==hasAudit)throw Error('来源配套核对文件缺失，未修改目录');
  if(hasGuides) {
    const supporting=supportingFiles(result.catalog,JSON.parse(await fs.readFile(path.join(dir,'source-guides.json'))),JSON.parse(await fs.readFile(path.join(dir,'source-audit.json'))));
    outputs.push(['source-guides.json',supporting.guides],['source-audit.json',supporting.audit]);
  }
  for(const [file,value] of outputs)await fs.writeFile(path.join(dir,file),JSON.stringify(value,null,2)+'\n');
}
module.exports={prune,fetchMetadata,supportingFiles,writeResult};
if(require.main===module)(async()=>{
  const args=process.argv.slice(2);if(args.some(arg=>arg!=='--apply'))throw Error('仅支持 --apply；默认只核对和预览');
  const root=path.resolve(__dirname,'..'),catalog=JSON.parse(await fs.readFile(path.join(root,'catalog/skills.json')));
  const result=prune(catalog,await fetchMetadata(catalog));
  if(args.includes('--apply'))await writeResult(root,result);
  console.log(JSON.stringify(result.report,null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
