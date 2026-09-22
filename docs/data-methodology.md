# Kavu data and decision methodology

Kavu converts JKUAT Conduit weather observations into a yard operating plan: which grain batch gets limited outdoor space, when to cover it, which batch needs a dryer quote, and which needs a moisture measurement. It never predicts that a batch will be dry by a particular hour, clears grain for consumption, or claims aflatoxin prevention.

## Source and reproducibility

The [Conduit data platform](https://conduit.jhubafrica.com/) links the [official hackathon resource folder](https://drive.google.com/drive/folders/1KDoCh8vss7nv_B6SuVBlQQssjSh1yaBg). Three GeoCSV exports were downloaded from that folder, not generated or synthetically expanded:

| Local file | Official file | Actual UTC coverage |
| --- | --- | --- |
| `conduit-aug28-sep03.csv` | [Download record](https://drive.google.com/file/d/1uQLj3WHvGeX6WRU3EL0ZcLTDVI_Gl23P/view) | Aug 28 00:00:25–Sep 1 23:58:31, 2026 |
| `conduit-aug31-sep04.csv` | [Download record](https://drive.google.com/file/d/192QZkcS3F3B1OnfxvARbvLs-ZGR3abwE/view) | Aug 31 00:00:24–Sep 4 23:58:18, 2026 |
| `conduit-sep11-sep15.csv` | [Download record](https://drive.google.com/file/d/1XQo9JstB_RzGi40MByI88TLQNQHqXV4Q/view) | Sep 11 00:00:01–Sep 15 23:58:29, 2026 |

The first filename overstates its end date. Only row timestamps determine data coverage. Metadata identifies the station as “Kenya Kiambu JKUAT IOT AWS - Conduti@Empathy1”, sensor 61, at latitude −1.099736, longitude 37.014528, elevation 1,523 m. The metadata attributes the source to `3d-fewsnet.icdp.ucar.edu` and gives [DOI 10.5065/d6v1236q](https://doi.org/10.5065/d6v1236q). These identifiers are preserved as attribution, not evidence of a license grant. Data permissions must be confirmed with its owner before broader redistribution or commercial operations.

Run `npm run data:prepare` to reproduce `public/data/conduit.json` and `data/processed/quality-report.json`. The script hashes the original bytes with SHA-256, preserves source URLs and raw row counts, and writes a deterministic import timestamp. “Imported at” identifies this bundled snapshot; it does not mean the station is currently live.

The bundle contains **21,189 raw rows, 18,364 unique timestamps, and 2,825 removed duplicate rows**. It has zero malformed/timestamp-invalid rows and a genuine **144.029-hour observation gap** between September 4 and September 11 UTC. Non-zero station health flags are retained separately and excluded from favourable-weather evidence. There are 480 explicit hourly slots across 20 Nairobi calendar days: 83 favourable, 22 marginal, 206 protective, and 169 unavailable. Partial days and days with no data remain visible.

## Parsing and quality gates

The importer uses named columns, accepts a timezone-bearing ISO timestamp, rejects impossible calendar dates, and leaves missing values as `null`. It does not coerce empty strings into zero. Structurally malformed rows are counted and rejected. Temperature outside −50–65°C, humidity outside 0–100%, negative rainfall, nonfinite numbers and implausible sensor values are flagged and nulled. These broad physical bounds are input validation, not a claim of calibration accuracy.

| Input | Interpretation |
| --- | --- |
| `SHT Temperature` | Air temperature, °C |
| `SHT Humidity` | Relative humidity, % |
| `Rain Gauge 1` | Incremental recorded rainfall, mm |
| `Wind Speed` | Wind speed, m/s; displayed as context |
| `Health` | Any non-zero or invalid value excludes that sample from favourable-weather evidence |

The export's metadata units label the humidity field as `degC`. This is inconsistent with its field name and 0–100 values. Kavu explicitly interprets `SHT Humidity` as percent and records that assumption; confirmation from the station owner is required before a field pilot. Gauge 2 stays zero throughout the supplied files; it is not used to corroborate Gauge 1. Gauge 1's daily cumulative counters are not summed. Any positive Gauge 1 signal blocks exposed work even when other instruments have a health warning. Undocumented health bit masks are not guessed.

Exact timestamp duplicates are removed before aggregation, so overlapping files cannot double-count rain. Conflicting duplicates fail closed: air variables become unavailable, and any positive rain signal remains protective. In these official files the overlapping rows agree.

Air variables are arithmetic hourly means, and incremental rainfall is summed. A favourable hour needs all of:

- At least 45 complete temperature/humidity/rain observations.
- At least 75% distinct minute coverage; repeated burst samples cannot fill an hour.
- No gap of 15 minutes or more between complete observations, including the hour boundaries.

The observed cadence is approximately one sample per minute. No interpolation bridges gaps. A covered hour with positive rain can still provide a useful protective warning despite incomplete air measurements. Missing rain is never “no rain”. Reported rainfall totals are the sum of recorded increments, not estimates of rainfall during missing intervals.

All operations use **Africa/Nairobi (EAT, UTC+03:00)**. Data timestamps stay UTC to make transfers unambiguous. EAT dates, including the partial September 16 tail, are calculated from the data rather than the operator's browser timezone.

## Explainable decision rules

The engine calculates vapour pressure deficit from hourly air temperature and relative humidity:

`VPD (kPa) = 0.6108 × exp(17.27 × T / (T + 237.3)) × (1 − RH/100)`

This uses the saturation vapour pressure relationship in [FAO-56, Chapter 3](https://www.fao.org/4/x0490e/x0490e07.htm). VPD indicates atmospheric drying potential. It is not a grain moisture model: grain type, layer thickness, airflow, radiation, handling, initial moisture, meter calibration and elapsed drying time all matter. Computing VPD from hourly mean inputs is an approximation, not a measurement of integrated evaporation.

The following are **Kavu's conservative, unvalidated operating heuristics**, not thresholds endorsed by FAO or a fitted machine-learning model:

| Condition | Result |
| --- | --- |
| Any positive hourly rainfall | Cover/protect |
| Insufficient measurements or missing required variables | Withhold outdoor recommendation |
| Outside 08:00–17:00 EAT | Cover/protect |
| RH ≥80% | Cover/protect |
| No recorded rain, RH ≤65%, VPD ≥0.8 kPa | Favourable outdoor hour |
| Other adequately observed daytime conditions | Marginal; do not allocate |

The planner requires at least two contiguous favourable hours and selects the earliest eligible run. An isolated hour cannot justify spreading a batch. Cover time is the end of that run, even if conditions improve again later. An operator must respond sooner if local rain starts. The fixed operating window avoids pretending that sunrise, radiation, staff availability or yard conditions were measured.

Whole batches are allocated by deadline urgency, high moisture, existing work and deterministic identity tie-breaks, with no partial-batch packing. Capacity is a user-entered simultaneous weight limit, not a derived yard-area assessment. Already occupied outdoor space is reserved before any new queue allocation. A recommendation to cover or move grain does not free that space until the operator confirms the action. An in-progress mechanical dryer batch receives a measurement task instead of another outdoor allocation. The engine does not recycle capacity based on an invented drying completion time. Batches at or above 20% measured moisture trigger a prompt mechanical-drying referral under an explicit heuristic; urgent overflow also gets a referral. Other unallocated batches get protected-handling and reassessment instructions, not a guarantee that delaying drying is safe.

A batch at its configured target needs a representative moisture reading before a storage task is suggested. The record must match the batch value and be no older than 24 hours against the actual current clock, including when historical weather is replayed. Historical demonstration readings do not authorize current storage. Future readings are rejected. The task text names the reading's date. The configured target is an operational target; proper sampling, quality testing, hygiene, ventilation and storage procedures remain separate decisions.

## Forecast and geography boundaries

Historical replay consumes observations from the **whole selected day**, including weather after the displayed decision time. It is a retrospective workflow demonstration. It is not a held-out backtest, a claim of forecast skill, or evidence of avoided losses.

Live planning can accept a separate forecast with its own source, issued time, fetch time and coordinates. Forecast hours are treated as model values, not 60 station samples. The engine requires a fetch age no greater than six hours, an issue age no greater than 24 hours and valid values for required fields. It excludes already-passed hours from new spread allocations. If model data are absent, stale or inconsistent, recommendations fail closed. Stale Conduit history is disclosed; Kavu does not claim that archived measurements bias-correct or validate a current forecast.

A user-configured radius limits weather transfer to the yard. Invalid coordinates and references outside the radius withhold outdoor allocation. A short distance alone does not prove local representativeness; a pilot must compare on-site rain and moisture observations with the reference source.

## Costs, evidence and validation

An indicative mechanical-dryer quote is calculated as:

`batch kg / 1,000 × max(0, measured moisture − target moisture) × configured KES rate`

The default rate is KES 377.80 per tonne per moisture percentage point, published on the [NCPB drying service page](https://ncpb.co.ke/drying/) and verified September 22, 2026. That page also lists KES 18.90 per 50 kg; this rounded bag figure differs slightly from the tonne figure. Kavu consistently uses the published tonne rate. It is configurable and must be confirmed with the operator. For example, one tonne from 18% to 13.5% gives an indicative KES 1,700.10 before any unrepresented transport, minimum, handling or price adjustments. It is a quote scenario, not achieved savings or a promise of a dryer booking. The planner does not estimate financial savings from sun drying because no validated moisture-removal model is present.

Automated tests cover input corruption, duplicate rain, metadata/location mismatch, missing periods, minute coverage, station health, calendar/timezone errors, rainy and humid hours, nonfinite quote values, quote monotonicity, capacity constraints, priority, freshness, geography, measured-moisture gates and input immutability. Source integration tests verify SHA-256 hashes and recover contrasting real days: September 12 has six favourable hours, while September 15 has none.

Before claiming operational impact, a prospective pilot must compare the actual operator workflow against recorded baseline practice. Record layer thickness, grain variety, batch weights, calibrated meter readings, labour, rain interruptions, energy use, drying charges, rejected lots and final quality checks. Define outcomes before collecting data. No pilot interviews, customers, deployment outcomes, safety validation or measured savings are claimed by this repository.
