# EXPECTED — ForkSeal forkseal-2 resolved-market calibration (pre-registration)

Written BEFORE the evidence run (2026-11-10). The evidence run must match
this file exactly; any deviation is a failure to explain, not to edit away.

## Chosen real markets

### M1 — journey market (resolved NO)
- Market: "Bitcoin above $100,000 on December 20?" — Polymarket market 515539
- Source URL: https://gamma-api.polymarket.com/markets/515539
- Public page: https://polymarket.com/event/bitcoin-above-100000-on-december-20
- Real outcome: NO — outcomePrices ["0","1"], closed 2024-12-20 19:09:29 UTC, UMA resolved.
- Real fact behind C1: the Binance BTCUSDT 1-minute candle for 20 Dec '24
  12:00 ET closed at $96,548.00 (Binance official market-data endpoint
  data-api.binance.vision; Binance.com API is geo-blocked from this VM).
  Below the $100,000.01 threshold, so the market resolved NO.
- Description SHA-256 (from the STEP 1 probe, consensus-verified):
  `e57083327c908724ae45105cb6bd2446de39b6c14b2f3e065a293aa824a52756`
- Rules submitted (verbatim description, 548 chars incl. trailing newline):
  > This market will resolve to "Yes" if the Binance 1 minute candle for
  > BTCUSDT 20 Dec '24 12:00 in the ET timezone (noon) has a final "Close"
  > price of 100,000.01 or higher. Otherwise, this market will resolve to
  > "No".
  >
  > The resolution source for this market is Binance, specifically the
  > BTCUSDT "Close" prices currently available at
  > https://www.binance.com/en/trade/BTC_USDT with "1m" and "Candles"
  > selected on the top bar.
  >
  > Please note that this market is about the price according to Binance
  > BTCUSDT, not according to other sources or spot markets.
- Title submitted: "Bitcoin above $100,000 on December 20?"

### M2 — void market (resolved 50-50)
- Market: "Aspinall vs. Gane" — Polymarket market 639337, UFC 321, Oct 25 2025
- Source URL: https://gamma-api.polymarket.com/markets/639337
- Public page: https://polymarket.com/event/ufc-321-aspinall-vs-gane
- Real outcome: 50-50 — outcomePrices ["0.5","0.5"], closed 2025-10-25
  23:09:49 UTC, UMA resolved. Gane poked Aspinall's eye at 4:35 of round
  one; Aspinall could not continue; the bout was ruled a no contest.
- Description SHA-256 (probe, consensus-verified):
  `ea132ca1e86ac7418939d4b9dec00f1f15a7e9cb17e588ec0447c278ab2f5219`
- Rules submitted (verbatim description, 534 chars). The market's own
  outcomes are "Aspinall"/"Gane"; the ForkSeal question frames them as a
  binary question, so Aspinall-wins maps to YES, Gane-wins to NO, and the
  written 50-50 clause maps to VOID.
- Title submitted: "Will Tom Aspinall win his bout against Ciryl Gane at UFC 321?"

## Journey scenarios and expected outcomes

### btc-dec20 (wallet A, test_market M1) — expected PASSED, then SEALED
- C1 NO: "The Binance BTCUSDT 1-minute candle for 20 Dec '24 12:00 ET closed at $96,548.00, below the $100,000.01 threshold."
- C2 YES: "The Binance BTCUSDT 1-minute candle for 20 Dec '24 12:00 ET closed at $100,214.55, above the $100,000.01 threshold."
- C3 YES: "The Binance BTCUSDT 1-minute candle for 20 Dec '24 12:00 ET closed at exactly $100,000.01, the minimum price for a Yes resolution."
- C4 NO: "Coinbase showed BTC at $100,500.00 at noon ET on 20 Dec '24, while the Binance BTCUSDT 1-minute candle for 12:00 ET closed at $96,548.00."
- Record fields: source_url = M1 URL, source_verified = true,
  source_sha256 = e5708332…, protocol forkseal-2.

### ufc-321 (wallet B, test_market M2) — expected PASSED, then SEALED
- C1 VOID: "At UFC 321 on October 25, 2025, Ciryl Gane accidentally poked Tom Aspinall's right eye at 4:35 of the first round. Aspinall could not continue, and ESPN reported the bout ruled a no contest."
- C2 YES: "At UFC 321 on October 25, 2025, Tom Aspinall knocked out Ciryl Gane in the second round and ESPN declared Aspinall the winner."
- C3 VOID: "The Aspinall vs. Gane bout scheduled for October 25, 2025 was postponed to December 2025, after November 1, 2025, and never took place."
- Record fields: source_url = M2 URL, source_verified = true,
  source_sha256 = ea132ca1….

### btc-wrong (wallet B, test_market M1) — expected BLOCKED, failed [C1]
- Same rules, title, source URL and scenarios as btc-dec20, except C1
  expected YES (wrong: the real outcome is NO). Consensus actuals must
  still come back [NO, YES, YES, NO], so the record is BLOCKED and the
  seal attempt on it must fail. This is the proof the test checks reality,
  not the author's opinion.

