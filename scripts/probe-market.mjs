// STEP 1 probe: can GenLayer validators fetch the Polymarket Gamma API
// inside consensus? Deploys the minimal probe contract, calls fetch_probe
// on the two chosen market URLs, reads back and compares the description
// SHA-256 against a local fetch. Temp account lives in process memory only.
// Usage: node scripts/probe-market.mjs
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createClient, createAccount, generatePrivateKey} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';

const URLS = {
  btc: 'https://gamma-api.polymarket.com/markets/515539',
  ufc: 'https://gamma-api.polymarket.com/markets/639337',
};
const source = fs.readFileSync('contracts/market_probe.py', 'utf8');
const account = createAccount(generatePrivateKey());
const client = createClient({chain: studionet, account});
const owner = account.address.toLowerCase();
const out = {network: 61999, owner, probeContract: null, transactions: [], local: {}, results: {}};

function sha(s) { return createHash('sha256').update(s).digest('hex'); }
function good(tx) {
  let r = tx.consensus_data?.leader_receipt;
  r = Array.isArray(r) ? r.find(x => x.mode === 'leader') : r;
  return [7, 'FINALIZED'].includes(tx.status) && [6, 'MAJORITY_AGREE'].includes(tx.result) && r?.execution_result === 'SUCCESS';
}
async function collect(hash, label) {
  out.transactions.push({label, hash});
  console.log(label, hash);
  for (let i = 0; i < 20; i++) {
    try {
      const tx = await client.waitForTransactionReceipt({hash, status: 'FINALIZED', interval: 3000, retries: 8, fullTransaction: true});
      out.transactions.at(-1).receipt = tx;
      console.log(label, tx.status, tx.result, tx.consensus_data?.leader_receipt?.execution_result);
      return tx;
    } catch (e) { console.log('tracking', label, i, e.shortMessage || e.message); }
  }
  throw Error('Timeout: keep existing hashes; do not redeploy.');
}

// Local pre-check: fetch both URLs, record raw + description hashes.
for (const [name, url] of Object.entries(URLS)) {
  const res = await fetch(url);
  const body = await res.text();
  const data = JSON.parse(body);
  out.local[name] = {url, status: res.status, rawSha256: sha(body), rawBytes: body.length,
    descSha256: sha(data.description), descLen: data.description.length,
    question: data.question, outcomePrices: data.outcomePrices, closed: data.closed};
  console.log(name, 'local status', res.status, 'raw bytes', body.length, 'desc sha', out.local[name].descSha256.slice(0, 16));
}
fs.writeFileSync('evidence/probe-market.json', JSON.stringify(out, null, 2));

const chainId = await client.getChainId();
if (chainId !== 61999) throw Error('WRONG_CHAIN');
const dep = await collect(await client.deployContract({code: source, args: [], value: 0n, leaderOnly: false}), 'deploy probe');
if (!good(dep)) throw Error('Probe deploy failed');
const address = dep.data?.contract_address || dep.contract_address;
if (!address) throw Error('No contract address');
out.probeContract = address;
if (await client.getContractCode(address) !== source) throw Error('SOURCE_MISMATCH');
console.log('probe contract', address);

for (const [name, url] of Object.entries(URLS)) {
  const tx = await collect(await client.writeContract({address, functionName: 'fetch_probe', args: [url], value: 0n, leaderOnly: false}), 'fetch_probe ' + name);
  const ok = good(tx);
  console.log('fetch_probe', name, 'good =', ok);
  const raw = await client.readContract({address, functionName: 'get_probe', args: [url], transactionHashVariant: 'latest-final'});
  const rec = raw ? JSON.parse(raw) : null;
  out.results[name] = {txGood: ok, record: rec,
    descShaMatchesLocal: rec?.desc_sha256 === out.local[name].descSha256,
    questionMatchesLocal: rec?.question === out.local[name].question};
  console.log('fetch_probe', name, 'desc match:', out.results[name].descShaMatchesLocal, 'question match:', out.results[name].questionMatchesLocal);
  fs.writeFileSync('evidence/probe-market.json', JSON.stringify(out, null, 2));
}
console.log('PROBE COMPLETE', JSON.stringify(out.results, null, 2));
