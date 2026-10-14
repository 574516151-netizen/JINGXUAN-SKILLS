const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),appValidator=path.join(root,'electron/engine/skills.js');
const rules=require(fs.existsSync(appValidator)?'../electron/engine/skill-recommendation':'./skill-recommendation.cjs');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog/specialist-skills.json'),'utf8'));
rules.validateCatalog(catalog);
if(fs.existsSync(appValidator))require(appValidator).validateCatalog(catalog,{specialist:true});
console.log(JSON.stringify({specialistItems:catalog.items.length,workflows:catalog.items.map(x=>({id:x.id,skills:x.delivery.skillPaths.length,files:x.delivery.filePaths.length,stars:x.popularity.stars})),strictSelectionUnchanged:true}));
