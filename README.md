# ForkSeal

[Open ForkSeal](https://gqzy999.github.io/forkseal-genlayer/) · [Submission details](SUBMISSION.md) · [Live validation](VALIDATION.md)

A regression workbench for binary prediction-market resolution rules. Test hypothetical boundary cases, revise the rules against the same suite, and seal only a test whose actual outcomes match every declared expectation.

## Use the workbench

1. Explore the fictional observatory example. The original cancellation case expects VOID, while the rules say otherwise NO. Add the explicit cancellation clause to see the illustrated repair. This mode is authored practice data, not a chain result.
2. Choose **Live on GenLayer → Read published test** for the configured finalized test. Reads require no wallet.
3. For your own test, connect an injected wallet on Stable Studionet (61999), or create a temporary zero-value signer. Temporary keys remain in page memory; reloading loses signing access. Save the public record reference before leaving.
4. Use the configured contract, or deploy the complete bundled contract. Source bytes and protocol are verified before access.
5. Enter a fresh test ID, a binary question, explicit resolution rules, and 2–4 hypothetical scenarios. Each scenario includes your expected YES, NO or VOID outcome. Test the rules through full GenLayer consensus.
6. Inspect actual outcomes, exact rule quotations and reasons. AMBIGUOUS or any expected/actual mismatch gives BLOCKED and prevents sealing.
7. To revise, use a fresh ID and the old parent ID. The question and complete ordered case suite, including expectations, must remain identical. Only the rules change. Outcome changes are recorded.
8. Only the record owner may seal a PASSED test, signing its exact digest. Export the chain record and any loaded transaction receipt.

A seal records agreement on this finite suite, not comprehensive quality, safety, truth or approval of a market. The application creates no prediction market, orders, odds, escrow or payments.

## GenLayer is central

Interpreting the rule against a cancellation, draft, removal or source conflict is semantic. Independent validators run the interpretation and must agree on every actual category. The model never sees expected outcomes. Deterministic code compares them afterward, preserves immutable revisions and directly blocks sealing on a mismatch. Explanations may differ, but every stored quote must be a substring of the signed rules.

Rules and hypothetical facts are authoritative submitted inputs for this test. They are public, signed assertions, not verified real events. No live external fact is needed or fetched: scenarios are deliberately hypothetical. Instructions inside inputs remain untrusted; prompt injection and model mistakes remain possible.

## Run locally

Node.js 22+ and Python 3.12+:

```sh
npm ci
npm test
python3 -m unittest discover -s contract-tests -v
npm run build
npm run dev
```

Static output: `dist/`, with relative asset paths. GenLayerJS 1.1.8 and viem 2.57.8 are pinned. No paid AI API, backend, private wallet export or gas purchase is required. Stable Studionet only: chain ID 61999, RPC https://studio.genlayer.com/api.

## Transaction recovery

The UI saves intent before signing and saves the returned hash immediately. New writes remain blocked while unresolved. **Resume transaction** reads the existing hash; it never resends. Explicit wallet rejection releases the guard. Unknown submission outcomes retain it; copy the exact hash from wallet activity. Successful calls require a finalized majority-agree receipt, successful leader execution, sender/target/method/argument binding and matching state readback. Reload preserves pending intent but does not preserve a temporary private key.

Only confirmed finalized execution errors or majority disagreement release a failed call. Timeouts and readback failures retain the hash. State and pending intent are browser-local pointers; chain records remain authoritative. Never blindly repeat an uncertain call. Do not place confidential rules or facts on chain.

## Contract interface

`contracts/forkseal.py` has no constructor arguments.

| Method | Kind | Arguments |
| --- | --- | --- |
| `test_rules` | write | `ident, title, rules, cases_json, parent_id` |
| `test_market` | write | `ident, source_url, title, rules, cases_json, parent_id` |
| `seal` | write | `ident, digest` |
| `get_record` | view | `owner, ident` |
| `get_protocol` | view | none |

`test_market` (forkseal-2) imports rules from a real resolved prediction market. The contract fetches `source_url` inside consensus — only `https://gamma-api.polymarket.com/markets/` and `https://polymarket.com/event/` are allowed — and deterministic code requires the submitted rules to appear verbatim in the fetched source (the decoded JSON `description` field, or the raw body for other pages). A fetch failure or mismatch fails the transaction and no record is created. The published market outcome is never sent to the model. Records gain `source_url`, `source_verified` and `source_sha256` fields; VOID covers an explicit void/refund/cancel rule or a 50-50 split rule.

IDs are scoped to the signer. Tests are atomic and immutable. Children can reference only the signer's existing parent. A revision may correct a blocked test; it cannot erase its parent. An unlinked test is explicitly a new suite and carries no regression continuity. There is no claim of independent author identity or exhaustive case coverage.

`test_rules` accepts 2–4 distinct scenarios of 30–1000 characters each, a question of 5–140 characters, and rules of 40–4000 characters. Exact category agreement covers YES, NO, VOID and AMBIGUOUS. A quotation must contain 5–450 characters; a reason 10–350 characters. Malformed outputs or disagreement cannot create a record.

## Validation

18 mocked-host contract tests cover ownership, immutability, expected-answer withholding, exact-suite revisions, digest checks, ambiguity, rejected evidence and validator disagreement, plus the market source check (verbatim rules, fetch failure, bad host, wrong expected blocks, outcome never in the prompt, 50-50 in the market prompt). Ten frontend logic tests cover case validation, mismatch gates and the market source helpers. These are local tests, separate from real validator consensus. See `evidence/calibration.json` for the live run and `VALIDATION.md` for its result and boundaries. `genvm-lint validate contracts/forkseal.py` passes (5 methods: 2 view, 3 write).

## Resolved-market calibration (forkseal-2)

`test_market` calibrates rules against real resolved markets. The published calibration imported "Bitcoin above $100,000 on December 20?" (Polymarket 515539, resolved NO) and "Aspinall vs. Gane" (Polymarket 639337, resolved 50-50): both sealed with all mirrored scenarios matching the real resolutions. A test with the wrong real outcome written as expected was BLOCKED, and tampered rules plus a broken source URL were rejected with no record. See `REVIEWER.md` and `evidence/EXPECTED.md`.

The optional `scripts/verify-live.mjs` is a development verification utility. Running it creates a new temporary test account and deployment; do not rerun merely to read an existing example. It records hashes before polling and never exports keys.

`scripts/verify-calibration.mjs` runs the forkseal-2 calibration evidence flow (new deployment, 13 pre-registered transactions, two temporary wallets); `scripts/verify-evidence.mjs` re-reads all of it live with no wallet and no transactions. `contracts/market_probe.py` is the minimal STEP 1 probe contract that proved consensus can fetch the Gamma API before the milestone was built.

MIT licensed.

## Published test

Contract: `0x0FB6D10F4A2319aD698179c7a7028081A44C466A` (forkseal-2). Record owner: `0x15daa82431f05d5184ba4e9c245a02ce39189d98`, ID `btc-dec20`. Choose **Live on GenLayer → Read published test** to read the SEALED record without a wallet — the Bitcoin market calibration, all 4 mirrored scenarios matching the real NO resolution. The v1 contract `0xED753895D32bF4504a47f267866B48cb8B40EBCd` (record owner `0xabbefc08711f636404c3dde2d4f96f4f44c6a15a`, ID `clarified`) is untouched and still SEALED.
