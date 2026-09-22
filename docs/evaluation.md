# Controlled evaluation: does Conduit change the decision?

Kavu's working planner allocates 2,700 kg to outdoor drying under the real September 12 observations. Replacing those conditions with September 15's humid weather reduces outdoor allocation to zero and refers the same-day priority batch to mechanical drying. Removing weather entirely also withholds outdoor work. This is evidence that the implementation meaningfully uses Conduit; it is not a claim about prediction accuracy or field impact.

## Reproduce

Run `npm run data:prepare`, then `npx tsx scripts/evaluate.ts`. The report is written to `public/data/evaluation.json` and this document is regenerated. The script asserts expected decisions, capacity and moisture-verification invariants and exits unsuccessfully if they change. It requires no network request or API key.

Source bundle SHA-256: `87a49393c721f6b84f46ee4bae63be57ceaed767b1d1810554228001c932cdd8`. Source file hashes and URLs are included in the JSON report. The fixed analysis clock is September 22, 2026, 09:00 EAT.

## Controlled inputs

The same four fictional batches are evaluated in every case: A, 1,800 kg at 18.2%, due on the planning day; B, 900 kg at 16.1%, due the following day; C, 650 kg at 14.5%, due two days later; D, 500 kg at 12.8%, due on the planning day. The operating target is 13%, simultaneous yard capacity is 3,000 kg, and the reference weather location is less than one kilometre from the example yard. All intake measurements are historical and require remeasurement before current storage.

The indicative dryer rate is KES 377.80 per tonne per moisture percentage point, from the [NCPB drying service page](https://ncpb.co.ke/drying/), verified September 22, 2026. It is a configurable reference, not a current booking or negotiated offer.

To isolate weather, **all batch records, deadlines, weights, moisture levels, yard settings and the September 12 planning date are held identical**. For this comparison only, September 15 and September 8 hourly timestamps are shifted onto the common planning date while preserving their EAT hour of day and all numeric weather values. The production dataset is never changed. This explicit counterfactual alignment avoids accidentally attributing older deadlines or newer measurements to a weather effect.

## Results

| Weather input | Favourable hours | Outdoor kg | Evidence confidence | Batch actions | Suggested dryer budget, KES |
| --- | ---: | ---: | --- | --- | ---: |
| Real Conduit weather: 12 September | 6 | 2,700 | good | A: spread; D: measure; B: spread; C: cover | 0.00 |
| Real Conduit weather: 15 September | 0 | 0 | good | A: dryer; D: measure; B: cover; C: cover | 3536.21 |
| Real Conduit gap: 8 September | 0 | 0 | unavailable | A: dryer; D: measure; B: cover; C: cover | 3536.21 |
| Conduit removed from the 12 September case | 0 | 0 | unavailable | A: dryer; D: measure; B: cover; C: cover | 3536.21 |

The September 12 drying run ends at **17:00 EAT**. Batch C does not fit into the remaining 300 kg; the planner does not split it or assume another batch has become dry. The KES 3,536.21 referral quote in unsuitable/missing-weather scenarios is 1.8 tonnes × (18.2 − 13) percentage points × KES 377.80. It is not a measured extra cost or a claimed saving.

“Good” on the humid day means the daytime weather evidence is adequately covered; it does **not** mean that the weather is favourable. Missing-data cases say “unavailable”. All four cases require a fresh moisture reading for batch D before storage.

## What this proves, and what it cannot prove

The same executable path used by the app produces the report. Conduit input changes batch-level work, affects whole-batch yard allocation, triggers an explicit dryer referral, and removes outdoor authorization when data are absent. The required dataset therefore has an operational role beyond a decorative chart.

This evaluation uses retrospectively observed weather from the whole day. It has no train/test split because it makes no machine-learning or forecasting claim. There are no measured grain outcomes, commercial customers, controlled field trial, energy readings or labour measurements. It cannot establish avoided losses, earnings, emissions reductions, moisture-removal rates, aflatoxin risk or predictive performance.

A next-stage prospective pilot should preregister the operating protocol and compare actual drying tasks, calibrated meter readings, labour time, rehandling, rain interruptions, measured energy and charges against the operator's baseline. Grain condition and local safety procedures need independent validation.

## Robustness audit

The shared engine tests cover rainy/invalid/missing weather, malformed CSV rows, overlapping exports, duplicate rainfall, interval gaps, location mismatch, stale forecasts, invalid dates, nonfinite numbers, whole-batch capacity, deadline priority, existing occupancy, mechanical drying in progress and current moisture verification. Integration tests verify the raw-source hashes and the actual September 12/15 weather contrast.

The audit fixed four operational risks: a proposed move no longer frees space before confirmation; a batch already in a mechanical dryer cannot be allocated outdoors again; current exposed grain receives a protective action if conditions are unsuitable even when a later dry window exists; and historical intake readings cannot authorize present-day storage. New live allocations use upcoming hours only.
