import fs from 'node:fs';
import {createClient,createAccount,generatePrivateKey} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {title,loose,fixed,cases} from '../src/fixtures.js';
const source=fs.readFileSync('contracts/forkseal.py','utf8');const account=createAccount(generatePrivateKey());const client=createClient({chain:studionet,account});const owner=account.address.toLowerCase();let evidence={network:61999,owner,operator:'One temporary zero-value test signer; synthetic scenarios.',transactions:[],records:[]};
const persist=()=>fs.writeFileSync('evidence/studionet.json',JSON.stringify(evidence,null,2));
function good(tx){let r=tx.consensus_data?.leader_receipt;r=Array.isArray(r)?r.find(x=>x.mode==='leader'):r;return [7,'FINALIZED'].includes(tx.status)&&[6,'MAJORITY_AGREE'].includes(tx.result)&&r?.execution_result==='SUCCESS';}
async function collect(hash,label){evidence.transactions.push({label,hash});persist();console.log(label,hash);for(let i=0;i<15;i++){try{let tx=await client.waitForTransactionReceipt({hash,status:'FINALIZED',interval:3000,retries:8,fullTransaction:true});evidence.transactions.at(-1).receipt=tx;persist();console.log(label,tx.status,tx.result);return tx;}catch(e){console.log('tracking',label,i,e.shortMessage||e.message);}}throw Error('Timeout: keep existing hashes; do not redeploy.');}
const chainId=await client.getChainId();if(chainId!==61999)throw Error('WRONG_CHAIN');
const dep=await collect(await client.deployContract({code:source,args:[],value:0n,leaderOnly:false}),'deploy');if(!good(dep))throw Error('Deploy failed');const address=dep.data?.contract_address||dep.contract_address;if(!address)throw Error('No contract address');evidence.address=address;persist();if(await client.getContractCode(address)!==source)throw Error('SOURCE_MISMATCH');
async function call(label,method,args,expectSuccess=true){let tx=await collect(await client.writeContract({address,functionName:method,args,value:0n,leaderOnly:false}),label);if(good(tx)!==expectSuccess)throw Error('Unexpected execution for '+label);return tx;}
async function read(id){const raw=await client.readContract({address,functionName:'get_record',args:[owner,id],transactionHashVariant:'latest-final'});let r=JSON.parse(raw);evidence.records.push(r);persist();return r;}
const cs=JSON.stringify(cases.map(({scenario,expected})=>({scenario,expected})));
await call('original test','test_rules',['original',title,loose,cs,'']);const original=await read('original');if(original.state!=='BLOCKED')throw Error('Original did not block');
await call('blocked seal rejected','seal',['original',original.digest],false);
await call('revised same suite','test_rules',['clarified',title,fixed,cs,'original']);const repaired=await read('clarified');if(repaired.state!=='PASSED')throw Error('Repair did not pass');
await call('seal passing test','seal',['clarified',repaired.digest]);const final=await read('clarified');if(final.state!=='SEALED')throw Error('Not sealed');
fs.writeFileSync('public/deployment.json',JSON.stringify({network:61999,address,owner,id:'clarified'},null,2));console.log('COMPLETE',address,owner);
