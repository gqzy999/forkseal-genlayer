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

Browser QA covers the authored mode switch and case-repair interaction. Live browser readback is checked separately. The real full-consensus write lifecycle used the pinned JS SDK with a temporary account, not an injected extension. Mobile wallets and external wallet signing have not been verified. Local tests use a mocked host and do not substitute for live consensus.
