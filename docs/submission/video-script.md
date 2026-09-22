# Kavu: verbatim demonstration script

**Target length:** approximately 4 minutes 25 seconds, within the required 3–5 minutes.  
**Delivery:** calm, conversational, about 135–145 spoken words per minute.  
**Presenter:** Shivam Gupta. Other eligible team members must appear visibly in the final video; do not invent names or participants.

> Recording note: confirm the final feature path using [the control sheet](README.md). Spoken claims below are conditional on that verification. The script uses a historical replay and clearly identifies demonstration lot inputs. Capture the actual interface, not a nonfunctional mock-up.

## Read this word for word

<!-- SPOKEN START -->
A weather reading does not cover a pile of maize. A person does.

I’m Shivam Gupta, founder and product lead of Kavu. Kavu helps a maize cooperative turn environmental evidence into a drying job, then check what happened with a new moisture reading.

Imagine a yard supervisor handling several farmers’ lots. Space is limited, and people need clear instructions. A weather chart does not decide which lot the team should handle next.

Here is one complete journey. I click Explore demo workspace. This is an isolated browser demonstration. The banner says historical replay: these are supplied JKUAT Conduit observations, not a live weather report.

First, look at September eighth. The export has no observations for this period. Kavu shows the missing evidence instead of inventing a drying window. September fifteenth has observations, but humid conditions change the advice. I return to September twelfth for the worked example.

The distinction matters. A weather recommendation needs both suitable conditions and usable evidence.

Our example lot is Mavuno A-zero-one: eighteen hundred kilograms, with an initial moisture reading of eighteen point two percent. These are seeded demonstration inputs, not a farmer’s actual harvest.

I click Build operator plan. Kavu allocates work within the configured three-tonne yard capacity and explains the next action for each lot. Some grain may have to wait for space.

I choose Create operator jobs. In the Drying yard, I complete Mavuno’s spread task and then its turn task. The actions remain attached to the batch, so the next person taking over can see what was assigned and what was completed.

But completing the work does not prove the maize is dry.

In Batches, I open Mavuno and choose Log reading. I enter fifteen percent. The new measurement is still above the configured target, so the lot needs further attention.

Now I open the Impact ledger. This example shows about two thousand one hundred and seventy-six Kenyan shillings of drying-tariff equivalent. The calculation uses one point eight tonnes, a reduction of three point two percentage points, and NCPB’s published tonne tariff.

That amount is not verified savings. It excludes labour and transport, and it cannot prove what would have happened without Kavu. The useful result is a comparison whose assumptions are visible.

Back in the batch, I log a separate example reading of twelve point seven percent. A recent measurement below the target now supports storage review. Kavu does not certify food safety or test for aflatoxin. A moisture meter and local quality procedures still matter.

The prospective buyer is a cooperative or aggregation yard that already dries maize. One supervisor uses the product; many farmers’ lots can benefit without each farmer buying another app.

Our starting price hypothesis is two thousand five hundred shillings per active month per site. Customer interviews and a supervised pilot must test that price. We do not claim paying customers, signed pilots or measured loss reduction.

Kavu includes a server application with private accounts and this separate browser demo. Its recommendation logic needs no paid language-model call. Codex assisted the engineering and documentation; I supplied the product direction and commercial priorities.

The next step is to observe real work, compare recommendations in shadow mode, and measure adoption, moisture checks and actual costs.

Kavu connects Conduit evidence to a completed job and a new measurement. Every dry hour counts.
<!-- SPOKEN END -->


## Timestamped shot list

The timing below totals about 4 minutes 25 seconds. Adjust pauses to the recorded narration; do not accelerate interface clicks until they become unreadable.

| Time | Picture and actual action | Narration cue |
|---|---|---|
| 0:00–0:15 | Shivam on camera, Kavu wordmark. Actual eligible teammates appear in the opening or closing | “A weather reading…” |
| 0:15–0:35 | Click **Explore demo workspace**. Keep the historical replay banner visible | “Here is one complete journey…” |
| 0:35–1:00 | Overview date selector: **8 September** missing-data case, then **15 September** humid case, then **12 September** | “First, look at September eighth…” |
| 1:00–1:20 | Locate seeded **Mavuno A-01**, **1,800 kg**, **18.2%**. Confirm these exact seed values before recording | “Our example lot…” |
| 1:20–1:45 | Click **Build operator plan**, inspect allocation, then **Create operator jobs** | “I click Build operator plan…” |
| 1:45–2:05 | Drying yard: **Complete** Mavuno's spread task, then **Complete** its turn task | “In the Drying yard…” |
| 2:05–2:25 | Batches → Mavuno A-01 → **Log reading** → **15.0%**. Show measurement history and target | “In Batches…” |
| 2:25–2:50 | Impact ledger: show Mavuno's **KSh 2,176** rounded tariff equivalent and calculation basis before entering any further measurement | “Now I open the Impact ledger…” |
| 2:50–3:10 | Return to Mavuno → **Log reading** → **12.7%**. Show resulting moisture-target status | “Back in the batch…” |
| 3:10–3:35 | Buyer and pricing slide, explicitly marked hypothesis | “The prospective buyer…” |
| 3:35–4:00 | Brief server/private-account versus browser-demo explanation. Small architecture view or actual login screen | “Kavu includes…” |
| 4:00–4:25 | Pilot steps then closing camera view with all actual teammates, verified project links | “The next step…” |

## Rehearsal and capture notes

1. Rehearse once from a clean demo. Confirm which replay time produces a useful drying recommendation. Use the same time for the recording, and keep its historical status visible.
2. Start with a clean seeded workspace. Mavuno A-01 must be 1,800 kg at 18.2% initially. Its 15.0% reading produces 1.8 × 3.2 × 377.8 = KSh 2,176.128, displayed as KSh 2,176. Show that ledger before logging 12.7%, which will correctly change the value. Do not narrate the 5-tonne theoretical deck example over this lot.
3. Record at 1920×1080 if available, with readable browser zoom and a quiet microphone. Give important panels a short pause. Do not expose email addresses, passwords or API keys.
4. A natural voice-over is sufficient. The official rules also require every team member to appear; add actual camera footage, rather than substituting names or avatars.
5. Upload the finished video to an accessible host, test the exact URL while signed out, and ensure the final duration is between 3 and 5 minutes.
6. If a planned feature does not pass verification, revise the spoken sentence before recording. Do not narrate functionality absent from the submitted build.

## Optional shorter closing for timing

If the cut approaches five minutes, omit the paragraph beginning “Kavu includes…” and put the account architecture and AI disclosure on the closing slide and in the README. Keep the explicit historical-data, measurement and tariff-equivalent explanations.
