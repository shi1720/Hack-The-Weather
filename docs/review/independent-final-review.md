# Independent final review of Kavu

**Review date:** 22 September 2026. **Reviewer:** a separate Codex review agent that did not implement this release. This is an internal independent pass within the same project, not an organizer assessment, a customer evaluation or a prediction of winning.

**Verdict:** Kavu is a credible, well-presented hackathon application with unusually clear separation between observed weather, recorded work and measured grain moisture. Its strongest feature is the complete operational loop, not the weather chart. The inspected release is suitable for supervised evaluation. It is not yet a fully validated commercial service. Two concrete P2 improvements emerged from this review, were fixed by the implementation owners and passed this reviewer's independent verification before source freeze.

## Release-owner verification addendum

After this independent review, the corrected source was deployed as Cloud Run revision `kavu-api-00003-4pb`. The complete default suite passed 112 tests, and all 17 browser tests passed against the final Firebase URL, including the expanded CSV check. GitHub CI for core commit `26a9688` passed its Firestore emulator and Docker checks. These are implementation-owner release checks, not additional runs by the independent reviewer. The narrated demo has been published at [the public YouTube watch page](https://www.youtube.com/watch?v=iyu0CjoYOgM), and the README now links to that video, the final MP4 and its English captions. The original review below remains as the historical record of what was known at review time.

## Evidence and scope

I read the README, final Devpost story, testing instructions, market memo, data methodology, deployment guide, narrated shot plan, pitch-deck text, existing judging review and hosted verification reports. I inspected the decision engine, workspace reducer, account/API protections, forecast adapter, operator interface and impact export. I viewed the final desktop and phone screenshots and the gallery image.

I independently reproduced the same-day task-cycle defect below with the pure reducer and checked-in Conduit dataset, then repeated the scenario after its fix. I inspected the export correction and ran `npx vitest run tests/workspace.test.ts tests/evidence.test.ts`: **30 of 30 focused tests passed**. I did not open authenticated browser sessions or rerun the cloud suite while the final video was being captured. The reported 106 default-suite passes, eight real-Firestore passes and 17 hosted browser passes are the earlier release checkpoint supplied by the implementation owners, not new cloud test runs by this reviewer. The default and Firestore counts overlap in two codec tests and must not be added as independent checks. Final full-suite and redeployment verification must include these late fixes.

The hosted API report now records successful account isolation, revision conflicts, request protections and exact workspace/session persistence across a real Cloud Run deployment. It includes the image digest and safe fixture-cleanup evidence. That is materially stronger than demonstrating that a login screen exists. See [hosted API verification](hosted-api-v2.md) and [hosted release verification](hosted-release-v2.md).

## Indicative rubric assessment

These scores assess the inspected evidence after the two source corrections, with final redeployment and publication checks still to reconcile. A different judge may reasonably weigh the lack of field evidence more heavily. The decimals are arithmetic, not statistical precision.

| Criterion | Indicative rating out of 10 | Reason |
| --- | ---: | --- |
| Problem and relevance | 8.5 | One identifiable buyer, a repeated physical decision and an understandable grain-handling workflow. KALRO guidance and a charged drying service support relevance. No operator interview yet establishes the frequency or cost of the specific coordination problem. |
| Innovation and creativity | 8.0 | The combined capacity, job, meter and cost-record loop is distinctive and easy to demonstrate. Its individual components are established techniques, and the competitive advantage remains a workflow hypothesis. |
| Technical implementation and Conduit use | 8.8 | Real organizer data, explicit gap handling, a shared engine, account isolation, durable cloud state, revision control and substantial regression evidence. The task-cycle and export-basis findings were corrected with focused regressions. Operational and field limitations remain. |
| Climate, environmental and social impact | 7.5 | The application translates data into a concrete human action and records a later measurement. The benefit pathway is coherent. Avoided losses, net savings, energy effects and sustained use are not yet measured. |
| Scalability and future potential | 7.0 | A yard buyer can cover many farmers' lots, the rules avoid a per-decision LLM charge, and deployment is straightforward. Seasonal demand, support cost, data relevance, recovery operations and willingness to pay remain untested. |

Using the user's overview weights of 20/20/25/15/20 produces **80.25 out of 100**, or about **80**. Using the detailed rules' 20/20/25/25/10 produces **80.75 out of 100**, or about **81**. These are indicative internal scores, not official results or calibrated winning odds. The weight conflict is real: the [detailed rules](https://hack-the-weather.devpost.com/rules) put 25% on impact and 10% on scale.

The two bounded software fixes are complete in source. The next immediate improvement is making the final demonstration effortless to access and verifying that the deployed version includes those fixes. Customer and agronomic evidence will require actual participants and field work; better copy cannot manufacture it.

## Findings and resolution

### P2, resolved in source: a second drying cycle on the same day had no new spreading job

**Location:** `src/shared/workspace.ts`, the `plan.commit` task identity and existing-task branch, originally lines 310 to 336.

**Reproduction:** create the seeded workspace, use `public/data/conduit.json` and a demo context with `now = 2026-09-12T09:00:00.000Z`. Commit the September 12 replay plan. Complete Mavuno A-01's spread job, then its shelter job. Build and commit the same day's plan again while the batch still has 18.2% moisture.

**Observed:** the planner recommends `spread`, but the batch remains `covered`, the only spread job is already `done`, the turn and measurement jobs are pending and the shelter job is already `done`. A turn cannot complete while the batch is covered. Fixed task identity `date + mode + batch + action` prevents another work cycle. The real counterpart is a rain interruption followed by a later suitable window.

**Required behavior:** preserve the first cycle's completed evidence, generate a distinct new spread/turn/measurement/shelter cycle after confirmed clearance, and keep an immediate repeated plan commit idempotent. Old pending work from the previous cycle must not compete with the new cycle. Prefix/date parsing and stale-forecast checks must continue to work. The backend owner received this confirmed reproduction and implemented the fix and regression tests described below.

**Resolution independently verified:** per-batch cycle suffixes now distinguish renewed work. My original reproduction produces four fresh pending jobs, preserves the completed first spread/shelter records unchanged, and permits the fresh spread and turn to complete. An immediate repeated commit returns the same workspace object. Four new regressions cover repeated cycles, a forecast rain interruption, shelter before spreading and a manually recorded outdoor return. The complete focused workspace/export run passed 30 tests. Confirm the final hosted revision includes this change.

### P2, resolved in source: exported evidence lacked the full calculation basis

**Location:** `src/pages/Impact.tsx`, `exportLedger`.

The CSV contains intake and current moisture, weight, target, reading count and computed tariff equivalent, but omits the editable tariff rate and the individual measurement table. It uses a display name rather than a stable batch identifier. A later settings change or two identically named lots makes the exported record harder to reconstruct independently. The 500-event audit window is not a substitute for exporting all measurements still retained on the batch.

**Recommended bounded fix:** include export time in UTC, the current rate with its units, a batch-ID column and a separate measurement section containing batch ID/name, reading time in UTC, measured percentage and note. Preserve formula-injection escaping. Add a focused export regression. This strengthens the existing auditability promise without changing the filmed workflow or inventing any new impact metric. Sent to the root implementation owner.

**Resolution independently reviewed:** `src/lib/evidence.ts` now provides a self-contained export with generated time, workspace revision, configured tariff and units, source reference, calculation and mass basis, stable IDs, retained measurements, tasks and audit records. Impact calls this helper. The focused tests exercise a nondefault rate and a measurement trail surviving an empty audit, and neutralize formula-like notes and names. Those tests passed in this reviewer's run. The hosted browser journey has also been extended to inspect the downloaded CSV; its next release run should verify the deployed artifact.

### P2: reconcile the final public artifact links

At review time the README still emphasized silent video files and the YouTube publication record awaited a real watch URL. The narrated cut was actively being produced. Replace the primary silent-demo link with the completed narrated video, record the actual public watch URL, and ensure the final source archive, release tag, README and Devpost point to the same version. Verify playback, audible narration, readable captions and the exact runtime after upload. This is a known release task, not evidence that the upload has already succeeded.

## Submission gates, distinct from software findings

The detailed rules require a 3 to 5 minute operating video, public judge access, and all human teammates appearing. The team must contain 2 to 5 people. A stock AI narrator does not establish anyone's participation or satisfy appearance. Eligibility wording differs between the overview and detailed rules; verify the actual team's eligibility before attesting. These requirements cannot be solved by fabricating teammates, contributions or camera footage. [Official rules](https://hack-the-weather.devpost.com/rules)

The remaining publication and final submission checks are binary gates. A polished application does not compensate for an inaccessible video or an incomplete mandatory field. Do not claim the official submission is complete until those gates are actually satisfied.

## What the product gets right

**The data changes the work.** The September 12, September 15 and missing-day comparison holds inventory and capacity fixed. The resulting allocation changes from 2,700 kg to zero. This is convincing functional dependence on Conduit, presented correctly as retrospective replay rather than forecast skill.

**Weather never becomes a fake meter.** Moisture changes only through entered measurements. Storage and dispatch require a fresh below-target record. Task completion does not invent drying progress. The tariff equivalent uses the intake-to-latest gap, so repeating a reading does not add credit.

**Physical state and recommendations are separated.** Existing outdoor occupancy is reserved until an operator confirms clearance. A dryer referral does not assert that a booking, pickup or drying outcome happened. These details make the workflow more credible than a generic recommendation card.

**The interface is coherent.** The inspected screenshots use a consistent restrained palette, clear type hierarchy and usable spacing. The mobile page contains its table scrolling, with the historical label and primary next action still visible. The reported accessibility and keyboard tests meaningfully supplement the visual inspection.

**Commercial claims are restrained enough to defend.** The buyer is a cooperative or aggregation yard. KSh 2,500 is a price experiment, not revenue. The proposed consented outcome dataset is a future asset, not a current moat. Seasonal support cost and low-volume economics are acknowledged.

## Limits that should remain visible before a real pilot

- The RH/VPD/rain thresholds and transfer radius are operating heuristics. A valid-looking rule is not agronomic validation. Review station units, local weather representativeness, meter calibration, sampling and handling procedures with domain expertise.
- One account owns a workspace. Copying a brief supports handover, but there are no individual attendant accounts, role permissions or per-person completion attribution. Do not sell this as a multi-operator organization system yet.
- There is no full correction/archive workflow, self-service password recovery or account-deletion interface. Bounded task, batch and audit histories need an operational retention approach before sustained use.
- Cloud persistence is not a backup. Configure a store-appropriate recovery process and perform a restore drill before enrolling real yards. The deployment guide correctly separates Firestore operations from the SQLite backup path.
- Actual environmental and economic impact needs baseline work, operator adoption, comparable costs and measured outcomes. The supervised pilot plan is the right next step, but no partner or result should be implied until it exists.

No additional P1 software defect was established by this bounded inspection. That statement is scoped to the inspected code and artifacts and is not a security audit, load test or assertion that no defects remain.
