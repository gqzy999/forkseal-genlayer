# Live validation

Stable Studionet only, chain 61999. Full deployed source bytes were verified. One temporary signer controlled the synthetic test workflow. No funds were transferred.

Contract: `0xED753895D32bF4504a47f267866B48cb8B40EBCd`

Owner: `0xabbefc08711f636404c3dde2d4f96f4f44c6a15a`

- deploy: `0x7f25c31c815c2df5d356d96a4c956c776bac2a7648ac7f5dac5fe35aee037928`; finalized status 7, consensus 6, execution SUCCESS.
- original test: `0xf0bac6f2827d0f5a64aa12bb94b675ed9867ab5081f8aac294d4b676be18403b`; finalized status 7, consensus 6, execution SUCCESS.
- blocked seal rejected: `0x3b2cc97c921a23b23e45fc89daaa137c512a09452b2b3a2504419b4a12e4f7f2`; finalized status 7, consensus 6, execution ERROR.
- revised same suite: `0x5d8c069afa0a4b781beba20973425b22e628c168d847d233a4cd4c762008223b`; finalized status 7, consensus 6, execution SUCCESS.
- seal passing test: `0x8864c99da5b00ec18f6e03736ec40cf48d5367c5541a5e1ca98bab7e0d53e15e`; finalized status 7, consensus 6, execution SUCCESS.

Original test: BLOCKED, C2 expected VOID / actual NO. Attempting to seal it failed as required. Clarified test: PASSED with the identical ordered suite, and C2 changed NO → VOID. Sealing the passing digest succeeded; final state SEALED.

Browser QA covers the authored mode switch and case-repair interaction. A separate desktop browser read verified full source and loaded the real SEALED record with 3/3 cases matching, without a wallet. The real full-consensus write lifecycle used the pinned JS SDK with a temporary account, not an injected extension. Mobile wallets and external wallet signing have not been verified. Local tests use a mocked host and do not substitute for live consensus.

# forkseal-2 resolved-market calibration

Stable Studionet only, chain 61999. New contract `0x0FB6D10F4A2319aD698179c7a7028081A44C466A`, source SHA-256 `d46412ed498acb1be479217b597043ecb11ee1c43532b7b9d064a533aaf8b268` (12,296 bytes, verified byte-identical to the deployed code). Three temporary zero-value wallets (A, B, C) ran the evidence; no funds were transferred. All 16 transactions FINALIZED; see `evidence/calibration.json` for the full receipts.

- deploy: `0xf938c78cffc664c7df8dc10d375f5caec34b0463b98bc0dd0b729ac93790e176`; status 7, consensus 6, SUCCESS.
- btc-dec20 test_market: `0x3320a0af8cee16ef917b19e1bfcd9b37e9ab05d10c990605e2c66dd33b5111e0`; status 7, consensus 6, SUCCESS. Record PASSED, 4/4 mirrored scenarios matching the real NO resolution.
- btc-dec20 seal: `0x3ddd1d773fdc498e995665951d2596086bab92b6866b8d67715d2e45ba3a54e1`; status 7, consensus 6, SUCCESS. SEALED.
- btc-tampered test_market: `0x7ce4af4942754e6af9fac9f45afc5078925833c922e831ecefe8e1f860bcc9f7`; status 7, consensus 6, ERROR (SOURCE_MISMATCH). No record.
- btc-broken test_market: `0xfae1f017cc308ac46f136a2c93eb3b0fcef974584d5ac11f20dcf62af4c63dd0`; status 7, consensus 6, ERROR (FETCH_HTTP_404). No record.
- btc-wrong test_market: `0x6133c38e997b4ddb79618c957c28b2b4ffc87bb4af72fb898e722e08e34137ce`; status 7, consensus 6, SUCCESS. Record BLOCKED [C1] — the wrong real outcome written as expected.
- btc-wrong seal rejected: `0x289620b709f724b730bbce6d78c78186509789374cb5db0dffa9fac89e1da009`; status 7, consensus 6, ERROR. Record stayed BLOCKED.
- ufc-321 test_market: `0x7cf2f39a2b1e7ee4f04c9d9b61bbaecc08524b273faeb108943a3f88bf74fcc3`; status 7, consensus 6, SUCCESS. Record PASSED, 3/3 scenarios (VOID, YES, VOID) matching the real 50-50 resolution.
- ufc-321 seal: `0xfdd4306a502e3664a2f7334b52c9e9c9f651b84f488f3a1d2e0b83adf86cd2ae`; status 7, consensus 6, SUCCESS. SEALED.
- btc-dec20 duplicate rejected: `0x4d150d632cd6535a1f8b0c35a08b175d293560cac74cd5079451f9ebf1d1faef`; status 7, consensus 6, ERROR. Original record unchanged.
- original test_rules (wallet A): `0x60a87d4450282277aa90bff317f215517518064288d81280b6ef90ad47d86876`; status 7, consensus 6, SUCCESS. BLOCKED [C2].
- clarified test_rules (wallet A): `0x4129da58cb8e882ed8f5493dbee76b13c7c69bb4b8c6f96ff3b1529e958397f5`; status 7, consensus 6, SUCCESS. PASSED, C2 NO → VOID. (The seal could not be signed: the run's checkpoint saved `account.privateKey`, which genlayer-js accounts do not expose, so wallet A's key was lost when the process ended. The record stays PASSED as an orphan.)
- original test_rules (wallet C): `0xa4c2f239adc79e1a630580d89a196a7eb27e67e2a1eab1b1c154cb16a4b2c4a0`; status 7, consensus 6, SUCCESS. BLOCKED [C2].
- clarified test_rules (wallet C) attempt-1: `0xc6f9f7905f528fe29d5010646cdb04b2666eb5a5246f83a60340c35e55f848c7`; status 7, consensus 7 (MAJORITY_DISAGREE: 3 disagree / 1 agree / 1 idle), leader SUCCESS. No record created.
- clarified test_rules (wallet C): `0x9ce45f33790557bab6cde61cc20e98974e8788b08812d39c3f3b27970f958f44`; status 7, consensus 6, SUCCESS. PASSED, C2 NO → VOID.
- clarified seal (wallet C): `0x4f78a5e490fbdd5b9b2d6dfb084952429535d44cb2a17e436be220abf38c1c2f`; status 7, consensus 6, SUCCESS. SEALED.

Attempt 1 (contract `0x4d0E346b735b3FDa1B3792eb12c64b40B426a828`, evidence `evidence/calibration-attempt-1.json`) found the VOID-mapping gap: `ufc-321` came back BLOCKED [C1, C3] with AMBIGUOUS on both void scenarios, the model reasoning that a 50-50 resolution "does not uniquely correspond to YES or NO". The `test_market` prompt now defines VOID to include a 50-50 split rule; the evidence was re-run from scratch on the new contract.

`node scripts/verify-evidence.mjs` re-reads all of the above live (34 checks, 0 failed at delivery). The frontend is bilingual (EN/中文 toggle); on-chain values stay English. Real OKX wallet writes and mobile 375px were not verified by the builder.
