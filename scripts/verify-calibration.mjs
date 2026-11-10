// STEP 3 evidence run: ForkSeal forkseal-2 resolved-market calibration.
// Deploys the new contract and runs the 13 transactions pre-registered in
// evidence/EXPECTED.md with two temporary zero-value wallets (A and B).
// Resumable: progress + temp keys live in ../forkseal-checkpoint.json
// (workdir only, never in a repo, mode 0600); the file is deleted when the
// flow completes. Keys never leave process memory otherwise.
// Usage: node scripts/verify-calibration.mjs
import fs from 'node:fs';
import {createClient, createAccount, generatePrivateKey} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {title, loose, fixed, cases} from '../src/fixtures.js';

const CHECKPOINT = new URL('../../forkseal-checkpoint.json', import.meta.url).pathname;
const EVIDENCE = 'evidence/calibration.json';
const source = fs.readFileSync('contracts/forkseal.py', 'utf8');

const BTC_URL = 'https://gamma-api.polymarket.com/markets/515539';
const UFC_URL = 'https://gamma-api.polymarket.com/markets/639337';
const BROKEN_URL = 'https://gamma-api.polymarket.com/markets/999999999';
const BTC_TITLE = 'Bitcoin above $100,000 on December 20?';
const UFC_TITLE = 'Will Tom Aspinall win his bout against Ciryl Gane at UFC 321?';
const BTC_RULES = 'This market will resolve to "Yes" if the Binance 1 minute candle for BTCUSDT 20 Dec \'24 12:00 in the ET timezone (noon) has a final \u201cClose\u201d price of 100,000.01 or higher. Otherwise, this market will resolve to "No".\n\nThe resolution source for this market is Binance, specifically the BTCUSDT "Close" prices currently available at https://www.binance.com/en/trade/BTC_USDT with \u201c1m\u201d and \u201cCandles\u201d selected on the top bar.\n\nPlease note that this market is about the price according to Binance BTCUSDT, not according to other sources or spot markets.';
const UFC_RULES = 'This is a polymarket on whether Aspinall or Gane will win their bout at UFC 321: Aspinall vs. Gane, scheduled for October 25.\n\nThis market will resolve to "Aspinall" if Tom Aspinall is declared the winner.\n\nThis market will resolve to "Gane" if Ciryl Gane is declared the winner.\n\nIf the fight is declared a draw, or if for any reason the bout is not scored, postponed after November 1, 2025, or canceled, this market will resolve 50-50.\n\nThe primary resolution source will be ESPN. A consensus of credible reporting may also be used.';
const BTC_CASES = [
  {scenario: "The Binance BTCUSDT 1-minute candle for 20 Dec '24 12:00 ET closed at $96,548.00, below the $100,000.01 threshold.", expected: 'NO'},
  {scenario: "The Binance BTCUSDT 1-minute candle for 20 Dec '24 12:00 ET closed at $100,214.55, above the $100,000.01 threshold.", expected: 'YES'},
  {scenario: "The Binance BTCUSDT 1-minute candle for 20 Dec '24 12:00 ET closed at exactly $100,000.01, the minimum price for a Yes resolution.", expected: 'YES'},
  {scenario: "Coinbase showed BTC at $100,500.00 at noon ET on 20 Dec '24, while the Binance BTCUSDT 1-minute candle for 12:00 ET closed at $96,548.00.", expected: 'NO'},
];
const UFC_CASES = [
  {scenario: "At UFC 321 on October 25, 2025, Ciryl Gane accidentally poked Tom Aspinall's right eye at 4:35 of the first round. Aspinall could not continue, and ESPN reported the bout ruled a no contest.", expected: 'VOID'},
  {scenario: "At UFC 321 on October 25, 2025, Tom Aspinall knocked out Ciryl Gane in the second round and ESPN declared Aspinall the winner.", expected: 'YES'},
  {scenario: "The Aspinall vs. Gane bout scheduled for October 25, 2025 was postponed to December 2025, after November 1, 2025, and never took place.", expected: 'VOID'},
];
const WRONG_CASES = BTC_CASES.map((c, i) => i === 0 ? {...c, expected: 'YES'} : c);
const TAMPERED_RULES = BTC_RULES.replace('100,000.01 or higher', '99,000.01 or higher');

