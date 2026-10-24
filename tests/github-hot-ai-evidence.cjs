const assert=require('node:assert/strict'),{sourceOptions,bindEvidence}=require('../scripts/github-hot-source-evidence.cjs'),{createCompleter}=require('../scripts/github-hot-guide-ai.cjs'),{complete}=require('./helpers/github-hot-fixture.cjs'),{isReady,SOURCE_FIELDS,sourceText}=require('../electron/engine/github-hot-admission');
(async()=>{
 const item={id:'fixture/evidence-options',description:'A drawing library to convert vector drawings to editable layers.',readmeUrl:'https://github.com/fixture/evidence-options#readme',readmeExcerpt:'Install this drawing library. Open its example and load one vector image. Compare independent shapes and editable labels with the original reference.'};
 const text=sourceText(item),options=sourceOptions(text);assert(options.length);for(const e of options)assert(text.includes(e.quote));
 assert.equal(bindEvidence({evidence:[{field:'summary',sourceId:'does-not-exist'}]},options).evidence[0].quote,'');
 const completed=complete(item),base={kind:'lib',summary:completed.summary,purpose:completed.guide.purpose,audience:completed.guide.audience,scenarios:completed.scenarios,steps:completed.guide.steps,requirements:completed.requirements,verification:completed.guide.verification};
 let calls=0,reviewSeen=false;const run=(invalid=false,approved=true)=>createCompleter({providers:[{name:'openrouter',model:'fixture/model:free'}],keys:{openrouter:'test-only'},fetcher:async(url,o)=>{
  if(url.endsWith('/models'))return {ok:true,text:async()=>JSON.stringify({data:[{id:'fixture/model:free',pricing:{prompt:'0',completion:'0'}}]})};
  calls++;const body=JSON.parse(o.body),input=JSON.parse(body.messages[1].content),review=body.messages[0].content.includes('独立检查');let value;
  if(review){reviewSeen=true;for(const e of input.draft.evidence){assert.equal(e.quote,input.source.evidenceOptions[0].quote);assert(!e.sourceId);}value={approved,issues:approved?[]:['原文不支持该能力']};}
  else{assert(input.source.evidenceOptions.length);value={...base,evidence:SOURCE_FIELDS.map(field=>({field,sourceId:invalid?'S999':input.source.evidenceOptions[0].id}))};}
  return {ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]})};
 }});
 const r=await run()(item,'2026-10-25T01:00:00Z');assert(isReady(r));assert(reviewSeen);assert.equal(calls,2);
 await assert.rejects(run(true)(item,'2026-10-25T01:00:00Z'),/guide-validation-failed/);
 await assert.rejects(run(false,false)(item,'2026-10-25T01:00:00Z'),/source-review-rejected/);
 console.log('Model evidence IDs bind exact official text; invalid IDs and unsupported claims remain rejected.');
})().catch(e=>{console.error(e);process.exitCode=1;});
