# Judge Q&A and founder cheat sheet

Use these as accurate answer patterns, not a substitute for knowing the final build. Verify feature and test claims against the submitted commit. The [control sheet](README.md) lists outstanding reconciliation work; the [research memo](../research/market-and-evidence.md) contains exact evidence links.

## The answer to remember

**Kavu helps a maize-yard supervisor turn environmental evidence into assigned work, then checks the result with a new moisture reading. The commercial value is accountable handling and decision records; the ledger reports a transparent tariff equivalent, not invented savings.**

## Product and customer questions

### What problem do you solve?

“A supervisor has several lots, limited drying space and people to coordinate. Weather information alone does not assign, complete or hand over the work. Kavu connects the next drying action to the lot and preserves the measurement afterward.”

### Who uses it, and who pays?

“The supervisor or clerk at a maize cooperative or aggregation yard uses it. The organization is the prospective buyer. We are testing that buyer hypothesis; we do not have paying customers. This avoids asking every smallholder to buy a separate app.”

### Why would someone pay instead of using a weather app and a notebook?

“That combination is our real incumbent. Kavu has to make assignments, handovers and lot records easier enough to justify its price. If customers cannot identify that value, the product does not have a business case. We propose testing it in a supervised pilot before treating the price as validated.”

### Is KSh 2,500 the proven price?

“No. It is a starting hypothesis per active month per site. The full economics depend on seasonal use, support, onboarding, customer acquisition and infrastructure. We need evidence that the operator uses the workflow and the buyer will renew at an agreed price.”

### What is the moat?

“There is no established moat today. A future advantage could be a permissioned dataset pairing weather, lot measurements, handling actions and actual costs, plus a workflow integrated into daily operations. Public weather data and generic AI are not our moat.”

### Do you replace moisture meters or mechanical dryers?

“No. We rely on measured moisture and complement existing equipment. A dryer is one possible operational choice. Kavu helps organize the decision and record its outcome.”

## Data and technical questions

### Where is the meaningful Conduit use?

“Conduit observations inform the environmental part of the recommendation, with timestamp and quality information. They are traceable through the replay. Removing them removes that source of environmental evidence; the system should then say evidence is unavailable, while retaining manual lot records.”

Show the actual provenance panel and one recommendation whose reasons refer to usable source variables. Do not claim every piece of software stops working without Conduit; the manual recordkeeping functions can still exist.

### Are these current conditions?

“The judged demonstration is a historical replay of supplied observations, clearly dated. It demonstrates the pipeline reproducibly. It is not a current warning. A live operational installation needs an authorized, maintained feed and freshness checks.”

### Can one station serve every farm in Kenya?

“No. The station represents its location and nearby relevance must be validated. Expansion needs other stations or appropriate external data and local evaluation. We do not turn a single station into fictional county-wide measurements.”

### Are you forecasting rain?

“An observation is not a forecast. The replay uses historical environmental evidence. Kavu does not claim a trained rainfall-prediction model. Any future forecast adapter needs its own provenance, issue time, evaluation and licensing; we would not disguise it as a station observation.”

If a forecast feature is added before submission, replace this answer with its verified implementation and limits. Never evaluate a historical decision using information that became available after that decision.

### Why no machine-learning model?

“We have environmental observations, but not a labeled dataset of lot outcomes that validates grain drying or food quality. Explainable rules are appropriate for this operational workflow. The important engineering is to use evidence correctly, constrain the plan and keep a measurable loop. A model can be evaluated later when outcomes exist.”

### Is atmospheric humidity the same as grain moisture?

“No. Relative humidity describes the air. Grain moisture requires an actual measurement and appropriate sampling. We use weather to support actions, and measured moisture to determine whether the lot meets the configured moisture target for review.”

### How do you handle bad data?

“The application should expose missing, stale or invalid evidence and avoid giving a false impression of certainty. Each recommendation needs understandable reasons and source times. We demonstrate the specific implemented quality gates and failure cases from the test report.”

Do not recite gates that the final implementation lacks. If a raw sensor field has ambiguous units, quarantine it or explain the documented mapping; do not quietly assume a conversion. Uncalibrated light counts must not be described as irradiance in watts per square metre.

### What makes the plan capacity-aware?

“A supervisor configures capacity. The proposed plan must not allocate more mass to the yard than that limit. Remaining lots stay unassigned or receive another action, with the constraint explained.”

Demonstrate an overloaded yard. Know the unit used by the final product—kilograms, area, or slots—and do not interchange them. A mass capacity is a user-entered operational assumption, not a calibrated physical drying-area model.

### How are accounts and data protected?

