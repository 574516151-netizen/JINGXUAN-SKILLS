const fs=require('node:fs'),path=require('node:path');
function build(root=path.resolve(__dirname,'..')){
 const profiles={};
 for(const line of fs.readFileSync(path.join(root,'catalog/github-hot-projects.tsv'),'utf8').split(/\r?\n/)){
  if(!line.trim()||line.startsWith('#'))continue;
  const [id,kind,summary,example,...extra]=line.split('|');
  if(extra.length||!/^[-\w.]+\/[-\w.]+$/.test(id)||profiles[id]||!kind||!summary||!example)throw Error('项目导读格式或标识异常：'+id);
  profiles[id]={kind,summary,example};
 }
 fs.writeFileSync(path.join(root,'catalog/github-hot-profiles.json'),JSON.stringify(profiles,null,2)+'\n');
 return profiles;
}
module.exports={build};
if(require.main===module)console.log('已生成 '+Object.keys(build()).length+' 个项目导读');