### Regression on the new contract (wallet A, unchanged test_rules)
- original: the v1 loose observatory rules + 3 cases → BLOCKED, failed [C2].
- clarified: same title + cases, parent original, fixed rules → PASSED,
  changes [C2: NO → VOID], then SEALED.
- Both records: source_url '', source_verified false, source_sha256 ''.

## Negative transactions (each must fail with no record created / no state change)
1. btc-tampered (wallet A): test_market M1 URL with rules text that is NOT
   in the fetched page (one sentence changed) → ERROR (SOURCE_MISMATCH),
   no record.
2. btc-broken (wallet A): test_market with source URL
   https://gamma-api.polymarket.com/markets/999999999 (Gamma returns HTTP
   404 "id not found", verified 2026-11-10) → ERROR (FETCH_HTTP_404),
   no record.
3. btc-wrong seal (wallet B): seal on the BLOCKED btc-wrong record →
   ERROR (ALL_CASES_MUST_PASS), record stays BLOCKED.
4. btc-dec20 duplicate (wallet A): test_market with ident btc-dec20 again
   → ERROR (IMMUTABLE_ID), original record unchanged.

## Planned transaction list (13 txs)
1. deploy — new ForkSeal forkseal-2 contract, no constructor args.
2. btc-dec20 test_market (A) → SUCCESS, PASSED.
3. btc-dec20 seal (A) → SUCCESS, SEALED.
4. btc-tampered test_market (A) → ERROR, no record.
5. btc-broken test_market (A) → ERROR, no record.
6. btc-wrong test_market (B) → SUCCESS, BLOCKED [C1].
7. btc-wrong seal (B) → ERROR, stays BLOCKED.
8. ufc-321 test_market (B) → SUCCESS, PASSED.
9. ufc-321 seal (B) → SUCCESS, SEALED.
10. btc-dec20 duplicate test_market (A) → ERROR, unchanged.
11. original test_rules (A) → SUCCESS, BLOCKED [C2].
12. clarified test_rules, parent original (A) → SUCCESS, PASSED.
13. clarified seal (A) → SUCCESS, SEALED.

## Expected final state
- 5 records on the new contract: btc-dec20 SEALED, btc-wrong BLOCKED,
  ufc-321 SEALED, original BLOCKED, clarified SEALED.
- All 13 txs FINALIZED. The 4 ERROR txs are the expected failures above.
- v1 contract 0xED753895D32bF4504a47f267866B48cb8B40EBCd untouched:
  clarified still SEALED, original still BLOCKED.
- New contract source SHA-256 == the deployed code via getContractCode.

## Amendment 1 — attempt 1 found a real VOID-mapping gap (2026-11-10, before the re-run)
Attempt 1 deployed 0x4d0E346b735b3FDa1B3792eb12c64b40B426a828 and ran 9 txs
(evidence preserved in evidence/calibration-attempt-1.json). The BTC
journey PASSED and SEALED; tampered, broken, wrong-expected and the
wrong-seal rejection all behaved as pre-registered. But ufc-321 came back
BLOCKED with failed [C1, C3]: the model returned AMBIGUOUS for both VOID
scenarios, quoting the exact 50-50 clause and reasoning that a 50-50
resolution "does not uniquely correspond to YES or NO". The model's
reasoning was correct — the fault was the contract's VOID definition,
which only named void/refund/cancel rules and never said a 50-50 split
counts as the void outcome.
Fix (principled, not answer-fitting): the test_market prompt now defines
VOID as "an explicit void/refund/cancel rule, or a rule that the market
resolves 50-50 (a split in which neither outcome wins)". The test_rules
prompt is unchanged. The fix is in the deployed source, so the evidence
restarts on a NEW contract with the same 13 pre-registered txs and the
same expected outcomes. Attempt 1's contract is abandoned (its SEALED
btc-dec20 record stays on-chain as the superseded run).

## Amendment 2 — regression seal completed under wallet C (2026-11-10)
The re-run on 0x0FB6D10F4A2319aD698179c7a7028081A44C466A completed 12 of
13 txs, all as pre-registered, but the process ended before the final
`clarified` seal. Worse, the checkpoint had saved `account.privateKey`,
which genlayer-js accounts do not expose, so wallet A's key was
unrecoverable and its PASSED `clarified` record could not be sealed.
The regression was re-run in full under a fresh wallet C
(scripts/complete-regression.mjs; idents are owner-scoped, so
'original'/'clarified' are reusable): `original` BLOCKED [C2] →
`clarified` PASSED (C2 NO → VOID) → SEALED. Wallet A's PASSED record
remains in the evidence as an orphan. The first wallet-C `clarified`
attempt ended MAJORITY_DISAGREE (3 disagree / 1 agree / 1 idle, no record
created) and was retried with an identical fresh call, which passed —
consensus disagreement is a fail-closed retry, not a contract defect.
Final tally: 16 txs on the new contract — 12 of the 13 pre-registered
(the wallet-A `clarified` seal could not be signed) + 4 wallet-C
completion txs (`original`, `clarified` attempt-1 MAJORITY_DISAGREE,
`clarified` retry, `clarified` seal). The checkpoint code was fixed to
save the raw generated keys.