let ck = null;
if (fs.existsSync(CHECKPOINT)) { ck = JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')); console.log('resuming from checkpoint; done:', ck.done); }
// NOTE: genlayer-js accounts do not expose the private key, so the RAW
// generated keys are kept (in the checkpoint file only) and passed to
// createAccount. Saving account.privateKey writes undefined and the key
// is unrecoverable — that bug lost wallet A's key on the first full run.
const privA = ck?.accountA || generatePrivateKey();
const privB = ck?.accountB || generatePrivateKey();
const accountA = createAccount(privA);
const accountB = createAccount(privB);
const clientA = createClient({chain: studionet, account: accountA});
const clientB = createClient({chain: studionet, account: accountB});
const ownerA = accountA.address.toLowerCase();
const ownerB = accountB.address.toLowerCase();
const done = new Set(ck?.done || []);
let address = ck?.address || null;

const evidence = fs.existsSync(EVIDENCE) ? JSON.parse(fs.readFileSync(EVIDENCE, 'utf8')) : {
  network: 61999, protocol: 'forkseal-2', wallets: {A: ownerA, B: ownerB},
  operator: 'Two temporary zero-value test signers; real resolved Polymarket markets.',
  address: null, transactions: [], records: [],
};
if (address) evidence.address = address;
const saveCheckpoint = () => {
  fs.writeFileSync(CHECKPOINT, JSON.stringify({accountA: privA, accountB: privB, address, done: [...done]}, null, 2));
  fs.chmodSync(CHECKPOINT, 0o600);
};
const persist = () => fs.writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 2));
saveCheckpoint(); persist();
console.log('wallet A', ownerA, '\nwallet B', ownerB);

function leaderExec(tx) {
  let r = tx.consensus_data?.leader_receipt;
  r = Array.isArray(r) ? r.find(x => x.mode === 'leader') : r;
  return r?.execution_result;
}
function good(tx) {
  return [7, 'FINALIZED'].includes(tx.status) && [6, 'MAJORITY_AGREE'].includes(tx.result) && leaderExec(tx) === 'SUCCESS';
}
function errored(tx) {
  return [7, 'FINALIZED'].includes(tx.status) && leaderExec(tx) === 'ERROR';
}
async function collect(client, hash, label) {
  const existing = evidence.transactions.find(t => t.label === label && t.receipt);
  if (existing) { console.log('reuse (receipt present)', label, existing.hash); return existing.receipt; }
  if (!evidence.transactions.find(t => t.label === label && t.hash === hash)) evidence.transactions.push({label, hash});
  persist();
  console.log(label, hash);
  for (let i = 0; i < 30; i++) {
    try {
      const tx = await client.waitForTransactionReceipt({hash, status: 'FINALIZED', interval: 3000, retries: 8, fullTransaction: true});
      evidence.transactions.at(-1).receipt = tx; persist();
      console.log(label, 'status', tx.status, 'result', tx.result, 'leader', leaderExec(tx));
      return tx;
    } catch (e) { console.log('tracking', label, i, e.shortMessage || e.message); }
  }
  throw Error('Timeout on ' + label + ': keep existing hashes; do not redeploy. Rerun to resume.');
}
async function call(client, label, method, args, expect) {
  if (done.has(label)) { console.log('skip (done)', label); return null; }
  // A previous receipted attempt that never reached `done` failed on-chain
  // (e.g. MAJORITY_DISAGREE with no record created). Keep it as evidence
  // under a new label and retry with a fresh call — never resend a hash
  // whose outcome is unknown, and never reuse a failed receipt.
  const prior = evidence.transactions.find(t => t.label === label && t.receipt);
  if (prior) { prior.label = label + ' attempt-1 FAILED'; persist(); console.log('prior attempt failed; retrying with a fresh call'); }
  const pending = evidence.transactions.find(t => t.label === label && !t.receipt);
  let tx;
  if (pending) {
    console.log('resume tracking (never resend)', label, pending.hash);
    tx = await collect(client, pending.hash, label);
  } else {
    tx = await collect(client, await client.writeContract({address, functionName: method, args, value: 0n, leaderOnly: false}), label);
  }
  const ok = expect === 'success' ? good(tx) : errored(tx);
  if (!ok) throw Error('Unexpected execution for ' + label + ' (expected ' + expect + ')');
  done.add(label); saveCheckpoint(); persist();
  return tx;
}
async function read(client, owner, id, expectState, expectFailed) {
  const raw = await client.readContract({address, functionName: 'get_record', args: [owner, id], transactionHashVariant: 'latest-final'});
  const r = JSON.parse(raw);
  if (!evidence.records.find(x => x.id === r.id && x.state === r.state && x.digest === r.digest)) evidence.records.push(r);
  persist();
  console.log('read', id, '->', r.state, 'failed:', JSON.stringify(r.failed));
  if (r.state !== expectState || JSON.stringify(r.failed) !== JSON.stringify(expectFailed)) {
    throw Error(`Record ${id} mismatch: got ${r.state} failed=${JSON.stringify(r.failed)}, expected ${expectState} failed=${JSON.stringify(expectFailed)}`);
  }
  return r;
}
const marketArgs = (id, url, t, rules, cs, parent) => [id, url, t, rules, JSON.stringify(cs), parent];
const rulesArgs = (id, t, rules, cs, parent) => [id, t, rules, JSON.stringify(cs), parent];

