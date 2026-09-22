# Kavu submission review, version 2

**Review date:** 22 September 2026. **Method:** internal adversarial review of the product story, existing source and test evidence, refreshed submission text and planned hosted upgrade. The reviewer helped prepare product materials. This is not an external assessment, organizer score or ranking prediction.

**Current judgment:** the strongest story is one supervisor, a finite yard, one measured maize lot and an environmental input that changes the work. The hosted account demonstration now strengthens adoption credibility: signup, private records, sign-out, sign-in and password change have passed against Firestore. The main evidence gap remains actual operator use and willingness to pay. Clear writing should make that next experiment compelling rather than manufacture an outcome.

## Rubric and submission facts

The detailed rules currently weight problem 20%, innovation 20%, technical/data use 25%, impact 25% and scale 10%. The overview uses impact 15% and scale 20%. Both reward a clear chain from data to useful action. [Detailed rules](https://hack-the-weather.devpost.com/rules), [overview](https://hack-the-weather.devpost.com/)

The rules require 2 to 5 registered human teammates and a 3 to 5 minute operating demonstration with every member appearing. AI assistance requires disclosure. The detailed eligibility text allows ages 18 to 35 and non-students; the overview still says students only. Confirm any eligibility conflict affecting the team. The deadline remains September 26 at 02:15 IST. [Official rules](https://hack-the-weather.devpost.com/rules)

## Criterion-by-criterion critique

| Criterion | What the current build can substantiate | What could weaken the submission | Concrete improvement in this revision |
| --- | --- | --- | --- |
| Problem and relevance | A supervisor allocates limited drying space and tracks meter readings for multiple maize lots. KALRO's drying guidance and NCPB's charged service anchor the operational context. | General climate language can hide the actual user and costly decision. There are no operator interviews establishing how frequently handovers fail. | Open with a familiar scene: several incoming lots, limited space and a next shift that needs to know what happened. State the exact initial buyer and recruit role-specific discovery participants. |
| Innovation and creativity | Weather, whole-lot allocation, tasks, measurements and a tariff basis form a connected workflow. | Claiming that weather rules or task lists are individually unique would be difficult to defend. A decorative AI story would weaken the evidence. | Demonstrate the combined job-to-measurement loop. Contrast it with the supervisor's practical incumbent: a notebook, verbal instructions and a weather app. |
| Technical implementation and data use | 18,364 unique real station observations, quality checks, a shared engine, account isolation, state transitions and regression tests. A controlled comparison changes outdoor allocation from 2,700 kg to zero under humid or missing evidence. | A new cloud adapter could lose revisions, persist sessions incorrectly or expose another account's workspace. Showing a login form alone proves little. | Record signup, one private intake, logout and login with the same record. Run authorization and concurrent-write checks against the actual hosted persistence adapter. Show September 8, 15 and 12 in the demo. |
| Climate, environmental and social impact | The workflow enables a concrete action and later measurement. A proposed pilot can collect the evidence needed to evaluate handling quality and costs. | Tariff equivalents, seed readings or completed tasks could be misread as measured savings or prevented loss. | Show KSh 2,176 with its exact calculation and label. Present operational pilot metrics and a local grain-quality review before expanding benefit claims. |
| Scalability and future potential | A cooperative buyer can serve multiple farmers' lots. Deterministic recommendations avoid a per-decision language-model bill. A hosted private account reduces setup friction. | Seasonal use, support costs, onboarding and station relevance may overwhelm a low subscription. An isolated account is not a multi-user organization. | Keep KSh 2,500 as a price experiment, with renewal and support effort recorded. Expand site by site only with appropriate weather coverage and operating validation. |

No new numeric self-score is assigned. Changing a database or improving the pitch does not supply missing field evidence.

## Recording and launch acceptance checks

1. **Hosted identity and persistence:** open the final URL signed out. Create a dedicated test account, add a fictional lot, reload, sign out and sign in. Verify its record survives. Use a second session to confirm account isolation through the API. Confirm the database is durable across a service restart or revision change before describing cloud persistence as production behavior.
2. **Honest demonstration mode:** after the account scene, deliberately enter the separate example workspace. Keep the historical label visible. These are observed conditions replayed retrospectively, with sample lots and illustrative meter entries.
3. **A single physically feasible lot:** use Mavuno A-01, 1,800 kg at 18.2%, in the seeded 3,000 kg yard. Show 2,700 kg allocation, complete that lot's spread and turn jobs, and enter 15.0%. Do not substitute a newly created 5-tonne lot or another batch's actions.
4. **Cost before the later reading:** show KSh 2,176 before entering 12.7%. The later reading changes the ledger. Keep the expression `1.8 x 3.2 x 377.80` available for a judge to inspect.
5. **Video usability:** measure the generated narration and render duration. Match the actual capture to each audio segment, keep captions accurate and ensure text remains readable after upload. Real app scenes should remain visually distinct from explanatory pricing and architecture cards.
6. **Public access:** verify the deployed URL, repository and public YouTube watch page in a signed-out session. Check that the final link shows the intended video with clear audio. Do not publish placeholder IDs or old static-only account instructions as the primary judge path.

## Commercial experiment worth presenting

Use the existing [pilot guide](../submission/pilot-interview-guide.md) to recruit up to three willing yards and learn their current intake-to-storage process. Collect a short baseline period before shadow recommendations. With local domain review, introduce supervised task coordination and compare handover effort, meter rechecks, rehandling incidents and documented costs with that baseline.

A practical first adoption target is whether the supervisor can complete the lot workflow without help and keeps using it during active drying days. Record support minutes alongside usage. Test willingness to renew at a specific price after the buyer has seen actual records. These are proposed feasibility tests, not a statistically powered loss-reduction study or a signed pilot.

## Questions the presenter should answer plainly

- **Why pay for this?** The hypothesis is more reliable handovers and easier reconstruction of a lot's history. The pilot must show whether those improvements justify the recurring fee.
- **Why this station?** It supplies the required real observations and a starting local context. Every new site needs relevant weather evidence and operational review.
- **Why no trained model?** The available record lacks labelled grain outcomes. Inspectable policy is a practical starting point while paired weather, actions and measurements are collected responsibly.
- **What does ready mean?** A recent recorded measurement meets the configured moisture criterion for storage review. Sampling quality and the buyer's broader grain-quality requirements still apply.
- **What is proven today?** The software workflow, the change in plan under different evidence and the implemented account behavior once hosted checks pass. Field effectiveness and commercial retention remain future evidence.

## Delivery register

| Item | Status at draft handoff |
| --- | --- |
| Exact requested Devpost fields | Prepared in [devpost-v2.md](../submission/devpost-v2.md) |
| Cohesive stock-voice narration | 500 words, ten segments, exact text and actions in [narration-v2.json](../submission/narration-v2.json) |
| User-facing testing route | [testing-instructions.md](../submission/testing-instructions.md) points to the live hosted service and its reproducible example |
| YouTube title and description | Prepared in [youtube.md](../submission/youtube.md), actual public upload pending |
| Hosted full app | Live at [kavu-drying.web.app](https://kavu-drying.web.app/). Firebase Hosting, Cloud Run API and a dedicated Firestore database. Hosted signup, login and password-change persistence verified by the implementation owner. |
| Current software checkpoint | Implementation owner reports 106 unit/API tests passed with six cloud checks skipped in that run, eight real Firestore tests passed separately, and all 17 hosted browser tests passed at the live URL on version 2.0.0. Counts remain scoped to their actual runs. Production dependency audit reports zero known vulnerabilities. |
| AI voice and attribution | Stock narrator explicitly disclosed. Shivam's known product direction and commercial priorities credited. |
| Human submission requirements | Real eligible team registration, actual member appearances and final submission remain human actions. |

The revised narrative is positive about the completed workflow and precise about its evidence. The hosted and browser gates are complete. The final source package and actual public video watch URL remain to reconcile before submission.

## Hosted release verification

The implementation owner completed all **17 hosted browser tests** against [kavu-drying.web.app](https://kavu-drying.web.app/) in approximately 1.6 minutes. The run covered authentication and password changes with persistent records, the real job and measurement workflow, CSV export, error recovery, revision conflicts, fresh-forecast gating, five pages at 390/768/1440 pixels, operational dialogs and a held-loading accessibility regression. The earlier 16-test local pass remains a separate checkpoint. The loading-text contrast finding was corrected and the final regression passed.

Release version **2.0.0** runs on Cloud Run revision `kavu-api-00002-sfv`. The production dependency audit found zero known vulnerabilities at this checkpoint. Neither result establishes an external security audit, assistive-technology certification or field effectiveness. A separate persistence check across the redeployment is being completed by the backend owner.
