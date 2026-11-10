// Completion run: the regression seal on contract 0x0FB6… could not be
// signed because the main run's checkpoint saved account.privateKey,
// which genlayer-js accounts do not expose — wallet A's key was lost when
// that process ended. The regression is re-run under a FRESH wallet C
// (idents are owner-scoped, so 'original'/'clarified' are reusable).
// Wallet A's PASSED 'clarified' record stays in the evidence as an orphan.
// Usage: node scripts/complete-regression.mjs
import fs from 'node:fs';
import {createClient, createAccount, generatePrivateKey} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {title, loose, fixed, cases} from '../src/fixtures.js';

const CHECKPOINT = new URL('../../forkseal-checkpoint-c.json', import.meta.url).pathname;
const EVIDENCE = 'evidence/calibration.json';
const source = fs.readFileSync('contracts/forkseal.py', 'utf8');
const ev = JSON.parse(fs.readFileSync(EVIDENCE, 'utf8'));
const address = ev.address;
if (!address) throw Error('No contract address in calibration.json');
if (await createClient({chain: studionet}).getContractCode(address) !== source) throw Error('SOURCE_MISMATCH');

let ck = null;
if (fs.existsSync(CHECKPOINT)) { ck = JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')); console.log('resuming; done:', ck.done); }
const privC = ck?.accountC || generatePrivateKey();
const accountC = createAccount(privC);
const clientC = createClient({chain: studionet, account: accountC});
const ownerC = accountC.address.toLowerCase();
const done = new Set(ck?.done || []);
ev.wallets = {...ev.wallets, C: ownerC};
const saveCheckpoint = () => { fs.writeFileSync(CHECKPOINT, JSON.stringify({accountC: privC, address, done: [...done]}, null, 2)); fs.chmodSync(CHECKPOINT, 0o600); };
const persist = () => fs.writeFileSync(EVIDENCE, JSON.stringify(ev, null, 2));
saveCheckpoint(); persist();
console.log('wallet C', ownerC, 'contract', address);

function leaderExec(tx) {
  let r = tx.consensus_data?.leader_receipt;
  r = Array.isArray(r) ? r.find(x => x.mode === 'leader') : r;
  return r?.execution_result;
}
function good(tx) { return [7, 'FINALIZED'].includes(tx.status) && [6, 'MAJORITY_AGREE'].includes(tx.result) && leaderExec(tx) === 'SUCCESS'; }
async function collect(hash, label) {
  const existing = ev.transactions.find(t => t.label === label && t.receipt);
  if (existing) { console.log('reuse (receipt present)', label, existing.hash); return existing.receipt; }
  if (!ev.transactions.find(t => t.label === label && t.hash === hash)) ev.transactions.push({label, hash});
  persist();
  console.log(label, hash);
  for (let i = 0; i < 30; i++) {
    try {
      const tx = await clientC.waitForTransactionReceipt({hash, status: 'FINALIZED', interval: 3000, retries: 8, fullTransaction: true});
      ev.transactions.at(-1).receipt = tx; persist();
      console.log(label, 'status', tx.status, 'result', tx.result, 'leader', leaderExec(tx));
      return tx;
    } catch (e) { console.log('tracking', label, i, e.shortMessage || e.message); }
  }
  throw Error('Timeout on ' + label + ': rerun to resume; do not resend.');
}
async function call(label, method, args) {
  if (done.has(label)) { console.log('skip (done)', label); return null; }
  // A previous receipted attempt that never reached `done` failed on-chain
  // (e.g. MAJORITY_DISAGREE with no record created). Keep it as evidence
  // under a new label and retry with a fresh call — never resend a hash
  // whose outcome is unknown, and never reuse a failed receipt.
  const prior = ev.transactions.find(t => t.label === label && t.receipt);
  if (prior) { prior.label = label + ' attempt-1 MAJORITY_DISAGREE'; persist(); console.log('prior attempt disagreed; retrying with a fresh call'); }
  const pending = ev.transactions.find(t => t.label === label && !t.receipt);
  const tx = pending
    ? await collect(pending.hash, label)
    : await collect(await clientC.writeContract({address, functionName: method, args, value: 0n, leaderOnly: false}), label);
  if (!good(tx)) throw Error('Unexpected execution for ' + label);
  done.add(label); saveCheckpoint(); persist();
  return tx;
}
async function read(id, expectState, expectFailed) {
  const raw = await clientC.readContract({address, functionName: 'get_record', args: [ownerC, id], transactionHashVariant: 'latest-final'});
  const r = JSON.parse(raw);
  if (!ev.records.find(x => x.id === r.id && x.owner === r.owner && x.state === r.state && x.digest === r.digest)) ev.records.push(r);
  persist();
  console.log('read', id, '->', r.state, 'failed:', JSON.stringify(r.failed));
  if (r.state !== expectState || JSON.stringify(r.failed) !== JSON.stringify(expectFailed)) throw Error(`Record ${id} mismatch`);
  return r;
}
const rulesArgs = (id, t, rules, cs, parent) => [id, t, rules, JSON.stringify(cs), parent];
const chainId = await clientC.getChainId();
if (chainId !== 61999) throw Error('WRONG_CHAIN');

await call('original test_rules (wallet C)', 'test_rules', rulesArgs('original', title, loose, cases, ''));
await read('original', 'BLOCKED', ['C2']);
await call('clarified test_rules (wallet C)', 'test_rules', rulesArgs('clarified', title, fixed, cases, 'original'));
const r = await read('clarified', 'PASSED', []);
if (!(Array.isArray(r.changes) && r.changes.length === 1 && r.changes[0].id === 'C2' && r.changes[0].before === 'NO' && r.changes[0].after === 'VOID')) throw Error('clarified changes mismatch: ' + JSON.stringify(r.changes));
await call('clarified seal (wallet C)', 'seal', ['clarified', r.digest]);
await read('clarified', 'SEALED', []);

const byLabel = (labels) => ev.transactions.filter(t => labels.includes(t.label));
const recById = (id) => ev.records.filter(r => r.id === id);
const writeSplit = (name, obj) => fs.writeFileSync('evidence/' + name, JSON.stringify(obj, null, 2));
writeSplit('calibration-btc-journey.json', {market: 'Bitcoin above $100,000 on December 20? (515539, resolved NO)', source: 'https://gamma-api.polymarket.com/markets/515539', transactions: byLabel(['btc-dec20 test_market', 'btc-dec20 seal']), records: recById('btc-dec20')});
writeSplit('calibration-ufc-void.json', {market: 'Aspinall vs. Gane (639337, resolved 50-50)', source: 'https://gamma-api.polymarket.com/markets/639337', transactions: byLabel(['ufc-321 test_market', 'ufc-321 seal']), records: recById('ufc-321')});
writeSplit('calibration-negative-cases.json', {transactions: byLabel(['btc-tampered test_market', 'btc-broken test_market', 'btc-wrong test_market', 'btc-wrong seal rejected', 'btc-dec20 duplicate rejected']), records: recById('btc-wrong')});
writeSplit('calibration-regression.json', {note: 'Wallet A ran the regression to PASSED but its key was lost to a checkpoint bug before the seal; wallet C re-ran the full regression path (same idents, owner-scoped) to SEALED.', transactions: byLabel(['original test_rules', 'clarified test_rules', 'original test_rules (wallet C)', 'clarified test_rules (wallet C)', 'clarified seal (wallet C)']), records: [...recById('original'), ...recById('clarified')]});
fs.writeFileSync('public/deployment.json', JSON.stringify({network: 61999, address, owner: ev.wallets.A, id: 'btc-dec20'}, null, 2));
persist();
fs.rmSync(CHECKPOINT, {force: true});
console.log('REGRESSION COMPLETE', address, 'txs:', ev.transactions.length);