const chainId = await clientA.getChainId();
if (chainId !== 61999) throw Error('WRONG_CHAIN');

// 1. deploy (A)
if (!address) {
  const pendingDeploy = evidence.transactions.find(t => t.label === 'deploy' && !t.receipt);
  const dep = pendingDeploy
    ? await collect(clientA, pendingDeploy.hash, 'deploy')
    : await collect(clientA, await clientA.deployContract({code: source, args: [], value: 0n, leaderOnly: false}), 'deploy');
  if (!good(dep)) throw Error('Deploy failed');
  address = dep.data?.contract_address || dep.contract_address;
  if (!address) throw Error('No contract address');
  evidence.address = address; done.add('deploy'); saveCheckpoint(); persist();
  if (await clientA.getContractCode(address) !== source) throw Error('SOURCE_MISMATCH');
  const proto = await clientA.readContract({address, functionName: 'get_protocol', args: [], transactionHashVariant: 'latest-final'});
  if (proto !== 'forkseal-2') throw Error('PROTOCOL_MISMATCH: ' + proto);
  console.log('deployed', address);
} else { console.log('using checkpoint address', address); }

// 2. btc-dec20 journey (A)
await call(clientA, 'btc-dec20 test_market', 'test_market', marketArgs('btc-dec20', BTC_URL, BTC_TITLE, BTC_RULES, BTC_CASES, ''), 'success');
let r = await read(clientA, ownerA, 'btc-dec20', 'PASSED', []);
if (r.source_url !== BTC_URL || r.source_verified !== true || r.source_sha256 !== 'e57083327c908724ae45105cb6bd2446de39b6c14b2f3e065a293aa824a52756') throw Error('btc-dec20 source fields mismatch');
// 3. seal btc-dec20 (A)
await call(clientA, 'btc-dec20 seal', 'seal', ['btc-dec20', r.digest], 'success');
await read(clientA, ownerA, 'btc-dec20', 'SEALED', []);
// 4. tampered rules (A)
await call(clientA, 'btc-tampered test_market', 'test_market', marketArgs('btc-tampered', BTC_URL, BTC_TITLE, TAMPERED_RULES, BTC_CASES, ''), 'error');
// 5. broken source URL (A)
await call(clientA, 'btc-broken test_market', 'test_market', marketArgs('btc-broken', BROKEN_URL, BTC_TITLE, BTC_RULES, BTC_CASES, ''), 'error');
// 6. wrong expected (B)
await call(clientB, 'btc-wrong test_market', 'test_market', marketArgs('btc-wrong', BTC_URL, BTC_TITLE, BTC_RULES, WRONG_CASES, ''), 'success');
r = await read(clientB, ownerB, 'btc-wrong', 'BLOCKED', ['C1']);
// 7. seal on BLOCKED must fail (B)
await call(clientB, 'btc-wrong seal rejected', 'seal', ['btc-wrong', r.digest], 'error');
await read(clientB, ownerB, 'btc-wrong', 'BLOCKED', ['C1']);
// 8. ufc-321 void market (B)
await call(clientB, 'ufc-321 test_market', 'test_market', marketArgs('ufc-321', UFC_URL, UFC_TITLE, UFC_RULES, UFC_CASES, ''), 'success');
r = await read(clientB, ownerB, 'ufc-321', 'PASSED', []);
if (r.source_url !== UFC_URL || r.source_verified !== true || r.source_sha256 !== 'ea132ca1e86ac7418939d4b9dec00f1f15a7e9cb17e588ec0447c278ab2f5219') throw Error('ufc-321 source fields mismatch');
// 9. seal ufc-321 (B)
await call(clientB, 'ufc-321 seal', 'seal', ['ufc-321', r.digest], 'success');
await read(clientB, ownerB, 'ufc-321', 'SEALED', []);
// 10. duplicate ident (A)
await call(clientA, 'btc-dec20 duplicate rejected', 'test_market', marketArgs('btc-dec20', BTC_URL, BTC_TITLE, BTC_RULES, BTC_CASES, ''), 'error');
await read(clientA, ownerA, 'btc-dec20', 'SEALED', []);
// 11. regression original (A)
await call(clientA, 'original test_rules', 'test_rules', rulesArgs('original', title, loose, cases, ''), 'success');
await read(clientA, ownerA, 'original', 'BLOCKED', ['C2']);
// 12. regression clarified (A)
await call(clientA, 'clarified test_rules', 'test_rules', rulesArgs('clarified', title, fixed, cases, 'original'), 'success');
r = await read(clientA, ownerA, 'clarified', 'PASSED', []);
if (!(Array.isArray(r.changes) && r.changes.length === 1 && r.changes[0].id === 'C2' && r.changes[0].before === 'NO' && r.changes[0].after === 'VOID')) throw Error('clarified changes mismatch: ' + JSON.stringify(r.changes));
// 13. seal clarified (A)
await call(clientA, 'clarified seal', 'seal', ['clarified', r.digest], 'success');
await read(clientA, ownerA, 'clarified', 'SEALED', []);

