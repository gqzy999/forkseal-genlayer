# ForkSeal

Primary category: Prediction Markets

## Short description

A boundary-case regression workbench for prediction-market rules. GenLayer independently interprets hypothetical scenarios; immutable revisions preserve the same suite, and only a fully matching test can be sealed.

## Problem and workflow

A rule author may intend cancellation to mean VOID while the written fallback actually says NO. ForkSeal makes that expectation explicit and checks it before anyone relies on the rules. A creator submits a binary question, rules and 2–4 hypothetical cases, reviews consensus outcomes, revises rules against the unchanged suite and seals a passing result.

## Why GenLayer

Validators independently interpret each scenario without seeing the expected answers. Exact outcome-category agreement becomes contract state. Deterministic code compares actual versus expected, records changes across fixed-suite revisions and prevents sealing on any ambiguity or mismatch. The frontend calls the deployed contract and tracks finalized transactions.

## Continued use

Creators can test cancellation, postponement, draft publication, source priority and correction clauses for each new question. The same suite stays fixed across rule revisions. Every test and its parent remain inspectable. A pass covers the submitted suite only; it does not certify exhaustive clarity or resolve a real market.

## Scope

ForkSeal includes a working browser application and its complete Intelligent Contract. Hypothetical scenario facts and signed rules are the inputs. The application tests written rules; it does not verify live events, operate a trading market, hold funds or execute payments.

Logo: `public/forkseal-logo-1024.png` (1024×1024 PNG).
