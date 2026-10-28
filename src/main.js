import './style.css';
import {title,loose,fixed,cases,example} from './fixtures.js';
import {validateCases} from './protocol.js';
import * as chain from './chain.js';
const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let live=false, record=example(false), wallet=null, busy=false, loaded=null, receipt=null, deployment={};
let pending=JSON.parse(localStorage.getItem('forkseal-pending')||'null');
const say=s=>{$('status').textContent=s;};
function save(p){localStorage.setItem('forkseal-pending',JSON.stringify(p));pending=p;}
function selection(){return {address:$('address').value.trim(),owner:$('owner').value.trim().toLowerCase(),id:$('ident').value.trim()};}
function paint(){
 $('question').textContent=record?.title||'Read a test record';$('ruleText').textContent=record?.rules||'Run a test to receive an immutable consensus result.';
 $('origin').textContent=live?(loaded?'FINALIZED CHAIN READBACK':'NO CHAIN RECORD LOADED'):'ILLUSTRATION · NOT ON CHAIN';
 $('resultTitle').textContent=record?`${record.cases.length-record.failed.length} of ${record.cases.length} cases match`:'Awaiting a test';
 $('badge').className='badge '+(record&&!record.failed.length?'pass':'');$('badge').textContent=record?.state||'EMPTY';
 $('rows').innerHTML=record?record.cases.map((c,i)=>{let r=record.findings[i],ok=r.actual===c.expected;return `<article class="case"><div class="case-top"><span class="case-id">${c.id}</span><h4>EXPECTED ${esc(c.expected)} <span style="color:#a3ac99">→</span> ACTUAL ${esc(r.actual)}</h4><span class="${ok?'':'mismatch'}">${ok?'MATCH ✓':'MISMATCH ↗'}</span></div><p>${esc(c.scenario)}</p><details><summary>Rule evidence & reasoning</summary><blockquote>${esc(r.quote)}</blockquote><p>${esc(r.reason)}</p></details></article>`;}).join(''):'';
 $('changes').textContent=record?.changes?.length?record.changes.map(c=>`${c.id}: ${c.before} → ${c.after}`).join(' / '):'A pass covers this exact suite only.';
 $('seal').hidden=!live||!loaded||record?.state!=='PASSED';
 for(const id of ['test','seal','deploy','wallet','temporary'])$(id).disabled=busy||!!pending;
 $('resume').disabled=busy;$('read').disabled=busy;$('published').disabled=busy;
 if(pending?.hash)$('txhash').value=pending.hash;
}
function mode(v){if(busy)return;live=v;record=v?null:example(false);loaded=null;receipt=null;$('exampleControls').hidden=v;$('liveControls').hidden=!v;$('live').classList.toggle('active',v);$('illustration').classList.toggle('active',!v);paint();}
function task(fn){return async()=>{if(busy)return;busy=true;paint();try{await fn();}catch(e){say(e.shortMessage||e.message||String(e));}finally{busy=false;paint();}};}
async function load(f=selection()){await chain.verify(f.address);record=await chain.read(f.address,f.owner,f.id);if(record.protocol!=='forkseal-1'||record.owner!==f.owner||record.id!==f.id)throw Error('Unexpected record.');loaded=f;$('raw').textContent=JSON.stringify({record,receipt},null,2);paint();return record;}
async function track(){if(!pending?.hash)throw Error('Paste the existing transaction hash from wallet activity. Do not resend.');let p=pending;say('Waiting for FINALIZED: '+p.hash);const tx=await chain.wait(p.hash);receipt=tx;$('raw').textContent=JSON.stringify(tx,null,2);if(p.deploy){if(tx.from_address?.toLowerCase()!==p.from)throw Error('Deployment signer differs.');}else chain.bind(tx,p);
 if(!chain.success(tx)){let l=tx.consensus_data?.leader_receipt;l=Array.isArray(l)?l.find(r=>r.mode==='leader'):l;if(l?.execution_result==='ERROR'||[7,'MAJORITY_DISAGREE'].includes(tx.result)){save(null);throw Error('Finalized execution failed or consensus disagreed. Inspect receipt.');}throw Error('No successful finalized majority receipt; pending retained.');}
 if(p.deploy){const address=tx.data?.contract_address||tx.contract_address;await chain.verify(address);$('address').value=address;localStorage.setItem('forkseal-contract',address);save(null);say('Deployment finalized and full source verified: '+address);return;}
 const r=await load({address:p.address,owner:p.from,id:p.id});
 if(p.method==='seal'&&(r.state!=='SEALED'||r.digest!==p.args[1]))throw Error('Seal readback mismatch.');
 if(p.method==='test_rules'&&(r.title!==p.args[1].trim()||r.rules!==p.args[2].trim()||r.parent_id!==p.args[4]||JSON.stringify(r.cases.map(c=>({scenario:c.scenario,expected:c.expected})))!==JSON.stringify(JSON.parse(p.args[3]).map(c=>({scenario:c.scenario.trim(),expected:c.expected})))))throw Error('Test readback mismatch.');
 save(null);say('FINALIZED · MAJORITY_AGREE · successful execution · matching state readback. '+p.hash);
}
async function send(method,args){if(pending)throw Error('Resolve the pending transaction first.');await chain.check(wallet);const f=selection();await chain.verify(f.address);const p={from:wallet.owner,address:f.address,id:args[0],method,args};save(p);say('Waiting for signature…');try{p.hash=await wallet.client.writeContract({address:p.address,functionName:method,args,value:0n,leaderOnly:false});save(p);}catch(e){if(e.code===4001||e.cause?.code===4001)save(null);throw e;}await track();}
$('illustration').onclick=()=>mode(false);$('live').onclick=()=>mode(true);$('original').onclick=()=>{record=example(false);$('original').classList.add('active');$('repair').classList.remove('active');paint();};$('repair').onclick=()=>{record=example(true);$('original').classList.remove('active');$('repair').classList.add('active');paint();};
function walletInfo(){ $('owner').value=wallet.owner;$('account').textContent=wallet.owner+(wallet.temporary?' · temporary':'');}
$('temporary').onclick=()=>{if(pending)return;wallet=chain.temporary();walletInfo();say('Zero-value temporary signer ready. Save the owner address; reload loses signing access.');};
$('wallet').onclick=task(async()=>{wallet=await chain.connect();walletInfo();});
$('deploy').onclick=task(async()=>{if(pending)throw Error('Pending transaction unresolved.');await chain.check(wallet);const p={from:wallet.owner,deploy:true};save(p);try{p.hash=await wallet.client.deployContract({code:chain.source,args:[],value:0n,leaderOnly:false});save(p);}catch(e){if(e.code===4001||e.cause?.code===4001)save(null);throw e;}await track();});
$('test').onclick=task(async()=>{const cs=validateCases($('cases').value);const t=$('title').value.trim(),rules=$('rules').value.trim(),id=$('ident').value.trim();if(!/^[\w-]{1,40}$/.test(id)||t.length<5||t.length>140||rules.length<40||rules.length>4000)throw Error('Check ID, question and rule bounds.');await send('test_rules',[id,t,rules,JSON.stringify(cs),$('parent').value.trim()]);});
$('fixed').onclick=()=>{$('rules').value=fixed;};
$('read').onclick=task(async()=>{receipt=null;await load();say('Finalized test loaded from Stable Studionet.');});
$('published').onclick=task(async()=>{if(!deployment.address)throw Error('Published test not configured yet.');$('address').value=deployment.address;$('owner').value=deployment.owner;$('ident').value=deployment.id;receipt=null;await load();say('Published test loaded directly from chain.');});
$('seal').onclick=task(async()=>{const f=loaded;if(!f||selection().address.toLowerCase()!==f.address.toLowerCase()||selection().owner!==f.owner||selection().id!==f.id)throw Error('Read the selected record first.');await load(f);if(wallet?.owner!==record.owner||record.state!=='PASSED')throw Error('Only the owner of a passed test can seal.');await send('seal',[record.id,record.digest]);});
$('resume').onclick=task(async()=>{if(!pending)throw Error('No pending transaction.');let h=$('txhash').value.trim();if(!/^0x[0-9a-f]{64}$/i.test(h)||pending.hash&&pending.hash!==h)throw Error('Use the exact existing hash.');save({...pending,hash:h});await track();});
$('export').onclick=()=>{if(live&&!loaded){say('Read a chain record first.');return;}const payload={kind:live?'CHAIN_READBACK':'AUTHORED_ILLUSTRATION',network:live?61999:null,selection:loaded,record,receipt};let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download='forkseal-record.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('title').value=title;$('rules').value=loose;$('cases').value=JSON.stringify(cases.map(({scenario,expected})=>({scenario,expected})),null,2);$('address').value=localStorage.getItem('forkseal-contract')||'';
fetch('./deployment.json').then(r=>r.ok?r.json():{}).then(d=>{deployment=d;if(d.address){$('address').value=d.address;$('owner').value=d.owner;$('ident').value=d.id;}}).catch(()=>{});paint();