// Split per-case evidence files.
const byLabel = (labels) => evidence.transactions.filter(t => labels.includes(t.label));
const recById = (id) => evidence.records.filter(r => r.id === id);
const writeSplit = (name, obj) => fs.writeFileSync('evidence/' + name, JSON.stringify(obj, null, 2));
writeSplit('calibration-btc-journey.json', {market: 'Bitcoin above $100,000 on December 20? (515539, resolved NO)', source: BTC_URL, transactions: byLabel(['btc-dec20 test_market', 'btc-dec20 seal']), records: recById('btc-dec20')});
writeSplit('calibration-ufc-void.json', {market: 'Aspinall vs. Gane (639337, resolved 50-50)', source: UFC_URL, transactions: byLabel(['ufc-321 test_market', 'ufc-321 seal']), records: recById('ufc-321')});
writeSplit('calibration-negative-cases.json', {transactions: byLabel(['btc-tampered test_market', 'btc-broken test_market', 'btc-wrong test_market', 'btc-wrong seal rejected', 'btc-dec20 duplicate rejected']), records: recById('btc-wrong')});
writeSplit('calibration-regression.json', {transactions: byLabel(['original test_rules', 'clarified test_rules', 'clarified seal']), records: [...recById('original'), ...recById('clarified')]});
fs.writeFileSync('public/deployment.json', JSON.stringify({network: 61999, address, owner: ownerA, id: 'btc-dec20'}, null, 2));
persist();
fs.rmSync(CHECKPOINT, {force: true});
console.log('CALIBRATION COMPLETE', address, 'txs:', evidence.transactions.length);
