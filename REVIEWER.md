# REVIEWER.md — ForkSeal forkseal-2 resolved-market calibration

Contract: `0x0FB6D10F4A2319aD698179c7a7028081A44C466A` (forkseal-2, deploy tx
`0xf938c78cffc664c7df8dc10d375f5caec34b0463b98bc0dd0b729ac93790e176`).
Source SHA-256: `d46412ed498acb1be479217b597043ecb11ee1c43532b7b9d064a533aaf8b268`
(12,296 bytes). Live site: https://gqzy999.github.io/forkseal-genlayer/
v1 contract `0xED753895D32bF4504a47f267866B48cb8B40EBCd` is untouched.

## What changed
ForkSeal v1 tested hypothetical rules: the author wrote the rules and the
scenarios, and consensus checked whether the rules-as-written decided the
scenarios. Nothing anchored the test to the real world. forkseal-2 adds
`test_market`: the author imports rules from a real resolved prediction
market (Polymarket Gamma API record or market page), the contract fetches
the source inside consensus, deterministic code verifies the submitted
rules appear verbatim in the fetched source, and consensus then checks the
rules against scenarios that mirror the market's real resolution. The
published market outcome is never fed to the model. `test_rules` is
unchanged; `seal` is unchanged; the v1 contract is untouched.

## How to verify (one command)
```sh
node scripts/verify-evidence.mjs
```
No wallet, no transactions. It checks, all live against Studionet:
1. Deployed code == `contracts/forkseal.py` byte-for-byte (getContractCode).
2. Protocol is `forkseal-2`.
3. Every evidence transaction re-read FINALIZED with the recorded
   status/result/leader outcome.
4. Every final record re-read latest-final equals the evidence record.
5. The two rejected source calls created no record.
6. `btc-dec20` / `ufc-321` carry `source_verified: true` and the
   consensus-verified description SHA-256s.
7. v1 contract `0xED75…` still has `clarified` SEALED / `original` BLOCKED.

## The markets (real, resolved, public)
- **Bitcoin above $100,000 on December 20?** — Polymarket 515539, resolved
  NO (outcomePrices ["0","1"]). Source:
  https://gamma-api.polymarket.com/markets/515539 — description SHA-256
  `e57083327c908724ae45105cb6bd2446de39b6c14b2f3e065a293aa824a52756`.
  Public page: https://polymarket.com/event/bitcoin-above-100000-on-december-20
  The real Binance BTCUSDT 1-minute candle for 20 Dec '24 12:00 ET closed
  at $96,548.00 (Binance official market-data endpoint), below the
  $100,000.01 threshold — hence NO.
- **Aspinall vs. Gane** — Polymarket 639337, UFC 321, resolved 50-50
  (outcomePrices ["0.5","0.5"]). Source:
  https://gamma-api.polymarket.com/markets/639337 — description SHA-256
  `ea132ca1e86ac7418939d4b9dec00f1f15a7e9cb17e588ec0447c278ab2f5219`.
  Public page: https://polymarket.com/event/ufc-321-aspinall-vs-gane
  The bout was ruled a no contest (eye poke, round one) — hence 50-50.

## What the evidence shows
- `btc-dec20` (4 mirrored scenarios: real close NO, counterfactual YES,
  exact-threshold YES, wrong-source NO) → PASSED → SEALED.
- `ufc-321` (no-contest VOID, Aspinall-wins YES, postponed-after-Nov-1
  VOID) → PASSED → SEALED.
- `btc-wrong`: identical suite except C1 expected YES (the wrong real
  outcome) → BLOCKED [C1]; the seal attempt failed. The test checks
  reality, not the author's opinion.
- `btc-tampered` (rules text not in the fetched page) and `btc-broken`
  (Gamma 404) → both ERROR, no record. A duplicate `btc-dec20` → ERROR.
- Regression: the v1 observatory suite re-run via unchanged `test_rules`
  → `original` BLOCKED [C2] → `clarified` PASSED (C2 NO → VOID) → SEALED.
- The STEP 1 probe (evidence/probe-market.json) proved consensus can fetch
  the Gamma API: both markets' description hashes matched a local fetch
  exactly, on a minimal contract, before any of this was built.

## Attempt 1 found a real gap (kept, not hidden)
The first evidence run (evidence/calibration-attempt-1.json, contract
0x4d0E346b735b3FDa1B3792eb12c64b40B426a828) had `ufc-321` BLOCKED on C1/C3:
the model returned AMBIGUOUS, quoting the 50-50 clause and reasoning that
a 50-50 resolution "does not uniquely correspond to YES or NO". The
model was right; the contract's VOID definition only named void/refund/
cancel rules and never said a 50-50 split counts as the void outcome.
The fix: the `test_market` prompt now defines VOID to include "a rule
that the market resolves 50-50 (a split in which neither outcome wins)".
The `test_rules` prompt is unchanged. The evidence was re-run from scratch
on the new contract with the same 13 pre-registered transactions
(evidence/EXPECTED.md, Amendment 1).

## What this does NOT prove
- A passing calibration proves the rules-as-written yield the market's
  real outcome **on the tested scenarios**. It does not certify the market
  itself, the rules' completeness, or any future resolution.
- A matching source check proves the submitted rules text appears verbatim
  in the fetched market record. It does not prove the market's rules are
  fair, complete, or correctly applied by the market itself, and it does
  not prove the scenario facts happened off-chain (the scenario facts are
  author assertions, checked against the public record by the reader, not
  by the contract).
- The published outcome is deliberately withheld from the model, so the
  test cannot be passed by copying the market's result. But the model's
  background knowledge of famous markets cannot be fully excluded; the
  scenarios are written so the verdict follows mechanically from the
  stated facts and the quoted rule.

## Boundaries
- Source URLs are allowlisted to `gamma-api.polymarket.com/markets/` and
  `polymarket.com/event/` (https only). Any other host is rejected before
  any fetch.
- Validators agree on the SHA-256 of the extracted source text (the
  decoded JSON `description` field, or the raw body for non-JSON pages),
  not the raw body, so volatile API fields cannot break agreement.
- Two temporary zero-value wallets (A and B) ran the evidence; no real
  funds, no payments. v1's evidence used one wallet; this run splits the
  journey across two.
- The frontend is bilingual (EN/中文 toggle, all UI strings); on-chain
  values stay English. Not tested by the builder: real OKX wallet write
  path, mobile 375px.
