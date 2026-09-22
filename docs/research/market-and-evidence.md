# Kavu: market and evidence decision memo

**Decision date:** 22 September 2026  
**Product:** A drying operations desk for maize cooperatives and aggregation yards.  
**Working promise:** Turn a drying window into a completed, measured job.

Kavu should help the person responsible for a yard decide which maize lot goes outside, which needs covering, which needs a moisture check, and which needs a mechanical drying option. The commercial product is the operational record connecting those decisions to measured moisture and costs. Weather is one input to that record.

This memo separates sourced evidence from product choices and untested business hypotheses. No customer interviews, signed pilots, revenue, measured loss reduction, or field validation have occurred in this project.

## Why this problem

KALRO's 2021 maize training manual treats post-harvest handling, drying, storage moisture and practical use of moisture meters as connected tasks. Kavu turns that operational framing into recorded jobs. Its configured moisture target and weather thresholds are implementation policies requiring local review, not values validated by that manual. A dry afternoon does not establish grain quality or freedom from toxins. [KALRO: Maize Training of Trainers Manual, Module 10](https://keep.kalro.org/appfiles/media/vc_files/maize-tot.pdf)

There is an existing market for drying services. NCPB's published service page quotes **KSh 18.90 per percentage point of moisture reduction per 50 kg bag**, and KSh 377.80 per tonne per point. The slight rounding difference should remain visible; Kavu should use one explicitly selected basis. This is a reference tariff, not a guaranteed quote from a particular depot. [NCPB: Drying](https://ncpb.co.ke/drying/)

