# Devpost copy

> Editorial note — not part of the submission: this copy has been reconciled with the delivered implementation on 22 September 2026. Check the public launch and CI status in [the control sheet](README.md), then add the final accessible narrated video and eligible human team members. The silent recording is an editing asset, not the final submission video. No pilot, customer or measured benefit is claimed.

## Project name

Kavu

## Short description

A drying operations desk that turns JKUAT Conduit weather data into maize-yard tasks, measured moisture records and transparent drying-cost comparisons.

## One-line pitch

Turn a drying window into a completed, measured job.

## Inspiration

A weather reading does not cover a pile of maize. A person does.

For a maize cooperative, the useful question is what the yard team should do next: spread this lot, turn it, cover it, check its moisture, or look for a mechanical dryer. A missed handover can matter as much as a missed forecast.

We chose this problem because it connects environmental data to a specific operator, a repeated decision and an existing paid service. KALRO's training manual connects drying, storage and moisture-meter use. NCPB already charges for grain drying. Kavu connects those two realities with a record of what happened to each lot.

## What it does

Kavu gives a maize-yard supervisor five connected views:

- **Overview:** the next operational decision, the current data mode and the evidence behind the recommendation.
- **Drying yard:** a plan constrained by available yard capacity, with operator tasks that can be committed and completed.
- **Batches:** lot intake, measured moisture readings and the history of handling actions.
- **Impact ledger:** an explicitly labeled drying-tariff equivalent of recorded moisture reduction, with its assumptions visible.
- **Data & settings:** Conduit provenance, timestamps, quality information and operational parameters.

The demonstration follows one complete seeded lot: inspect its intake mass and moisture, review a weather-informed plan, create jobs, record completion, enter another example moisture reading and inspect the resulting ledger. A supervisor can copy a date-specific brief into the team's existing communication channel. Kavu does not send messages or assign individual operator accounts.

Storage-review eligibility depends on a recent recorded moisture measurement at or below the configured target. Completing a task or receiving a favourable weather recommendation cannot certify a lot. Moisture alone also does not establish that grain is toxin-free or satisfies every buyer's quality requirements.

## How we use JKUAT Conduit data

Conduit is part of the decision pipeline. The application prepares **18,364 unique observations**, removing **2,825 overlapping rows** from the supplied station exports and retaining original source hashes. It validates usable variables and timestamps, and uses temperature, humidity and the primary rain gauge in the drying rules. Wind is displayed as additional context. Ambiguous light counts are not converted into solar irradiance; the second rain gauge is excluded.

A controlled software evaluation holds the fictional lots, deadlines, capacity and planning date fixed, substituting weather from different dates while preserving its time of day. September 12 observations allocate **2,700 kg** to a **3,000 kg** yard; September 15's humid observations or the September 8 data gap allocate **zero** outdoors. The workflow changes when the environmental evidence changes. This proves functional use of the dataset, not drying effectiveness or forecast accuracy.

The replay is visibly historical and uses observed weather retrospectively. It is not a live station feed, a current warning or a claim that the full day's conditions were known in advance. The station represents conditions at JKUAT; it is not a measurement of every yard in Kenya. Missing or stale evidence stays visible instead of being replaced with invented readings.

The other inputs are operational: lot mass, actual moisture-meter readings, target moisture, available capacity and handling records. In the demo, these lot inputs are examples entered to exercise the workflow, not claimed field measurements.

## How it is built

Kavu uses React and TypeScript for the interface, an Express API and SQLite for the server application, and shared decision logic for the operational workflow. The server supports private account workspaces, registration, sign-in and password change. Its optional MET Norway forecast adapter is separately attributed and gated by freshness; historical Conduit observations do not calibrate that forecast.

The public static demonstration stores its separate example workspace in the browser and supports offline use after a successful first load. It offers no server account or live forecast. The authenticated server is available through documented self-hosting and Docker; we do not claim a permanent public full-stack host.

