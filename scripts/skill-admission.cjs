// Maintainer rules apply to every curated item. Personal libraries are separate.
const policy = require('../catalog/selection-policy.json');
function validate(catalog, rules = policy) {
  if(rules.schemaVersion!==2 || rules.enforceAll!==true || !Number.isSafeInteger(rules.minRepositoryStars) || rules.minRepositoryStars<5000)throw Error('精选收录规则无效');
  if(!Array.isArray(catalog.items))throw Error('精选目录无效');
  let checked=0;
  for(const item of catalog.items) {
    const popularity=item.popularity,repo=item.source?.repo;
    let url;try{url=new URL(popularity?.repositoryUrl);}catch{}
    if(!repo || popularity?.provider!=='GitHub' || popularity.scope!=='repository'
      || !url || url.origin!=='https://github.com' || url.username || url.password || url.search || url.hash
      || url.pathname.toLowerCase()!=='/'+repo.toLowerCase() || !Number.isFinite(Date.parse(popularity.checkedAt))
      || !Number.isSafeInteger(popularity.stars) || popularity.stars<rules.minRepositoryStars)throw Error('所有精选必须核对实际来源仓库，且 GitHub Star 不低于 '+rules.minRepositoryStars+'：'+item.id);
    checked++;
  }
  if(catalog.selection?.enforceAll!==true || catalog.selection.minRepositoryStars!==rules.minRepositoryStars)throw Error('精选目录缺少全量门槛声明');
  return {minRepositoryStars:rules.minRepositoryStars,entriesChecked:checked};
}
module.exports={validate};