Research in Kenya compared small dryers with open-air drying. Its central commercial lesson is that faster or more sophisticated equipment is not automatically cheaper. Capacity, labour, conditions and quality matter. Kavu should support the choice between methods instead of assuming mechanical drying or sun drying always wins. The cited experiments do not validate Kavu or predict its performance. [De Groote et al., 2023, study abstract and bibliographic record](https://agris.fao.org/search/en/providers/123818/records/6748c86e7625988a3720c2da)

WFP has supported post-harvest practices and technologies in Kenya while exploring market access for smallholder produce. This supports the relevance of the problem and a possible future distribution channel; it is not evidence of a partnership with Kavu. [WFP Kenya country project factsheet](https://www.wfp.org/publications/kenya-glance-south-south-and-triangular-cooperation-country-project)

## Choice among three product directions

These are product judgments, not verified market-size estimates.

| Direction | Buyer and expensive decision | Why it could work | Why maize operations wins now |
|---|---|---|---|
| **Kavu: maize drying operations** | Co-op or aggregator yard manager: allocate labour and limited drying space; decide when to cover, retest or seek a dryer | Repeated workflow, measurable moisture, known paid alternative, shared buyer serving many farmers | A narrow end-to-end demonstration is possible without inventing crop-yield predictions |
| School rainwater purchasing planner | School administrator: order a tanker now or preserve tank capacity for incoming rain | Water budgets and a simple storage balance offer a clear business case | Requires reliable tank-level/demand records; rainwater quality is a separate problem; procurement cycles may be slow |
| Coffee drying-table dispatch | Wet-mill manager: allocate tables and cover labour across valuable lots | Distinctive Kenyan story with cooperative buyers | Coffee has more processing-stage dependencies and quality premiums that need specialist validation; introducing a second crop weakens this build's focus |

FAO describes sun drying on tables as a widespread stage in Kenyan coffee processing. This was enough to consider the coffee alternative, not to establish a validated business model. [FAO: Coffee post-harvest handling and processing in Kenya](https://www.fao.org/4/x6939e/X6939e11.htm)

## The buyer, user and complete job

**First buyer hypothesis:** a cooperative or independent aggregation yard that already owns tarpaulins, has access to a moisture meter, and handles enough lots that oral instructions and notebooks become difficult to reconcile. Start near the JKUAT station's area of relevance. Do not market one station as a measurement network for all Kenya.

**Daily user:** yard supervisor, with a clerk or drying attendant completing tasks. Farmers benefit through more accountable handling, but the first product should not require every farmer to buy a subscription or install an app.

The job begins with lot intake: mass, moisture reading, meter/sample note, intended deadline and available yard capacity. Conduit observations are validated and associated with their actual timestamp. The application generates a reasoned operational recommendation. A supervisor assigns a task; an attendant records completion; a new measured moisture reading changes the next action. The record closes with an exportable lot history.

If data is stale or missing, the application should surface that state and require a current local check. Historical replay must identify its historical date. A replay proves the pipeline works with supplied data; it does not prove a real operator acted or that a current forecast was available at that historical moment.

## Competitive position

This matrix describes publicly presented capabilities and the role they play in the customer's workflow. It does not claim a comprehensive audit of every competitor feature.

| Alternative | Verified role or observed substitute | Kavu's proposed position |
|---|---|---|
| **NCPB drying service** | Paid grain drying to the required moisture level; public reference tariff | Complement: compare a reference cost and record a handoff, rather than pretending software replaces a dryer |
| **GrainMate by Sesi Technologies** | Moisture meters for farmers, aggregators and traders; Sesi also presents warehouse monitoring | Complement: accept meter readings; organize lot decisions, assignments and evidence around them |
| **KALRO advice** | Free, authoritative maize handling guidance | Turn selected guidance into a repeatable operational checklist with recorded actions |
| **Weather forecast plus notebook/WhatsApp** | Plausible low-cost incumbent workflow; not established by interviews here | Must beat this on task clarity, history, handover and time saved. A weather screen alone has little defensible value |
| **Mechanical/solar dryer vendors** | Physical drying alternatives; Kenyan research compares their performance and costs | Remain equipment-neutral; record user-specific quotes and outcomes |

Sources: [NCPB service](https://ncpb.co.ke/drying/), [GrainMate product](https://sesitechnologies.com/grainmate-grain-moisture-meter/), [Sesi product portfolio](https://sesitechnologies.com/), [KALRO guidance](https://keep.kalro.org/appfiles/media/vc_files/maize-tot.pdf), [Kenyan dryer comparison](https://agris.fao.org/search/en/providers/123818/records/6748c86e7625988a3720c2da).

**Defensibility hypothesis:** the valuable future dataset is matched lot-level weather, task completion, measured moisture, labour and actual service cost. A record accumulated with customer permission could improve locally calibrated workflows and switching value. It is not a moat today. Avoid calling freely available weather data, a generic LLM, or a dashboard proprietary intelligence.

## Honest economics

### A worked reference calculation

Assume a user enters a **5,000 kg lot** with measured moisture falling from **17% to 15%**. At the NCPB tonne-based tariff:

`(5,000 / 1,000) × (17 − 15) × KSh 377.80 = KSh 3,778`

The label must be **“drying tariff equivalent of measured moisture reduction.”** It is not verified savings, income, value of food saved, or causally attributable impact. The example assumes billing on the entered 5,000 kg mass. Actual chargeable mass, minimum fees, transport and local quotes can differ. Labour, covering costs, losses and software fees are excluded.

Actual net savings require a credible alternative with its documented cost and all incremental costs of the chosen method. Repeated readings should not count the same moisture reduction twice. A moisture increase cannot create positive savings. Moisture reduction removes water mass; do not label the lost weight as food waste prevented.

### Pricing and operating-cost hypotheses

A starting experiment is **KSh 2,500 per active month per site**, including supervisor access, task history and exports. This is a proposed price for customer discovery, not a market-validated price or a current paid plan. Offer a bounded pilot before asking customers to pay. Avoid a percentage-of-savings fee until attribution is defensible.

Illustrative monthly economics at 20 active sites:

| Item | Assumption per site/month |
|---|---:|
| Subscription revenue | KSh 2,500 |
| Shared infrastructure budget: KSh 3,000 / 20 sites | KSh 150 |
| Support: 30 minutes at a planning rate of KSh 400/hour | KSh 200 |
| Backup, monitoring and operating allowance | KSh 150 |
| Contribution before sales, onboarding, taxes and founder pay | KSh 2,000 (80%) |

All operating numbers above are planning assumptions. At two sites, the same infrastructure allocation alone becomes KSh 1,500 per site. Seasonal usage, travel, onboarding and support can erase the apparent margin. A business case must include those costs before claiming profitability. Payment integration is unnecessary to validate the operational product.

### Data costs and dependencies

Open-Meteo's hosted free API is for noncommercial evaluation/prototyping; a commercial hosted service needs the appropriate subscription or an independently compliant hosting approach. Do not describe that API as a permanent zero-cost commercial dependency. [Open-Meteo pricing and terms](https://open-meteo.com/en/pricing)

MET Norway is a possible forecast source with openly licensed data and no API key requirement in its documented tutorial. Global forecasts use ECMWF at roughly 9 km resolution and are not a station measurement. A production adapter must identify the client, cache responses and respect service terms. [MET Norway getting started](https://docs.api.met.no/doc/GettingStarted.html), [data policy](https://docs.api.met.no/doc/License.html), [service terms](https://docs.api.met.no/doc/TermsOfService.html), [global forecast model](https://docs.api.met.no/doc/locationforecast/datamodel.html)

Forecast selection remains an engineering choice. Never claim validated accuracy in Juja without evaluation against independent observations. Never infer grain moisture directly from atmospheric relative humidity.

## Proposed validation pilot

**Status: proposed; no partner is committed.** Recruit three yards with different sizes for one drying season, beginning with discovery interviews and observation of existing work. A minimum of 30 completed lot histories would be an initial usability sample, not statistical proof of loss reduction.

1. Establish baseline practice: who decides, what a missed cover operation costs, how moisture is sampled, what labour and dryer quotes actually cost, and how often records are needed.
2. Run Kavu in shadow mode first. Compare suggested tasks with the supervisor's judgment and record disagreements. Do not withhold existing protective practices to manufacture a comparison.
3. After local review, use it for task allocation while preserving operator judgment. Record timestamps, weather freshness, moisture-meter details, representative sampling notes, overrides, labour and receipts.
4. Evaluate task completion, time from protective instruction to completion, administrative time per lot, moisture rechecks, rewetting events and billable drying costs. Compare like lots and conditions; describe confounding factors.
5. Ask whether managers will renew at the proposed price. Continue only if the workflow is used and the buyer can identify value that exceeds the full cost of service.

Suggested pilot success gates are hypotheses: most eligible lots captured without staff assistance; no unreconciled action history; data problems always visible; operators can explain each recommendation; and at least two sites request continued use at an agreed price. A threshold alone is not proof of effectiveness.

## Claims and implementation boundaries

| Permitted when supported by the record | Requires further evidence |
|---|---|
| Parsed a stated number of supplied Conduit observations | Predicts weather at every farm |
| Created and completed a drying task | Prevented a loss solely because a task was completed |
| A user recorded moisture falling from X to Y | Weather proved maize safe, toxin-free or ready for sale |
| Calculated a clearly labeled tariff equivalent | Saved that amount of money |
| Replayed a historical station window | Delivered a live early warning in that window |
| Built a product and proposed a business model | Has paying customers, signed pilots or a validated moat |

For public language, use “supports drying decisions” and “requires measured moisture.” Regulatory, buyer and laboratory quality checks remain separate from Kavu. Do not display a green “food safe” certification based on a threshold.

## Hackathon submission requirements

The live overview lists the deadline as **25 September 2026, 11:45 p.m. EAT**, equivalent to **26 September, 2:15 a.m. IST**. A stale search excerpt showed 21 September; the directly opened page matched the user's date. [Official overview](https://hack-the-weather.devpost.com/)

The rules require a working prototype, meaningful Conduit use, a 3–5 minute demonstration video, a GitHub repository, a comprehensive README and Devpost project information. The repository should be public; all team members must appear in the video. Eligibility includes students and teams of 2–5 people. AI assistance is permitted, with disclosure and the ability to explain the implementation. [Official rules](https://hack-the-weather.devpost.com/rules)

Shivam Gupta should receive accurate product-owner and decision-making credit. Contributions by teammates must reflect what they actually do. AI tools cannot count as an eligible human teammate. Do not fabricate interviews, roles, user testing, partnerships or member appearances. Human eligibility and final video appearances remain submission dependencies.

For the rubric, prioritize a demonstrable chain: **Conduit observation → explained recommendation → assigned action → recorded completion → new moisture evidence → transparent cost calculation.** The pitch should show this chain with one lot before broadening to the business model. A smaller verified story is stronger than unsupported claims about nationwide food savings.
