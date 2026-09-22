## Inspiration

A harvest takes months. At the drying yard, the next few hours matter.

Imagine a maize cooperative receiving several farmers' lots at once. The supervisor has limited outdoor space, people to coordinate and a moisture meter. A useful weather report still leaves a practical question: **which lot should the team handle next, and how will the next shift know what happened?**

Kavu grew from that last mile between environmental information and physical work. KALRO's maize training manual treats drying, storage and moisture measurement as connected tasks. NCPB's paid drying service gives the decision a concrete economic context. We built a desk for the person responsible for joining those pieces together. [KALRO guidance](https://keep.kalro.org/appfiles/media/vc_files/maize-tot.pdf), [NCPB drying tariff](https://ncpb.co.ke/drying/)

## What it does

Kavu helps a maize-yard supervisor plan work, record its completion and check the result with a fresh moisture reading.

Its five views form one workflow:

- **Overview:** see the next decision, the available weather evidence and its timing.
- **Drying yard:** allocate whole lots within the configured capacity, create jobs and share a date-specific brief.
- **Batches:** record intake, moisture measurements and handling history.
- **Impact ledger:** inspect completed work and a transparent drying-tariff comparison.
- **Data & settings:** examine Conduit provenance, data quality and operating assumptions.

The demonstration follows Mavuno A-01, an illustrative 1,800 kg lot starting at 18.2% moisture. The supervisor creates a plan, completes spread and turn jobs, and records 15.0%. The ledger shows about **KSh 2,176 of drying-tariff equivalent** using NCPB's published tonne rate. This is a reference comparison; measuring actual savings requires labour, transport and alternative drying costs.

A later 12.7% example reading meets the configured moisture target for storage review. Representative sampling, local grain-quality procedures and aflatoxin testing remain separate responsibilities.

Private accounts preserve a supervisor's own lot records. A separate demonstration workspace makes the complete example easy to explore.

[Try Kavu](https://kavu-drying.web.app/) and choose **Explore demo workspace** for the five-minute example. The [testing guide](https://github.com/shi1720/Hack-The-Weather/blob/main/docs/submission/testing-instructions.md) provides exact steps and expected results, including a separate signup and persistence check.

## How we built it

The hosted application at [kavu-drying.web.app](https://kavu-drying.web.app/) uses **React and TypeScript** on **Firebase Hosting**, an **Express API on Cloud Run**, and **Firestore** for durable private workspaces. A shared rules engine keeps recommendations consistent across the interface, server and reproducible evaluation. The repository also includes a SQLite self-hosting path, Docker setup, API tests and Playwright browser journeys.

The data pipeline prepares **18,364 unique JKUAT Conduit observations**, removing **2,825 overlapping rows** while retaining source files and hashes. Temperature, humidity and the primary rain gauge feed explainable drying rules. Wind remains visible as context. The application exposes gaps and timestamps so the supervisor can inspect the evidence behind an action.

A controlled software comparison holds the sample inventory, deadlines and capacity fixed. September 12 conditions allocate **2,700 kg** to a **3,000 kg** yard. September 15's humid observations or the September 8 data gap allocate **zero** outdoors. Conduit therefore changes the work plan. The comparison uses retrospective observations and demonstrates functional dependence on the data.

Optional current forecast guidance comes from a separately attributed MET Norway adapter with freshness checks. Recommendations use deterministic rules and need no paid language-model call.

Shivam Gupta led product direction, commercial priorities and quality requirements. Codex assisted research, engineering, testing and documentation. The narrated walkthrough uses a disclosed stock AI voice.

## Challenges we ran into

**Turning imperfect observations into dependable inputs.** Overlapping exports and long gaps needed explicit treatment. We kept provenance, removed duplicates and made unavailable evidence visible in the operational decision.

**Respecting the physical yard.** Whole lots compete for finite space. We accounted for existing occupancy and required completed handling actions before a lot's physical state changed. A mechanical-dryer referral records follow-up without implying a booking.

**Keeping the handover accurate.** Jobs belong to a particular date and evidence mode. We scoped the brief accordingly and added a browser regression after finding a case that mixed two replay days.

**Connecting value to evidence.** Atmospheric humidity informs the work; a meter measures the grain. The ledger compares intake and current moisture gaps instead of adding every downward step, which keeps repeated readings from accumulating extra credit.

## Accomplishments that we're proud of

We completed a connected journey from source data to a capacity-aware decision, a recorded job, a new measurement and an inspectable cost basis.

The same lot appears throughout the demo, and changing the Conduit evidence visibly changes the recommendation. Hosted signup, sign-out, sign-in and password changes preserve private records in Firestore. Input validation, task transitions, account isolation and the main browser journeys have automated coverage. The build includes responsive screens, evidence export, documented deployment and a repeatable judge walkthrough.

The product also has a specific commercial starting point: a cooperative or aggregation yard that already dries maize and uses a moisture meter. One supervisor can coordinate many farmers' lots through a shared operational process.

## What we learned

The most valuable output of environmental data may be a clear instruction with a record of what happened afterward.

That insight changed our design. We gave the supervisor a task, a reason and a measurement history. We treated the notebook, verbal handover and existing weather app as the practical incumbent. Kavu has to make that daily work easier enough to earn adoption.

We also learned to separate working software from field evidence. The next learning comes from observing operators, testing local thresholds and measuring real costs. Current outcomes are demonstrated software behavior, with commercial and environmental benefits still to evaluate.

## What's next

Our first proposed pilot starts with up to three willing maize yards near a relevant environmental reference source. We will observe current work, compare Kavu's recommendations alongside experienced operators, then introduce supervised task coordination.

The pilot will measure handover time, completed moisture rechecks, rehandling incidents, administrative effort and actual charges. A local grain-quality professional will review sampling and operating thresholds. We will use those records to decide what to improve and whether the buyer wants to continue.

The starting pricing hypothesis is **KSh 2,500 per active month per site**, with seasonal use, onboarding and support included in the commercial evaluation. A successful pilot must demonstrate daily usefulness and willingness to renew. Future expansion depends on appropriate local data and validation, with permissioned lot histories creating a foundation for better decisions over time.