The engineering focus is an integrated pipeline with explicit units and decision reasons, capacity constraints, persistent task and moisture histories, and reproducible checks. At the reconciled checkpoint, **103 unit/API tests and five browser tests passed**, including account isolation, task-to-measurement flow, date-scoped handovers, mobile layout and automated serious/critical accessibility checks. A built-sandbox smoke also passed offline reload, missing-data gating, task completion and persistence. These are software checks, not field validation. Runtime recommendations do not require a paid language-model API.

The operational logic is explainable decision support. We do not claim to have trained or validated a grain-quality, weather-prediction or aflatoxin model.

## A commercial model worth testing

The first prospective customer is a cooperative or aggregation yard that already dries maize and uses a moisture meter. The supervisor is the daily user; many farmers can benefit without each paying for another app.

Our starting pricing hypothesis is **KSh 2,500 per active month per site**, to test in a bounded pilot. It is not a validated price or current revenue. The product must earn that fee through clearer handovers, less recordkeeping and demonstrable operational value. Support, onboarding, seasonal demand and infrastructure costs all belong in the business case.

NCPB's published tonne-based tariff gives a useful reference. In the demonstration, a seeded **1,800 kg** lot moves from an example **18.2%** reading to **15.0%**. At **KSh 377.80 per tonne per moisture percentage point**, that is **KSh 2,176.128**, displayed rounded to **KSh 2,176 of drying-tariff equivalent**. That is a transparent comparison, not money we claim to have saved. It excludes labour, transport, handling costs and causal attribution.

A future advantage could come from permissioned lot histories linking weather, actions, moisture and actual costs. Today that is a hypothesis, not an established moat.

## What makes it different

Kavu closes the loop between an observation and a completed job. The important output is a lot history that a supervisor can explain: the evidence available, the decision made, the action taken, the new measurement and the cost basis.

It complements existing moisture meters and drying services. It does not ask customers to replace working equipment or accept an unexplained AI score.

## Challenges and learning

The hardest boundary is between a plausible weather-based recommendation and a claim the evidence cannot support. Ambient humidity is not grain moisture. Completed work is not proof of prevented loss. A tariff comparison is not verified savings.

Designing around those distinctions improved the product. It made timestamps, measurements, operator judgment and accounting assumptions part of the main workflow instead of small print.

## What comes next

The next step is a supervised pilot with maize yards near the station's useful coverage area. First, observe current handling and recordkeeping. Then run Kavu in shadow mode, compare recommendations with experienced operators, and only later use it for task coordination.

Measure adoption, handover time, rechecks, rewetting incidents, administrative effort and actual costs. Verify willingness to pay. Expand to more stations only with appropriate local data and validation. No pilot partner or customer is claimed at submission.

## Built with

TypeScript, React, Vite, Node.js, Express, SQLite, Docker, Vitest, Playwright, JKUAT Conduit environmental observations.

## Team and AI assistance

**Shivam Gupta — founder and product lead.** Provided the product direction, quality expectations, commercial focus, constraints and submission goals.

OpenAI Codex assisted with research, software implementation, test development and documentation. The project uses explainable operational logic rather than presenting AI-generated text as environmental evidence. Human team members must be able to explain the submitted implementation. Add any further human engineering or review contributions accurately after they occur.

## Sources

- [JKUAT Conduit platform](https://conduit.jhubafrica.com/)
- [Official hackathon data resources](https://hack-the-weather.devpost.com/resources)
- [KALRO maize post-harvest guidance](https://keep.kalro.org/appfiles/media/vc_files/maize-tot.pdf)
- [NCPB drying service and reference tariff](https://ncpb.co.ke/drying/)
- [Repository evidence and market memo](../research/market-and-evidence.md)

## Project links and final video

- [Public repository](https://github.com/shi1720/Hack-The-Weather)
- [Live browser-local public sandbox](https://shi1720.github.io/Hack-The-Weather/) — verified signed out, including offline reload and persisted job completion after initial online loading.
- Final demonstration video: add the accessible uploaded version after real narration and team appearances are combined with the prepared 4:25 screen recording.

Do not paste the pending video instruction into a submitted link field. The final entry must identify the actual eligible human team.
