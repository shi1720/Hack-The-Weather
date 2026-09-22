# Kavu submission pack

The full app is live at **[kavu-drying.web.app](https://kavu-drying.web.app/)**. Firebase Hosting serves the interface, Cloud Run runs the API and Firestore preserves private accounts and workspaces. Hosted signup, sign-out, sign-in and password changes have passed. SQLite remains available for local self-hosting.

## Copy for Devpost and YouTube

- [Seven required Devpost fields](devpost-v2.md)
- [Additional information answers and file upload](additional-info.md)
- [Judge testing instructions](testing-instructions.md)
- [YouTube title, description and publication record](youtube.md)
- [Locked narrated script](narration-v2.md) and [machine-readable segments](narration-v2.json)
- [Human handoff](human-handoff.md)
- [Judge Q&A](judge-qa.md), [internal judging review](../review/judging-v2.md) and [separate final review](../review/independent-final-review.md)
- [Pilot interview guide](pilot-interview-guide.md) and [market evidence memo](../research/market-and-evidence.md)

## Generated assets

- [Public narrated walkthrough](https://www.youtube.com/watch?v=iyu0CjoYOgM), exactly 4:25 at 1080p with English CC; [local MP4](../../output/kavu-demo-narrated.mp4), [66-cue captions](../../output/kavu-demo-narrated.srt) and [recording verification](narrated-recording-notes.md)
- [Editable pitch deck](../../output/kavu-pitch.pptx), eight slides
- [Buyer and judge brief](../../output/pdf/kavu-brief.pdf), four pages
- [YouTube thumbnail](../../output/kavu-youtube-thumbnail.png), 1280 x 720
- [Devpost project image](../../output/kavu-devpost-thumbnail.png), 1200 x 800
- [Overview gallery image](../../output/gallery/kavu-overview.png), [batch register](../../output/gallery/kavu-batches.png) and [mobile interface](../../output/gallery/kavu-mobile.png)

The verified [Devpost upload](https://github.com/shi1720/Hack-The-Weather/releases/download/v2.0.0/kavu-submission.zip) is approximately 2.02 MB and contains generated artifacts, final captions, submission materials and the frozen source. Video is excluded to stay within the 35 MB limit. The [full kit](https://github.com/shi1720/Hack-The-Weather/releases/download/v2.0.0/kavu-submission-kit.zip), approximately 18.4 MB, also includes the narrated MP4. Both archives passed integrity and exclusion checks.

The completed narrated video uses a disclosed stock AI voice. Its ten segments preserve the 500-word script, with 66 timed caption cues. The 1080p MP4 is exactly 265.000 seconds and 10,842,049 bytes. Public YouTube playback, 1080p HD and native English captions are verified. The earlier [silent demonstration](../../output/kavu-demo-silent.mp4) and [human recording instructions](recording-notes.md) remain available as alternate editing assets.

## Evidence and release checks

| Capability | Evidence and scope |
| --- | --- |
| Public full app | Hosted route verified at [kavu-drying.web.app](https://kavu-drying.web.app/) with real private-account persistence in Firestore. |
| Account lifecycle | Hosted browser checks cover signup, sign-out, sign-in, password change and retained records. The workspace currently has one account owner. |
| Conduit input | 18,364 unique observations after 2,825 overlapping rows are removed. Source hashes and provenance remain available. |
| Operational effect | The [controlled evaluation](../evaluation.md) allocates 2,700 kg under September 12 conditions and zero under humid/missing evidence, with the same operational inputs. |
| Data quality | Missing rainfall stays unknown. The primary rain gauge supports the policy, and Gauge 2 is excluded. Historical replay stays identified as retrospective. |
| Physical workflow | Capacity limits, occupancy, task completion and measured moisture operate through shared rules. Repeat drying cycles after confirmed shelter receive fresh jobs while preserving completed history. Recommitting the same plan is idempotent. |
| Tariff accounting and export | The ledger compares intake and latest target gaps using intake mass. CSV exports now include rate, units, formula, generated UTC time, workspace revision, stable IDs, all retained measurements and notes, tasks and audit records. The value remains a reference cost, separate from actual savings. |
| Default software suite | Latest implementation-owner run: **112 tests passed**, with **six opt-in Firestore checks skipped** in that default run. It includes four new repeat-cycle regressions and two export regressions. |
| Cloud and hosted checks | The earlier dedicated real-Firestore run passed **eight checks**, including two codec checks that overlap the default suite. The final deployed version 2.0.0, revision `kavu-api-00003-4pb`, passed **all 17 hosted browser tests**, including downloaded CSV metadata after the late cycle/export fixes. Do not add these overlapping counts. |
| Separate review | A review agent that did not implement this release independently reproduced the cycle issue, inspected both fixes and passed **30 focused workspace/export tests**. This is an internal project review, not an organizer or field assessment. |
| Dependency check | Production dependency audit reports zero known vulnerabilities at the checked release point. This is not an external security audit. |
| Static fallback | The separate [GitHub Pages sandbox](https://shi1720.github.io/Hack-The-Weather/) retains its verified offline workflow after an initial successful load. Its records stay in the browser. |
| Self-hosting | Express/SQLite and Docker setup remain supplied. Prior GitHub CI verified a non-root, read-only container startup and health response. Cloud production operations still require ongoing monitoring and support. |

Test counts and results refer to their actual run scope. Core source `26a9688` is frozen and its GitHub CI passed, including Firestore emulator coverage, the Docker smoke and the offline static preview. Final cloud revision verification is complete. Public video, final documentation and both archive integrity checks are complete. The internal document review does not substitute for those executable checks or a field pilot.

## One example across every medium

Use the seeded **Mavuno A-01**, **1,800 kg**, starting at **18.2%**. A demonstration reading of **15.0%** gives `1.8 x 3.2 x 377.80 = KSh 2,176.128`, displayed rounded to **KSh 2,176**. Show that result before entering **12.7%**, which changes the ledger and permits a separate storage-readiness review.

The updated deck, brief and narration use this same example. The Conduit weather is real. Lot identities and readings illustrate the workflow. A measured moisture target does not establish representative sampling, food safety or aflatoxin status.

## Devpost progress

**Submitted on 22 September 2026.** Devpost confirmed “Project submitted!” and the [public project page](https://devpost.com/software/kavu-1utp83) shows “Submitted to Hack The Weather”. The entry includes all seven story headings, 12 technology tags, three gallery images, the app and repository links, the public video, four additional answers and the verified source/document ZIP. Shivam's contribution text is saved with accurate scope. The user requested submission now and will add a teammate later. Devpost permits edits until the deadline; submission confirmation does not establish team eligibility or satisfy the outstanding human appearance requirement.

## Human completion requirements

The team still needs real eligible participants, accurate contributions, actual member appearances in the official video, and those updates saved before the deadline. A disclosed AI narrator can supply the audio but cannot appear as a human teammate. See the [handoff](human-handoff.md).

The deadline is **26 September 2026, 02:15 IST**, equivalent to **25 September 2026, 23:45 EAT**. [Official event page](https://hack-the-weather.devpost.com/)
