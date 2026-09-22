# Devpost copy

> Editorial note — not part of the submission: this copy describes the target final build. Reconcile every functional claim using [the control sheet](README.md) before publishing. Add only verified demo/video URLs and eligible human team members. No pilot, customer or measured benefit is claimed.

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

The demonstration follows one complete lot: register its mass and measured moisture, review a weather-informed plan, assign work, record completion, take another moisture reading and inspect the resulting ledger.

Storage-review eligibility depends on a recent recorded moisture measurement at or below the configured target. Completing a task or receiving a favourable weather recommendation cannot certify a lot. Moisture alone also does not establish that grain is toxin-free or satisfies every buyer's quality requirements.

## How we use JKUAT Conduit data

Conduit is part of the decision pipeline. The application ingests supplied observations, validates the usable variables and timestamps, and uses them to inform the drying workflow. Historical replay lets a judge inspect the same sequence repeatedly without waiting for suitable weather.

The replay is visibly historical. It is not presented as a live station feed or as a current warning. The station represents conditions at JKUAT; it is not a measurement of every yard in Kenya. Missing or stale evidence should remain visible instead of being silently replaced with invented readings.

The other inputs are operational: lot mass, actual moisture-meter readings, target moisture, available capacity and handling records. In the demo, these lot inputs are examples entered to exercise the workflow, not claimed field measurements.

## How it is built

Kavu uses React and TypeScript for the interface, an Express API and SQLite for the server application, and shared decision logic for the operational workflow. The server supports account-based workspaces; the static demonstration stores its separate example workspace in the browser. Those modes are identified so a public demo cannot be mistaken for a private production account.

The engineering focus is an integrated pipeline with explicit units and decision reasons, capacity constraints, persistent task and moisture histories, and reproducible checks. Docker provides a self-hosting path. Runtime recommendations do not require a paid language-model API.

The operational logic is explainable decision support. We do not claim to have trained or validated a grain-quality, weather-prediction or aflatoxin model.

## A commercial model worth testing

The first prospective customer is a cooperative or aggregation yard that already dries maize and uses a moisture meter. The supervisor is the daily user; many farmers can benefit without each paying for another app.

Our starting pricing hypothesis is **KSh 2,500 per active month per site**, to test in a bounded pilot. It is not a validated price or current revenue. The product must earn that fee through clearer handovers, less recordkeeping and demonstrable operational value. Support, onboarding, seasonal demand and infrastructure costs all belong in the business case.

NCPB's published tonne-based tariff gives a useful reference. For a demonstration lot of 5,000 kg, a recorded drop from 17% to 15% corresponds to **KSh 3,778 of drying-tariff equivalent**. That is a transparent comparison, not money we claim to have saved. It excludes labour, transport, handling costs and causal attribution.

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

## Links to fill from verified results

- Repository: https://github.com/shi1720/Hack-The-Weather
- Working public demonstration: pending actual deployment link.
- Demonstration video: pending human recording and upload.

Do not paste the two pending lines into a submitted link field.
