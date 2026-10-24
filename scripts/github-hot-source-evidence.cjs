// Model selects immutable source spans; it does not retype or translate quotes.
function sourceOptions(text){
 const rows=[];for(let at=0;at<text.length;){
  let end=Math.min(text.length,at+400);const split=text.lastIndexOf('\n',end);
  if(end<text.length&&split>at+100)end=split+1;
  const quote=text.slice(at,end);if(quote.trim().length>=12)rows.push({id:'S'+(rows.length+1),quote});at=end;
 }
 return rows;
}
function bindEvidence(draft,options){
 if(!Array.isArray(draft?.evidence))return draft;
 return {...draft,evidence:draft.evidence.map(e=>{
  if(!e||typeof e.sourceId!=='string')return e;
  const span=options.find(s=>s.id===e.sourceId);
  return {field:e.field,quote:span?.quote||''};
 })};
}
module.exports={sourceOptions,bindEvidence};
