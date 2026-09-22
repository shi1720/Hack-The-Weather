# Submission pack: editorial control sheet

This is the delivery and claim register for Kavu, reconciled on **22 September 2026**. It separates implemented software from external launch and human submission requirements. The software is prepared for a supervised pilot; field effectiveness and production operations have not been validated.

## Files

- [Devpost copy](devpost.md): public description, project fields and AI disclosure.
- [Verbatim video script](video-script.md): approximately 4:25 of narration with a separate shot list.
- [Judge Q&A](judge-qa.md): product, technical, evidence and business answers.
- [Pilot interview guide](pilot-interview-guide.md): future research, with no fabricated participants or findings.
- [Human handoff](human-handoff.md): eligibility, teammate and final video/submission requirements.
- [Source decision memo](../research/market-and-evidence.md): exact sources, commercial assumptions and claim boundaries.

## Build-claim reconciliation

The implementation owner reports **103 passing unit/API tests and five passing Chromium browser tests**, plus passing local and public-sandbox offline smoke tests at this checkpoint. [GitHub Actions run 35688453407](https://github.com/shi1720/Hack-The-Weather/actions/runs/35688453407) passed verification and publication, including a production Docker smoke. This editorial pass inspected the source, regression tests and browser run status; it did not independently rerun every suite. CI remains the reproducible check for the submitted commit.

| Claim in the copy | Evidence and bounded status |
|---|---|
| Isolated demonstration | Browser suite covers entry and the lot workflow. Static sandbox persists its example workspace locally; it does not create a server account. |
| Real accounts and private workspaces | Local HTTP/API tests cover ownership and sessions; browser suite covers registration, sign-out, sign-in, persisted data and Account settings password change. No permanent public full-stack host is provisioned. |
| Historical Conduit replay | Original files, hashes and preparation pipeline produce 18,364 unique observations after removing 2,825 overlaps. [Controlled evaluation](../evaluation.md) verifies the September 12/15/gap contrast; retrospective observations are not forecast validation. |
| Capacity-aware plan | Shared engine/reducer tests cover whole-batch allocation and occupied space. September 12 allocates 2,700 kg under the 3,000 kg example capacity. |
| Operator tasks and handovers | Browser suite covers create/complete/reload and date-scoped copied briefs. Reducer regression rejects stale dryer referrals and preserves physical state on a normal referral. One supervisor owns the workspace; no per-operator accounts or assignments are claimed. |
| Moisture-based storage review | Shared tests require a recent at-target recorded measurement; no task completion or weather score certifies grain quality. |
| Transparent ledger | Inspected formula compares intake and current moisture gaps to the target, using the recorded intake mass; it does not accumulate every downward step. Unit tests cover tariff units, invalid inputs and monotonicity. Values are reference-tariff equivalents, not attributable savings. |
| Data-quality gates | Tests cover missing, invalid and stale evidence. Gap-day rainfall is visibly unknown; Gauge 2 is excluded. |
| Downloads | Browser suite exercises CSV export; audit history is present in the workspace. Reconcile any exported customer data before external use. |
| Self-hosting | GitHub CI passed a production Docker build, non-root/read-only container startup and health check. Configuration, backup and recovery guidance are supplied. This is not evidence of a permanent hosted service or a tested customer recovery procedure. |
| Offline static sandbox | Built-site smoke passed locally: cached data, offline reload, missing-data gating, plan creation, spread completion and persistence, with no API calls or page errors. [Smoke script](../../scripts/smoke-static.mjs). First successful online load is required. |
| Public repository | [GitHub repository](https://github.com/shi1720/Hack-The-Weather) confirmed public. |
| Public sandbox launch | [GitHub Pages sandbox](https://shi1720.github.io/Hack-The-Weather/) is live. The implementation owner ran the signed-out Playwright smoke against this exact URL: real data, missing-day gating, offline reload, plan/job completion and persisted state passed, with no API calls or page errors. |

## Prepared artifacts

- [Editable eight-slide pitch](../../output/kavu-pitch.pptx): rendered and visually checked.
- [Four-page business and technical brief](../../output/pdf/kavu-brief.pdf): rendered and visually checked.
- [Silent screen demonstration](../../output/kavu-demo-silent.mp4): exactly 4:25, 1920×1080 H.264, visually checked and prepared for the human voice track and member appearances. Follow the [recording instructions](recording-notes.md). It is not yet the final rule-compliant uploaded video.
- [Supplementary server account recording](../../output/kavu-accounts-silent.mp4): one minute of actual local registration, empty-workspace intake, logout/login and persisted batch. It is separate from the primary submission video; [capture notes](account-recording-notes.md).
- Public repository, source/data provenance, reproducible tests, deployment instructions, pilot guide and Devpost copy are supplied. The final video URL, actual team identities and final submission require people.

## Recording contract

Use **the historical replay dated 12 September 2026** for the main story. State “historical replay” out loud and keep its label in frame. The full-day retrospective weather is not a forecast that was available to an operator at the time.

Use the seeded **Mavuno A-01** lot: **1,800 kg**, initial **18.2%**. The primary recording logs **15.0%**, giving **KSh 2,176.128**, rounded to **KSh 2,176**, using **KSh 377.80 / tonne / percentage point**. Show this ledger before a later **12.7%** reading demonstrates the moisture target. All lot readings in the demo are illustrative inputs. The separate 5-tonne, two-point, KSh 3,778 example in the deck and commercial copy is theoretical; it must not be shown as the live result of Mavuno's workflow. A 5-tonne lot exceeds the default 3-tonne yard and therefore cannot be used for the narrated spread task. The video also contrasts the September 8 data gap and September 15 humid replay before returning to September 12.

The application uses the lot's recorded intake mass and its moisture baseline. Repeated measurements must not create a second equivalent for the same reduction. Do not describe this ledger as verified operational savings.

## Publication boundaries

- The public sandbox is verified. Publish the final accessible narrated video URL; do not paste a pending video label into a Devpost URL field.
- Do not label the application production-proven. It can be deployment-ready software while field validation remains outstanding.
- Do not replace a missing teammate with an AI name, a fictional role or an eligibility assertion.
- Product direction and constraints were supplied by Shivam Gupta. Implementation, research, test authoring and documentation are AI-assisted. Add later human review or engineering contributions only after they happen.
- The official submission deadline is **26 September 2026, 02:15 IST** / **25 September 2026, 23:45 EAT**. Recheck the [official page](https://hack-the-weather.devpost.com/) before final submission.