“The server application has private account workspaces; the browser demo is a separate local demonstration mode. We verify server-side ownership rather than relying on the interface to hide other users' records.”

Before using this answer, inspect the final authentication flow, password hashing, cookie settings, rate limits and cross-account tests. Do not claim external penetration testing, formal certification, encryption properties or multi-region reliability that have not been implemented and checked.

### Can it run cheaply?

“The core recommendation logic does not need a paid LLM call. A self-hosted deployment uses the server and SQLite. But infrastructure, backups, support and maintenance still cost money. We keep those assumptions separate from a claim that the business is profitable.”

### What did you test?

“Let me show the actual results for this commit.”

Then show the final test report or CI. Prioritize the integrated journey, authentication/ownership, capacity overflow, stale or invalid inputs, persistence and moisture-accounting edge cases. State the passed count only from the actual run. A test count is not field validation.

## Impact and evidence questions

### Have you reduced food loss or saved farmers money?

“We have not established that in the field. The build demonstrates decision and recordkeeping functionality. The proposed pilot measures operational use, moisture rechecks and actual costs. Any claim of attributable loss reduction needs an appropriate comparison and more evidence.”

### What exactly does KSh 3,778 mean?

“For the example 5,000 kg lot, a two-percentage-point moisture reduction multiplied by the reference tariff of KSh 377.80 per tonne per point gives KSh 3,778. That is a drying-tariff equivalent. It excludes handling, labour and transport, and does not prove the alternative would actually have cost that amount.”

Know the calculation: `5,000 ÷ 1,000 × 2 × 377.80 = 3,778`. The application's basis must match the spoken example. A reading from 17% to 15% is a fall of **two percentage points**, not “two percent less moisture” in the relative sense.

### How do you avoid counting the same benefit twice?

“The ledger must have a documented moisture baseline and count a given reduction only once. Repeating a reading or receiving a higher reading must not manufacture a new positive value. We exercise those cases in the accounting tests.”

Confirm the exact baseline convention in the final engine before explaining it. If the code sums all downward steps after rewetting, the ledger can overstate progress; that needs correction or an explicit different label before publication.

### Does the storage badge mean safe to eat?

“No. It means the recent recorded measurement meets the configured moisture condition for storage review. It is not a toxin test, quality certificate or proof that sampling was representative. Buyer and laboratory requirements remain separate.”

### How will the pilot work?

“Start with observing actual work and checking the sampling and recordkeeping process. Run recommendations in shadow mode with the supervisor. Then test task coordination under supervision and record usage, overrides, moisture rechecks, time and receipts. Do not abandon existing protective practices to create a comparison.”

### Why is this relevant to climate action?

“Variable environmental conditions change when drying work is useful or needs protection. Kavu helps operators act on those conditions and creates records for evaluating better handling. Climate and food-loss benefits are potential outcomes to test, not numbers we infer from a dashboard.”

## Authorship and implementation ownership

### What did you personally contribute?

“I set the product direction, the commercial and usability priorities, the quality bar and the constraints. OpenAI Codex assisted with research, engineering, tests and documentation. I will describe any further review or implementation work I actually completed accurately.”

Before presenting, replace the final sentence with completed human contributions, if any. Do not say “I reviewed every line,” “we interviewed farmers” or “our team tested at a cooperative” unless it happened. Learn the system well enough to demonstrate and explain it.

### Is it production-ready?

“Deployment readiness and operational validation are different. We can show the implemented deployment, account isolation and tests. We have not demonstrated production reliability at customer scale or field-validated agronomic outcomes. The next step is a supervised pilot with operational monitoring and feedback.”

## Five things to know without notes

1. The exact Conduit source, date range, station location and historical/live mode of the demo.
2. Which inputs actually affect each recommendation, which thresholds are policy choices and what missing data does.
3. Why moisture is measured separately, how freshness is evaluated and what the storage-review label means.
4. The tariff formula, baseline convention, costs it excludes and why its result is not savings.
5. How a task and moisture reading move through the UI, API and database, including account ownership and local-demo behavior.

## Avoid these phrases

| Avoid | Say instead |
|---|---|
| “We saved KSh 3,778” | “This example represents KSh 3,778 of drying-tariff equivalent” |
| “AI predicts when maize is safe” | “Environmental evidence informs actions; recorded moisture supports storage review” |
| “Live data” during a historical replay | “Historical Conduit replay, dated on screen” |
| “Customers love it” | “Customer discovery and a supervised pilot are the next step” |
| “Our verified 80% margin” | “Illustrative operating assumptions, before sales, onboarding and founder pay” |
| “It works everywhere in Kenya” | “The initial use case is around the station's relevant area” |
| “A production-proven platform” | “An integrated build with stated tests and deployment support” |
