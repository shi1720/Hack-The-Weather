# Skeptical judge and product QA review

**Earlier checkpoint:** this document preserves the initial review and its first closure. The newer [version 2 review](judging-v2.md) tracks the live Firebase Hosting, Cloud Run and Firestore release at [kavu-drying.web.app](https://kavu-drying.web.app/). Statements below about an unprovisioned public backend describe the earlier checkpoint.

**Review date:** 22 September 2026. **Scope:** current application, server, decision engine, source data, evaluation, submission copy and local browser experience. The README, pitch assets and public deployment were still being finalized during this review. This is an internal adversarial review, not an organizer's assessment or a prediction of ranking. The reviewing agent previously contributed the data/decision engine, so this is a separate critical review pass, not an externally independent audit.

**Verdict:** Kavu is a coherent working product demonstration with a specific operator and a real decision pipeline. It has substantially stronger engineering and evidence discipline than a weather chart with an AI narrative. The current weakness is proof of operational and commercial value: the proposed buyer has not been interviewed, the rules have not been calibrated against grain outcomes, and the public preview does not demonstrate the full server deployment. Several small handover and presentation defects can undermine the otherwise credible story and should be fixed before recording.

## Conservative rubric assessment

Scores reflect what could be substantiated during this review, before the final fixes and public deployment. They are deliberately not a promotional self-rating.

| Criterion | Assessment | Supplied overview weighting | Detailed live rules weighting |
| --- | --- | ---: | ---: |
| Problem and relevance | Clear maize-yard supervisor, limited space, measured moisture and an existing paid drying alternative. KALRO/NCPB sources make the problem credible. No direct operator discovery or evidence of the local frequency/cost of the proposed failure yet. | **17 / 20** | **17 / 20** |
| Innovation and creativity | Connecting weather to a capacity-constrained job, meter reading and cost record is a useful distinction from a forecast screen. The rules and task system are conventional, and no proprietary advantage or unique market position is established. The choice to avoid unjustified ML is appropriate and earns no penalty. | **14 / 20** | **14 / 20** |
| Technical implementation and Conduit use | Actual deduplicated observations, explicit gaps, explainable allocation, authenticated persistent workspaces, validation, isolation, reproducible ablation and passing browser flows. Deductions for handover defects, no independently operated public server, and incomplete operational features rather than missing AI complexity. | **21 / 25** | **21 / 25** |
| Scalability and future potential | A focused cooperative buyer, configurable site, no paid LLM dependency and a concrete deployment path. Pricing/support assumptions, seasonal demand, one-owner workspaces, limited station coverage and lack of automatic current Conduit ingestion remain material constraints. | **13 / 20** | **6.5 / 10** |
| Climate, environmental and social impact | A plausible pathway to better handling and accountable moisture checks, with honest metrics and a proposed pilot. No field beneficiaries, losses avoided, energy effects, adoption or willingness to pay have been measured. | **9 / 15** | **15 / 25** |
| **Total** | Internal assessment of present evidence, not expected judge result. | **74 / 100** | **73.5 / 100** |

The [detailed official rules](https://hack-the-weather.devpost.com/rules), checked on the review date, give impact 25% and scalability 10%; the overview supplied to the project gives 15% and 20%. The project should satisfy both, while emphasizing the evidence-to-action chain under the detailed rules. Improving a pitch cannot substitute for missing customer or field evidence; modest technical and clarity gains are realistic before submission.

## What was actually verified

- `npm test`: **98 tests passed across four files** at this review checkpoint. Counts may increase as reported defects receive regression tests.
- `npm run test:e2e`: **four Chromium browser tests passed**: real replay changes and job-to-measurement workflow; registration/logout/login persistence; mobile layout and capacity controls; automated serious/critical accessibility checks on welcome and overview.
- `npm run build`: TypeScript and Vite production build passed.
- `npm run evaluate`: controlled evidence invariants passed. Same fictional inventory, capacity and deadline inputs allocate **2,700 kg** under September 12 weather and **zero** under September 15, a real gap day, and an ablated weather source. This is functional dependence on Conduit, not forecasting accuracy or demonstrated economic impact.
- Viewed the supplied overview screenshot. The hierarchy, typography, source-mode banner, dense-but-readable batch table and distinct task/cost regions are coherent. Mobile horizontal overflow was also covered by the browser suite. Visual polish is a strength; decorative redesign is not a priority.
- Ran additional local browser checks with an isolated QA demonstration tenant. They reproduced missing-day rainfall being displayed as zero and a copied brief mixing two replay dates. A 22% moisture batch was correctly promoted to the priority card after the implementation owner's concurrent correction.
- Reproduced a stale dryer task changing a verified-ready batch back to drying in the reducer. The server owner acknowledged it and is changing completion to a manual-referral record, without implying a booking or physical drying start. That fix requires its regression test before this finding is closed.

## Five highest-value fixes before submission

### 1. Rehearse one physically feasible lot journey, then show the weather counterfactual

**Finding:** the reviewed [video script](../submission/video-script.md) creates a 5,000 kg lot in a default 3,000 kg yard, then moves into spreading/turning language. The planner correctly will not allocate that whole lot. Completing an unrelated seed lot while narrating the new lot would make the demonstration hard to trust.

**Fix:** use the seeded 1,800 kg Mavuno A-01 from beginning to end, or specify and rehearse a capacity/queue setup that can genuinely handle the new lot. Keep every displayed number in the script, recording and deck aligned. For A-01, 18.2% to 15.0% gives KES **2,176.13** of tariff equivalent at the default rate; further measurements change that figure. Before discussing price, show September 12 versus September 15 and then the missing-data date. That ten-second contrast explains why Conduit matters better than a list of sensors.

**Acceptance:** start from a clean demo, follow the script verbatim, and confirm that the same lot appears in its allocated task, completed action, new measurement and ledger. No hidden setup or invented outcome.

### 2. Keep the operator brief scoped to its actual date and weather source

**Finding:** after committing September 12 and September 15 plans, “Copy brief” labeled the entire output **Tuesday 15 September · historical replay** but included September 12 spread/turn jobs at 11:00/14:00 alongside September 15 dryer referrals. It selected all pending tasks rather than tasks for the selected plan. The on-screen tasks have dates, but the copied handover loses them. Mixing replay and forecast jobs creates the same problem.

**Evidence:** [Yard view](../../src/pages/Yard.tsx), `copy()` and brief preview; reproduced with the local browser clipboard.

**Fix:** filter brief tasks to the selected plan date and mode, order by due time, preserve the mode on every exported/printed brief, and clearly label any intentionally included cross-day tasks with their own date. Ensure the printed output follows the same scope. Old tasks may remain in an explicitly historical task list; they must not become today's instructions through formatting.

**Acceptance:** create plans for two days and both modes, then copy/print either selected plan. Its output contains only correctly dated and sourced instructions.

### 3. Complete the stale-task audit without inventing a dryer booking

**Finding:** a pending dryer task could still be completed after a fresh low moisture reading and a ready status; it changed the batch to `drying`/`Mechanical dryer`. The task itself is only a referral recommendation, so that state also overstated what the system knows. The application does not book a dryer or verify that physical drying has begun.

**Evidence:** [workspace reducer](../../src/shared/workspace.ts), `task.complete`; local reproduction: generate a September 15 plan → record 12.7% → mark ready → complete earlier dryer task; observed ready → drying.

**Fix:** reject stale referrals for ready/at-target/already-mechanical grain. Record an operator's manual referral follow-up without changing physical location, moisture or occupancy unless there is a separate explicit confirmation of the actual physical event. Retain task audit information. The server owner is implementing this change.

**Acceptance:** a regression test proves old referrals cannot downgrade readiness, free occupied space or imply a booking. A normal referral completion leaves moisture and physical state unchanged and names exactly what was recorded.

### 4. Align visible source and capacity labels with the engine's conservative rules

**Findings:** an entirely missing day showed “0 mm reported rain” because the UI summed `null` as zero. The data page names both gauges as decision inputs although the engine intentionally uses only Gauge 1. The yard view counted mechanical-dryer batches in its outdoor weight and could draw them as outdoor bays. The schematic showed only four active lots without an overflow indication.

**Evidence:** [Overview](../../src/pages/Overview.tsx), [Data & settings](../../src/pages/Data.tsx), [Yard](../../src/pages/Yard.tsx), [YardMap](../../src/components/YardMap.tsx). The missing-day rain defect was reproduced in the browser. The priority card's earlier preference for a routine spread over a more urgent recommendation was corrected during review and the 22% example was subsequently verified in the browser.

**Fix:** display unavailable rainfall when no rain observations exist, and distinguish partial recorded totals from full coverage; label Gauge 1 as the decision source and Gauge 2 as unused; count/display outdoor, covered and mechanical states separately; make an illustrative four-bay limit explicit or expose remaining lots. Preserve the engine's priority order. In live mode, label its metric “upcoming suitable hours”, since elapsed hours are excluded.

**Acceptance:** gap-day, high-moisture, mechanical-dryer and five-active-lot fixtures have consistent numbers and language across overview, yard, plan and data pages.

### 5. Finish a verifiable judge path and narrow the commercial promise to the implemented workflow

**Finding:** local server accounts work, but no permanent public backend was provisioned at review time. A static preview is a legitimate working demonstration but does not offer private server accounts, shared operators or live forecasts. Current task copy also says completion records “who acted”; the persisted audit has action/time/detail and one account owner, with no individual operator identity or assignee field.

**Fix:** deploy and test the public preview signed out, label its limitations immediately, and keep unavailable live functions from looking like broken primary features. Demonstrate the real server authentication/persistence path in the recording or an unambiguous reproducible setup. Describe the present buyer journey as **one supervisor creating work and sharing a brief through the team's existing channel**. Do not claim in-app multi-operator assignment, actor attribution, automatic alerts or a connected dryer network. Keep the KSh 2,500 active-month price an experiment, with a concrete renewal criterion and the full support/onboarding assumptions beside it.

**Acceptance:** a judge can reach the public app from the final repository and Devpost links, complete the static workflow with no account, understand what is local, and reproduce the actual account server from the README. The deck and narration describe exactly that product. Team collaboration, adoption and willingness to pay are explicitly next-stage evidence.

## Scientific and commercial questions the presenter must answer

**Why those thresholds?** The RH/VPD and two-hour window thresholds are conservative operating hypotheses. FAO supports the atmospheric equation, not these grain-drying cutoffs. There is no trained moisture-response model, local threshold validation or claim of grain safety. This is a reasonable prototype boundary, but meaningful supervised operator testing is still required.

**Why can you plan from historical data?** The replay is retrospective, and its weather would not all have been known at the time. It demonstrates decisions and handling records, not foresight. Live model guidance is separate and the archived Conduit record does not calibrate it. Explain that difference before being asked.

**Why pay instead of using a notebook and a forecast?** The hypothesis is fewer ambiguous handovers and a recoverable lot history. Present the strongest currently demonstrable difference: one measured lot, limited space, explicit action and traceable follow-up. The financial equivalent is not ROI, and it is not a substitute for measuring staff time, costs or willingness to renew.

**Where could it first work?** A yard with a moisture meter and a supervisor near a relevant reference source. One station and a distance radius do not establish countrywide usefulness. Permission for ongoing Conduit access, local representativeness, data terms and site onboarding need resolution before a commercial rollout.

**What environmental impact is plausible?** Better scheduling and measurement could improve post-harvest handling, but Kavu has not measured food saved or energy reduced. Do not convert water lost from grain into “food saved”, assume sun drying has zero cost, or apply unverified national loss percentages to the demo.

## Submission gates separate from product scoring

The detailed rules require a real 2–5-person team, an accessible 3–5 minute operating demonstration with team members appearing, repository/README and Devpost information. These are eligibility/completeness gates, not points that attractive software can compensate for. The current detailed rules state ages **18–35** and explicitly allow non-students, while the overview/user-provided copy says students. Correct the human handoff to flag that discrepancy and follow confirmed organizer requirements; do not fabricate participant eligibility or contributions. [Official rules, checked 22 September 2026](https://hack-the-weather.devpost.com/rules)

No public URL, final video, team composition, customer, field trial or production reliability should be marked verified solely because a document describes it. Update the submission control sheet from actual final evidence and retain the bounded test/evaluation claims above.

## Final closure addendum :  22 September 2026

This addendum reconciles the review with the delivered build. It preserves the scores and findings above as the earlier checkpoint; it does not inflate the score after fixes or pretend to be a new independent evaluation. The editorial reviewer inspected the changed source, regression tests, browser run status and submission materials. Final suite, Docker and public-site results below were reported by the implementation owner; the editorial reviewer did not rerun those complete suites.

### Disposition of the five findings

| Finding | Final disposition and evidence |
| --- | --- |
| Feasible single-lot demonstration | **Closed for the prepared screen asset.** The [4:25 actual recording](../../output/kavu-demo-silent.mp4) follows Mavuno A-01, 1,800 kg at 18.2%, through plan, spread, turn, an illustrative 15.0% reading and KSh 2,176 tariff equivalent. It shows the September 8 gap and September 15 humid contrast, then a separate 12.7% reading and readiness confirmation. [Recording provenance and exact timings](../submission/recording-notes.md) distinguish the real application capture from labelled explanatory cards. Real voice/camera and an accessible final upload remain human work. |
| Cross-date handover | **Closed in source and browser regression.** [Yard.tsx](../../src/pages/Yard.tsx) scopes tasks by both selected mode and date, sorts due times, and applies that selection to task display, copied text and brief preview. The [fifth browser test](../../tests/e2e/app.spec.ts) creates September 12 and 15 plans and checks the copied briefs remain separate with the historical label. The mode filter is inspected in source; this is not a claim that every forecast/replay combination was separately exercised in the browser. |
| Stale dryer referral | **Closed in reducer and regression.** [workspace.ts](../../src/shared/workspace.ts) rejects referrals that became inappropriate after an at-target reading, ready status or mechanical-dryer state. A normal completion records manual referral follow-up without claiming a booking or altering physical location, moisture or occupancy. [Workspace tests](../../tests/workspace.test.ts) cover the unchanged normal state and rejection after readiness. |
| Source and capacity labels | **Implemented; source and targeted browser checks reviewed.** [Overview](../../src/pages/Overview.tsx) distinguishes missing/partial rainfall from a recorded total. [Data](../../src/pages/Data.tsx) names Gauge 1 and explicitly excludes Gauge 2. [Yard](../../src/pages/Yard.tsx) excludes mechanical drying from outdoor occupancy; [YardMap](../../src/components/YardMap.tsx) displays all active outdoor lots and labels its schematic. Missing rainfall has a browser regression. The five-lot rendering correction was inspected in source, not claimed as an added dedicated fixture test. |
| Public judge path and commercial scope | **Public demonstration delivered; operational limits retained.** The [repository](https://github.com/shi1720/Hack-The-Weather) is public and the [sandbox](https://shi1720.github.io/Hack-The-Weather/) is live. The implementation owner ran the signed-out static smoke against this exact public URL, including offline reload, data-gap gating, plan creation, job completion and persisted state, with no API calls or page errors. The demo identifies its browser-local mode. Private accounts and optional live forecasts belong to the separately supplied server; no permanent full-stack host is claimed. Submission copy describes one supervisor creating jobs and sharing a brief, without individual assignees or automated messages. |

### Final software and artifact evidence

- **103 unit/API tests and five Chromium browser tests passed** at this checkpoint. The browser suite includes authentication, persistence, password change through Account settings, the task/measurement flow, mobile layout, missing rain and brief scoping. Automated serious/critical accessibility checks passed on welcome and overview; the implementation owner also reported zero serious/critical findings in manual browser axe runs of Drying yard, Batches, Impact and Data. This is bounded automated coverage, not a complete accessibility certification.
- [GitHub Actions run 35688453407](https://github.com/shi1720/Hack-The-Weather/actions/runs/35688453407) passed verification and publication. Its Docker smoke built the production image and checked a non-root, read-only startup and health response. This was verified in GitHub CI, not an assertion about a local Docker daemon or a permanent production deployment.
- The [static smoke script](../../scripts/smoke-static.mjs) passed both against the built local site and the public URL. Offline use requires a successful initial load and retained browser storage. Server accounts are not offline collaborative workspaces.
- The controlled [Conduit evaluation](../evaluation.md) remains a deterministic software experiment: the same fictional inventory and deadlines yield 2,700 kg outdoors under September 12 conditions and zero under humid/missing weather. It supplies no measured farm or climate outcome.
- The [editable deck](../../output/kavu-pitch.pptx) and [four-page brief](../../output/pdf/kavu-brief.pdf) were rendered and visually checked. The silent MP4 was inspected and verified as 265 seconds, 1920×1080 H.264 with no audio. These artifacts exist; the final narrated team video does not yet exist.

### Genuine limitations that remain

There are no operator interviews, pilot partners, paying customers, measured labour savings, avoided grain losses, energy results or willingness-to-renew evidence. KSh 2,500 per active month remains a pricing hypothesis. The tariff ledger compares intake and latest target gaps using recorded intake mass; it is not realised savings, a moisture-loss mass balance or causal impact. The published NCPB rate does not establish a current quote or dryer availability.

RH/VPD thresholds, the two-hour window and the 13% operating target need local domain validation. A current meter reading is necessary for the implemented readiness gate but cannot establish sampling quality, food safety or aflatoxin status. Historical replay uses full-day observations retrospectively. One station and a short, gapped record do not establish nationwide coverage, a trained moisture model or forecast skill. Ongoing station-feed access and commercial data terms need resolution for a real service.

The authenticated server is self-hostable; production hosting, TLS/domain operation, monitoring, backup restore drills, privacy and support procedures remain deployment responsibilities. The current workspace has one account owner and no separate operator identity or permissions. Password change is implemented, but email verification, self-service password recovery, MFA, account-deletion UI and an administrative console are not. Software tests and a container health check do not establish customer-scale reliability or an external security audit.

The honest readiness description is **a working, tested and publicly demonstrable build prepared for a supervised pilot**. The final submission still needs 2–5 real eligible human participants, their accurate contributions, real narration and camera appearances, an accessible final video, and Devpost submission. The eligibility wording conflict remains recorded in the [human handoff](../submission/human-handoff.md). The directly checked deadline is **26 September 2026 at 02:15 IST / 25 September at 23:45 EAT**. These gates cannot be substituted by the deck, test count or a favourable internal score.
