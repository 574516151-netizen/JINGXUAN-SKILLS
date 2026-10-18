const MODEL='gemini-3.8-flash';
async function check({key,confirmedFreeProject,fetcher=fetch}){
 if(!confirmedFreeProject)throw Error('free-project-confirmation-required');
 if(typeof key!=='string'||!key.trim()||key.length>500||/\s/.test(key))throw Error('missing-api-key');
 async function request(url,body){let r;try{r=await fetcher(url,{method:body?'POST':'GET',headers:{'x-goog-api-key':key,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(45000)});}catch(_){throw Error('network-unavailable');}if(!r.ok)throw Error('http-'+r.status);let text;try{text=await r.text();if(text.length>100000)throw Error();return JSON.parse(text);}catch(_){throw Error('invalid-response');}}
 const url='https://generativelanguage.googleapis.com/v1beta/models/'+MODEL,model=await request(url);
 if(!model.supportedGenerationMethods?.includes('generateContent'))throw Error('model-unavailable');
 const data=await request(url+':generateContent',{contents:[{parts:[{text:'Translate the software label Settings into Simplified Chinese. Return only JSON {"translation":"..."}.'}]}],generationConfig:{temperature:0,responseMimeType:'application/json',maxOutputTokens:1024}}),candidate=data.candidates?.[0];
 if(candidate?.finishReason!=='STOP')throw Error('invalid-response');
 const text=candidate.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('');let value;try{value=JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g,''));}catch(_){throw Error('invalid-response');}
 if(typeof value.translation!=='string'||!/[\u3400-\u9fff]/.test(value.translation))throw Error('invalid-response');
 return {success:true,model:MODEL,chineseResponseVerified:true};
}
module.exports={check,MODEL};
if(require.main===module)check({key:process.env.COCKPIT_GEMINI_CANDIDATE_KEY,confirmedFreeProject:process.env.CONFIRMED_FREE_PROJECT==='true'}).then(v=>console.log(JSON.stringify(v))).catch(e=>{console.error(/^http-\d{3}$/.test(e.message)||['missing-api-key','free-project-confirmation-required','network-unavailable','invalid-response','model-unavailable'].includes(e.message)?e.message:'gemini-check-failed');process.exitCode=1;});
