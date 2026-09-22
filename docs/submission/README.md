# Submission pack: editorial control sheet

These drafts support the Kavu submission. They are not evidence that the feature, test, deployment or human step described has been completed. Reconcile this sheet against the final build before copying public text or recording.

## Files

- [Devpost copy](devpost.md): public description, project fields and AI disclosure.
- [Verbatim video script](video-script.md): four-minute narration with a separate shot list.
- [Judge Q&A](judge-qa.md): product, technical, evidence and business answers.
- [Pilot interview guide](pilot-interview-guide.md): future research, with no fabricated participants or findings.
- [Human handoff](human-handoff.md): eligibility, teammate and final video/submission requirements.
- [Source decision memo](../research/market-and-evidence.md): exact sources, commercial assumptions and claim boundaries.

## Build-claim reconciliation

Each item below is **pending final verification** when this pack is drafted. The implementation owner should change the status only after observing the working feature or inspecting its recorded check.

| Claim in the copy | Required evidence before publication | Status |
|---|---|---|
| Isolated demo sign-in works | Fresh browser session enters a separate demo workspace and resets predictably | Pending final verification |
| Real accounts and private workspaces | Registration, sign-in/out and server-side ownership tests; no cross-account reads/writes | Pending final verification |
| Historical Conduit replay | Original source provenance, expected dates, observed historical label and deterministic replay | Pending final verification |
| Capacity-aware drying plan | An oversubscribed yard leaves excess mass unassigned and explains the limit | Pending final verification |
| Operator task lifecycle | Commit a plan, complete tasks, reload and observe persistence in the applicable mode | Pending final verification |
| Moisture determines storage-review eligibility | Recent measured value at/below the configured target is required; task completion alone cannot qualify a lot | Pending final verification |
| Ledger does not double count | Verify a repeated reading, rising moisture, equal moisture and a multi-reading sequence | Pending final verification |
| Data-quality gates affect advice | Missing/stale/invalid input is visible and changes the recommendation appropriately | Pending final verification |
| CSV or audit export | Download, open and reconcile lot identities, dates, mode and units | Pending final verification |
| Docker deployment is supported | Build and run the final image; persistent database and configured secrets documented | Pending final verification |
| Static public demo is browser-local | Clearly labeled, contains no private account data and makes no server-authentication claim | Pending final verification |
| Final tests pass | Final command output or CI result against the submitted commit | Pending final verification |

## Recording contract

Use **the historical replay dated 12 September 2026** for the main story if the final data and UI support that path. State “historical replay” out loud and keep its label in frame. Do not imply that a forecast existed in that replay unless it is an actual archived forecast available at the time.

Use the seeded **Mavuno A-01** lot: **1,800 kg**, initial **18.2%**. The primary recording logs **15.0%**, giving **KSh 2,176.128**, rounded to **KSh 2,176**, using **KSh 377.80 / tonne / percentage point**. Show this ledger before a later **12.7%** reading demonstrates the moisture target. All lot readings in the demo are illustrative inputs. The separate 5-tonne, two-point, KSh 3,778 example in the deck and commercial copy is theoretical; it must not be shown as the live result of Mavuno's workflow. A 5-tonne lot exceeds the default 3-tonne yard and therefore cannot be used for the narrated spread task. The video also contrasts the September 8 data gap and September 15 humid replay before returning to September 12.

The cost narrative must follow the application's final accounting convention. If the implementation uses a different mass basis, tariff, or incremental calculation, update the narration and worked example together. Do not alter production logic to manufacture an attractive result.

## Publication boundaries

- Publish actual deployment and video links only. Do not insert plausible-looking placeholder URLs into Devpost.
- Do not label the application production-proven. It can be deployment-ready software while field validation remains outstanding.
- Do not replace a missing teammate with an AI name, a fictional role or an eligibility assertion.
- Product direction and constraints were supplied by Shivam Gupta. Implementation, research, test authoring and documentation are AI-assisted. Add later human review or engineering contributions only after they happen.
- The official submission deadline is **26 September 2026, 02:15 IST** / **25 September 2026, 23:45 EAT**. Recheck the [official page](https://hack-the-weather.devpost.com/) before final submission.
