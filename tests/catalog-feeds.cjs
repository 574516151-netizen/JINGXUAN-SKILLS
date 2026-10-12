const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {prune,writeResult}=require('../scripts/prune-skill-catalog.cjs');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'curated-feeds-'));
 assert(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));
 try{
  await fs.mkdir(path.join(root,'catalog'));
  const modern=require('../catalog/skills-v2.json'),legacy=require('../catalog/skills.json');
  const records=c=>[...new Map(c.items.map(x=>[x.source.repo,{repo:x.source.repo,url:x.popularity.repositoryUrl,stars:x.popularity.stars,forks:x.popularity.forks,checkedAt:x.popularity.checkedAt}])).values()];
  const legacyBytes=Buffer.from(JSON.stringify(legacy)),modernBytes=Buffer.from(JSON.stringify(modern));
  await fs.writeFile(path.join(root,'catalog/skills.json'),legacyBytes);
  await fs.writeFile(path.join(root,'catalog/skills-v2.json'),modernBytes);
  const next=prune(modern,records(modern));assert.equal(next.report.removedCount,0);
  await writeResult(root,next,'skills-v2.json');
  assert.deepEqual(await fs.readFile(path.join(root,'catalog/skills.json')),legacyBytes);
  assert.equal(JSON.parse(await fs.readFile(path.join(root,'catalog/skills-v2.json'))).schemaVersion,2);
  await fs.access(path.join(root,'catalog/selection-audit-v2.json'));
  await assert.rejects(fs.access(path.join(root,'catalog/selection-audit.json')), {code:'ENOENT'});
  const modernAfter=await fs.readFile(path.join(root,'catalog/skills-v2.json'));
  await writeResult(root,prune(legacy,records(legacy)),'skills.json');
  assert.deepEqual(await fs.readFile(path.join(root,'catalog/skills-v2.json')),modernAfter);
  assert.equal(JSON.parse(await fs.readFile(path.join(root,'catalog/skills.json'))).schemaVersion,1);
  await fs.access(path.join(root,'catalog/selection-audit.json'));
  await assert.rejects(writeResult(root,next,'../unexpected.json'),/文件名无效/);
  console.log('PASS: modern and legacy catalog maintenance preserves the other feed');
 }finally{await fs.rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
