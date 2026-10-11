// Maintainer admission rules only. Personal libraries never pass through this module.
const policy = require('../catalog/selection-policy.json');

function sameExistingSource(item, entry) {
  if (item.id !== entry.id || item.type !== entry.type) return false;
  if (item.type === 'skill') return item.source?.repo?.toLowerCase() === entry.repo.toLowerCase() &&
    (item.source.path || '') === entry.path;
  return (item.sourceUrl || '') === entry.sourceUrl;
}

function isExisting(item, rules = policy) {
  return rules.existingEntries.some(entry => sameExistingSource(item, entry));
}

function validate(catalog, rules = policy) {
  if (rules.schemaVersion !== 1 || !Number.isSafeInteger(rules.minRepositoryStars) || rules.minRepositoryStars < 5000 ||
      !Array.isArray(rules.existingEntries) || new Set(rules.existingEntries.map(x => x.id)).size !== rules.existingEntries.length) {
    throw Error('精选收录规则无效');
  }
  if (!Array.isArray(catalog.items)) throw Error('精选目录无效');
  const ids = new Set(catalog.items.map(x => x.id));
  for (const entry of rules.existingEntries) {
    if (!ids.has(entry.id)) throw Error('原有条目应保留；替换时保留旧条目记录：' + entry.id);
  }
  let retained = 0, checked = 0;
  for (const item of catalog.items) {
    if (isExisting(item, rules)) { retained++; continue; }
    const popularity = item.popularity;
    let url;
    try { url = new URL(popularity?.repositoryUrl); } catch {}
    const repo = item.source?.repo;
    if (!repo || popularity?.provider !== 'GitHub' || popularity.scope !== 'repository' ||
        !url || url.origin !== 'https://github.com' || url.username || url.password || url.search || url.hash ||
        url.pathname.toLowerCase() !== '/' + repo.toLowerCase() || !Number.isFinite(Date.parse(popularity.checkedAt)) ||
        !Number.isSafeInteger(popularity.stars) || popularity.stars < rules.minRepositoryStars) {
      throw Error('新增精选必须核对实际来源仓库，且 GitHub Star 不低于 ' + rules.minRepositoryStars + '：' + item.id);
    }
    checked++;
  }
  return { minRepositoryStars: rules.minRepositoryStars, existingRetained: retained, newEntriesChecked: checked };
}

module.exports = { isExisting, validate };
