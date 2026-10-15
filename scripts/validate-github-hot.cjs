const fs=require('node:fs'),path=require('node:path'),policy=require('../electron/engine/github-hot-policy');
const file=process.argv[2]||path.join(__dirname,'../catalog/github-hot.json');
const feed=policy.validateFeed(JSON.parse(fs.readFileSync(file,'utf8')));
const current=feed.editions[0];console.log(JSON.stringify({valid:true,threshold:'Star > 100000',edition:current.id,candidates:current.candidateCount,stars:current.boards.stars.length,weekly:current.boards.weekly.length,editions:feed.editions.length}));
