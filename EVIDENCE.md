# EVIDENCE — ForkSeal forkseal-2 resolved-market calibration

Stable Studionet only (chain 61999). New contract
`0x0FB6D10F4A2319aD698179c7a7028081A44C466A`, deploy tx
`0xf938c78cffc664c7df8dc10d375f5caec34b0463b98bc0dd0b729ac93790e176`,
source SHA-256
`d46412ed498acb1be479217b597043ecb11ee1c43532b7b9d064a533aaf8b268`
(12,296 bytes, byte-identical to the deployed code via getContractCode).
Live site: https://gqzy999.github.io/forkseal-genlayer/
v1 contract `0xED753895D32bF4504a47f267866B48cb8B40EBCd` untouched
(`clarified` still SEALED, `original` still BLOCKED).

This file is the human-readable summary. Machine-readable evidence:
`evidence/calibration.json` (combined index, all 16 txs + records),
`evidence/calibration-btc-journey.json`, `evidence/calibration-ufc-void.json`,
`evidence/calibration-negative-cases.json`,
`evidence/calibration-regression.json`, `evidence/probe-market.json`,
`evidence/EXPECTED.md` (pre-registration + amendments).
Run `node scripts/verify-evidence.mjs` to re-read everything live
(34 checks, 0 failed at delivery).

## The markets
- **Bitcoin above $100,000 on December 20?** — Polymarket 515539, resolved
  NO. Source https://gamma-api.polymarket.com/markets/515539, description
  SHA-256 `e57083327c908724ae45105cb6bd2446de39b6c14b2f3e065a293aa824a52756`.
  Public page https://polymarket.com/event/bitcoin-above-100000-on-december-20
  The Binance BTCUSDT 1-minute candle for 20 Dec '24 12:00 ET closed at
  $96,548.00 (Binance official market-data endpoint), below the
  $100,000.01 threshold.
- **Aspinall vs. Gane** — Polymarket 639337, UFC 321, resolved 50-50.
  Source https://gamma-api.polymarket.com/markets/639337, description
  SHA-256 `ea132ca1e86ac7418939d4b9dec00f1f15a7e9cb17e588ec0447c278ab2f5219`.
  Public page https://polymarket.com/event/ufc-321-aspinall-vs-gane
  The bout was ruled a no contest (eye poke, round one).

## Journey (wallet A: 0x15daa82431f05d5184ba4e9c245a02ce39189d98)
- `btc-dec20` test_market `0x3320a0af8cee16ef917b19e1bfcd9b37e9ab05d10c990605e2c66dd33b5111e0`
  → PASSED (C1 NO real close, C2 YES counterfactual, C3 YES exact threshold,
  C4 NO wrong source), source_verified true.
- `btc-dec20` seal `0x3ddd1d773fdc498e995665951d2596086bab92b6866b8d67715d2e45ba3a54e1`
  → SEALED.

## Void market (wallet B: 0x03e5d0d19cebb60dbfb17c32079db7f371bc3db1)
- `ufc-321` test_market `0x7cf2f39a2b1e7ee4f04c9d9b61bbaecc08524b273faeb108943a3f88bf74fcc3`
  → PASSED (C1 VOID no contest, C2 YES Aspinall wins, C3 VOID postponed
  after Nov 1), source_verified true.
- `ufc-321` seal `0xfdd4306a502e3664a2f7334b52c9e9c9f651b84f488f3a1d2e0b83adf86cd2ae`
  → SEALED.

## Negatives (each read back with state unchanged)
- `btc-tampered` `0x7ce4af4942754e6af9fac9f45afc5078925833c922e831ecefe8e1f860bcc9f7`
  → ERROR (SOURCE_MISMATCH), no record. Rules text not in the fetched page.
- `btc-broken` `0xfae1f017cc308ac46f136a2c93eb3b0fcef974584d5ac11f20dcf62af4c63dd0`
  → ERROR (FETCH_HTTP_404: Gamma "id not found"), no record.
- `btc-wrong` `0x6133c38e997b4ddb79618c957c28b2b4ffc87bb4af72fb898e722e08e34137ce`
  → BLOCKED [C1]: same suite as the journey except C1 expected YES (the
  wrong real outcome). Consensus actuals stayed [NO, YES, YES, NO].
- `btc-wrong` seal `0x289620b709f724b730bbce6d78c78186509789374cb5db0dffa9fac89e1da009`
  → ERROR. Record stayed BLOCKED.
- `btc-dec20` duplicate `0x4d150d632cd6535a1f8b0c35a08b175d293560cac74cd5079451f9ebf1d1faef`
  → ERROR (IMMUTABLE_ID). SEALED record unchanged.

## Regression (unchanged test_rules, v1 observatory suite)
- Wallet A: `original` `0x60a87d4450282277aa90bff317f215517518064288d81280b6ef90ad47d86876`
  → BLOCKED [C2]; `clarified` `0x4129da58cb8e882ed8f5493dbee76b13c7c69bb4b8c6f96ff3b1529e958397f5`
  → PASSED (C2 NO → VOID). The seal could not be signed — the run's
  checkpoint saved `account.privateKey`, which genlayer-js accounts do not
  expose, so wallet A's key was lost. The record stays PASSED as an orphan.
- Wallet C (0xea35fd1cd906d44fafede13c6da3d2a8c5d9d0b9): `original`
  `0xa4c2f239adc79e1a630580d89a196a7eb27e67e2a1eab1b1c154cb16a4b2c4a0`
  → BLOCKED [C2]; `clarified` attempt-1
  `0xc6f9f7905f528fe29d5010646cdb04b2666eb5a5246f83a60340c35e55f848c7`
  → MAJORITY_DISAGREE (result 7, no record); retry
  `0x9ce45f33790557bab6cde61cc20e98974e8788b08812d39c3f3b27970f958f44`
  → PASSED (C2 NO → VOID); seal
  `0x4f78a5e490fbdd5b9b2d6dfb084952429535d44cb2a17e436be220abf38c1c2f`
  → SEALED.

## Attempt 1 (superseded, kept)
Contract `0x4d0E346b735b3FDa1B3792eb12c64b40B426a828`,
evidence `evidence/calibration-attempt-1.json`. The BTC journey sealed,
but `ufc-321` came back BLOCKED [C1, C3]: the model returned AMBIGUOUS on
both void scenarios, reasoning a 50-50 resolution "does not uniquely
correspond to YES or NO". The model was right — the contract's VOID
definition never said a 50-50 split counts as the void outcome. The
`test_market` prompt was fixed to define VOID to include 50-50 splits and
the evidence was re-run from scratch on the new contract.

## Probe (STEP 1, before the build)
Probe contract `0xb380ED6401BeA8e99e0A4B18483F903d656D3632`
(deploy `0xa79fe640eacbf2d0cd6157f717264778029b2441f0318f7aab1212f5679ab7e6`):
`fetch_probe` on both Gamma URLs FINALIZED + MAJORITY_AGREE, description
SHA-256s identical to local fetches. Evidence `evidence/probe-market.json`.

## What this does not prove
A passing calibration proves the rules-as-written yield the market's real
outcome on the tested scenarios. It does not certify the market itself,
the rules' completeness, or any future resolution. The source check proves
the submitted rules appear verbatim in the fetched market record; it does
not prove the scenario facts happened off-chain. The published outcome is
withheld from the model, so the test cannot be passed by copying the
market's result.
