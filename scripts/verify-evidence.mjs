// One-command independent verification for the forkseal-2 calibration.
// Re-reads everything live from Studionet and compares it against
// evidence/calibration.json. No wallet, no transactions, no writes.
// Usage: node scripts/verify-evidence.mjs
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';

const source = fs.readFileSync('contracts/forkseal.py', 'utf8');
const ev = JSON.parse(fs.readFileSync('evidence/calibration.json', 'utf8'));
const reader = createClient({chain: studionet});
const V1 = '0xED753895D32bF4504a47f267866B48cb8B40EBCd';
const V1_OWNER = '0xabbefc08711f636404c3dde2d4f96f4f44c6a15a';
let pass = 0, fail = 0;
const check = (name, ok, detail = '') => { console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : '')); ok ? pass++ : fail++; };
const sha = s => createHash('sha256').update(s).digest('hex');
const leaderExec = (tx) => {
  let r = tx.consensus_data?.leader_receipt;
  r = Array.isArray(r) ? r.find(x => x.mode === 'leader') : r;
  return r?.execution_result;
};

const code = await reader.getContractCode(ev.address);
check('deployed code == repo source (byte parity)', code === source, 'source sha256 ' + sha(source));
const proto = await reader.readContract({address: ev.address, functionName: 'get_protocol', args: [], transactionHashVariant: 'latest-final'});
check('protocol is forkseal-2', proto === 'forkseal-2', String(proto));

for (const t of ev.transactions) {
  if (t.label.includes('aborted')) continue;
  const tx = await reader.waitForTransactionReceipt({hash: t.hash, status: 'FINALIZED', interval: 3000, retries: 6, fullTransaction: true});
  const rec = t.receipt || {};
  const same = tx.status === rec.status && tx.result === rec.result && leaderExec(tx) === leaderExec(rec);
  check(`tx FINALIZED as recorded: ${t.label}`, [7, 'FINALIZED'].includes(tx.status) && same, t.hash.slice(0, 18) + ' status=' + tx.status + ' result=' + tx.result + ' leader=' + leaderExec(tx));
}

// Final record states re-read live, latest-final. Keyed by owner:id:
// the regression ran under wallet A (to PASSED) and wallet C (to SEALED),
// so both owners' final states are checked.
const finalByKey = new Map();
for (const r of ev.records) finalByKey.set(r.owner + ':' + r.id, r);
for (const [key, want] of finalByKey) {
  const owner = want.owner;
  const raw = await reader.readContract({address: ev.address, functionName: 'get_record', args: [owner, want.id], transactionHashVariant: 'latest-final'});
  const live = raw ? JSON.parse(raw) : null;
  check(`record ${want.id} (${owner.slice(0, 10)}…) live == evidence (${want.state})`, !!live && live.state === want.state && live.digest === want.digest, live ? 'live=' + live.state : 'missing');
}
// Expected-error calls created no record.
for (const [id, owner] of [['btc-tampered', ev.wallets.A], ['btc-broken', ev.wallets.A]]) {
  const raw = await reader.readContract({address: ev.address, functionName: 'get_record', args: [owner, id], transactionHashVariant: 'latest-final'});
  check(`no record for rejected ${id}`, raw === '');
}
// Source anchors.
const btc = finalByKey.get(ev.wallets.A + ':btc-dec20');
check('btc-dec20 source_verified + sha', btc?.source_verified === true && btc?.source_sha256 === 'e57083327c908724ae45105cb6bd2446de39b6c14b2f3e065a293aa824a52756', btc?.source_sha256?.slice(0, 12));
const ufc = finalByKey.get(ev.wallets.B + ':ufc-321');
check('ufc-321 source_verified + sha', ufc?.source_verified === true && ufc?.source_sha256 === 'ea132ca1e86ac7418939d4b9dec00f1f15a7e9cb17e588ec0447c278ab2f5219', ufc?.source_sha256?.slice(0, 12));
const wrong = finalByKey.get(ev.wallets.B + ':btc-wrong');
check('btc-wrong stayed BLOCKED [C1]', wrong?.state === 'BLOCKED' && JSON.stringify(wrong?.failed) === '["C1"]');
const clarC = finalByKey.get(ev.wallets.C + ':clarified');
check('regression clarified SEALED under wallet C', clarC?.state === 'SEALED');
const clarA = finalByKey.get(ev.wallets.A + ':clarified');
check('regression clarified still PASSED under wallet A (orphan)', clarA?.state === 'PASSED');
// v1 untouched.
const v1c = await reader.readContract({address: V1, functionName: 'get_record', args: [V1_OWNER, 'clarified'], transactionHashVariant: 'latest-final'});
const v1o = await reader.readContract({address: V1, functionName: 'get_record', args: [V1_OWNER, 'original'], transactionHashVariant: 'latest-final'});
check('v1 clarified still SEALED', v1c && JSON.parse(v1c).state === 'SEALED');
check('v1 original still BLOCKED', v1o && JSON.parse(v1o).state === 'BLOCKED');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
