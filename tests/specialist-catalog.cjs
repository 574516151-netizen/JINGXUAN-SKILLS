const assert=require('node:assert/strict'),rules=require('../scripts/skill-recommendation.cjs'),special=require('../catalog/specialist-skills.json'),fs=require('node:fs'),path=require('node:path');
rules.validateCatalog(special);
for(const name of ['skills.json','skills-v2.json']){
 const strict=JSON.parse(fs.readFileSync(path.join(__dirname,'../catalog',name)));
 assert(strict.items.every(x=>x.popularity.stars>=5000));assert(!strict.items.some(x=>rules.isSpecialist(x)));
 assert(!strict.items.some(x=>special.items.some(y=>x.id===y.id)));
}
const mutate=fn=>{const c=structuredClone(special);fn(c.items[0]);assert.throws(()=>rules.validateCatalog(c));};
for(const fn of [x=>delete x.workflow,x=>delete x.recommendation,x=>x.review.licenseChecked=false,x=>x.popularity.repositoryUrl='https://github.com/other/repo',x=>x.runtimeVerification.sourceRef='a'.repeat(40),x=>x.runtimeVerification.limits=[],x=>x.delivery.filePaths=[]])mutate(fn);
console.log('PASS: specialist workflows remain separate, complete, version-bound and explicit about validation limits');
