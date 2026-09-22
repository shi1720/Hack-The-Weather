import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { buildPlan, DEFAULT_DRYER_RATE_KES, formatLocalTime, localDate } from '../src/shared/engine';
import type { Batch, Dataset, Plan, Workspace } from '../src/shared/types';

// Controlled retrospective workflow comparison, not prediction accuracy or observed commercial impact.
const SOURCE_PATH = 'public/data/conduit.json';
const text = await readFile(SOURCE_PATH, 'utf8');
const dataset = JSON.parse(text) as Dataset;
const planningDate = '2026-09-12';
const clock = Date.parse('2026-09-22T06:00:00.000Z');
const specs = [
  { id: 'A', name: 'Priority intake', weightKg: 1800, moisturePct: 18.2, deadline: '2026-09-12' },
  { id: 'B', name: 'Next-day intake', weightKg: 900, moisturePct: 16.1, deadline: '2026-09-13' },
  { id: 'C', name: 'Flexible intake', weightKg: 650, moisturePct: 14.5, deadline: '2026-09-14' },
  { id: 'D', name: 'At-target intake', weightKg: 500, moisturePct: 12.8, deadline: '2026-09-12' },
];
const workspace: Workspace = {
  revision: 0, tasks: [], audit: [],
  settings: { name: 'Controlled evaluation yard', capacityKg: 3000, targetMoisturePct: 13, dryerRateKes: DEFAULT_DRYER_RATE_KES, latitude: -1.0916, longitude: 37.014, maxDistanceKm: 10 },
  batches: specs.map(spec => ({ ...spec, farmer: 'Fictional evaluation batch', initialMoisturePct: spec.moisturePct, targetMoisturePct: 13, receivedAt: '2026-09-12T03:00:00Z', status: 'queued', bay: null, measurements: [{ id: `intake-${spec.id}`, moisturePct: spec.moisturePct, measuredAt: '2026-09-12T03:00:00Z', note: 'Fictional evaluation input; not a pilot observation.' }] })) satisfies Batch[],
};

/** Preserve weather values and relative hour-of-day; map dates only to hold queue/deadline inputs fixed. */
function weatherFromDate(sourceDate: string): Dataset {
  const sourceStart = Date.parse(`${sourceDate}T00:00:00+03:00`);
  const planningStart = Date.parse(`${planningDate}T00:00:00+03:00`);
  const hours = dataset.hours.filter(hour => localDate(hour.timestamp) === sourceDate).map(hour => ({ ...hour, timestamp: new Date(Date.parse(hour.timestamp) - sourceStart + planningStart).toISOString(), reasons: [...hour.reasons] }));
  return { ...dataset, hours };
}
function summarize(plan: Plan) {
  return {
    mode: plan.mode, planningDate: plan.date, confidence: plan.confidence, favourableHours: plan.dryHours,
    coverByEAT: plan.coverBy ? formatLocalTime(plan.coverBy) : null,
    allocatedOrOccupiedKg: plan.capacityUsedKg, remainingCapacityKg: plan.remainingCapacityKg,
    suggestedDryerBudgetKes: plan.totalDryerCostKes,
    decisions: plan.recommendations.map(rec => ({ batch: rec.batchId, action: rec.action, assignedKg: rec.assignedKg, dryerQuoteKes: rec.estimatedDryerCostKes, title: rec.title, reason: rec.reason })),
    notices: plan.notices,
  };
}
const scenarios = [
  { id: 'favourable', label: 'Real Conduit weather: 12 September', sourceDate: '2026-09-12', data: weatherFromDate('2026-09-12') },
  { id: 'humid', label: 'Real Conduit weather: 15 September', sourceDate: '2026-09-15', data: weatherFromDate('2026-09-15') },
  { id: 'gap', label: 'Real Conduit gap: 8 September', sourceDate: '2026-09-08', data: weatherFromDate('2026-09-08') },
  { id: 'ablated', label: 'Conduit removed from the 12 September case', sourceDate: null, data: { ...dataset, observations: [], hours: [] } },
].map(scenario => ({ id: scenario.id, label: scenario.label, weatherSourceDate: scenario.sourceDate, ...summarize(buildPlan(workspace, scenario.data, planningDate, 'replay', undefined, clock)) }));

const baseline = scenarios[0];
const expected = [
  ['favourable', 6, 2700, 'good', 0],
  ['humid', 0, 0, 'good', 3536.21],
  ['gap', 0, 0, 'unavailable', 3536.21],
  ['ablated', 0, 0, 'unavailable', 3536.21],
] as const;
for (const [id, dry, kg, confidence, budget] of expected) {
  const actual = scenarios.find(item => item.id === id)!;
  if (actual.favourableHours !== dry || actual.allocatedOrOccupiedKg !== kg || actual.confidence !== confidence || actual.suggestedDryerBudgetKes !== budget) throw new Error(`Evaluation invariant changed for ${id}; inspect source data and policy before updating evidence.`);
}
for (const scenario of scenarios) {
  if (scenario.allocatedOrOccupiedKg > workspace.settings.capacityKg) throw new Error(`Capacity violated in ${scenario.id}.`);
  if (scenario.decisions.find(rec => rec.batch === 'D')?.action !== 'measure') throw new Error(`Unmeasured storage was recommended in ${scenario.id}.`);
}
const comparison = scenarios.slice(1).map(scenario => ({ scenario: scenario.id, changedActions: scenario.decisions.filter(rec => baseline.decisions.find(original => original.batch === rec.batch)?.action !== rec.action).map(rec => ({ batch: rec.batch, before: baseline.decisions.find(original => original.batch === rec.batch)!.action, after: rec.action })), changeInOutdoorAllocationKg: scenario.allocatedOrOccupiedKg - baseline.allocatedOrOccupiedKg }));
const report = {
  title: 'Kavu controlled retrospective decision evaluation', generatedAt: new Date(clock).toISOString(),
  purpose: 'Demonstrate that real Conduit conditions causally change operational recommendations while batch weights, moisture, deadlines, capacity, rates and planning date remain identical.',
  design: 'For comparison only, hourly timestamps from September 15 and September 8 are shifted onto the September 12 operational clock, preserving their Nairobi hour of day and all weather values. The production dataset is untouched. September 8 is a genuine no-observation day. The fourth scenario removes weather entirely. These are counterfactual workflow scenarios, not forecasts, predictions or measured outcomes.',
  noClaims: ['No trained ML model or forecast skill score', 'No measured moisture reduction or assumed drying completion', 'No avoided-loss, energy or financial-savings claim', 'No food safety or aflatoxin claim', 'No real customers, interviews or field pilot'],
  datasetSha256: createHash('sha256').update(text).digest('hex'), sourceFiles: dataset.sources,
  fixedInputs: { planningDate, analysisClock: new Date(clock).toISOString(), settings: workspace.settings, batches: workspace.batches },
  scenarios, comparison,
  conclusions: [
    'With favourable observed weather, two whole batches receive 2,700 kg of the 3,000 kg yard capacity; the 650 kg overflow batch waits.',
    'With unsuitable observed weather, there is no outdoor allocation. The same-day priority batch receives an indicative mechanical-dryer referral; later batches stay protected.',
    'Removing Conduit produces no outdoor authorization. A real missing-data day also produces no outdoor authorization, with unavailable rather than good evidence confidence.',
    'The at-target intake always requires a fresh measured reading. Weather does not substitute for grain measurement.',
    'Differences establish functional dependence on Conduit data, not business impact. Prospective operator testing is required to measure labour, cost, loss or energy effects.',
  ],
};
await mkdir('public/data', { recursive: true });
await writeFile('public/data/evaluation.json', `${JSON.stringify(report, null, 2)}\n`);

const table = scenarios.map(scenario => `| ${scenario.label} | ${scenario.favourableHours} | ${scenario.allocatedOrOccupiedKg.toLocaleString('en-KE')} | ${scenario.confidence} | ${scenario.decisions.map(rec => `${rec.batch}: ${rec.action}`).join('; ')} | ${scenario.suggestedDryerBudgetKes.toFixed(2)} |`).join('\n');
const doc = `# Controlled evaluation: does Conduit change the decision?\n\nKavu's working planner allocates 2,700 kg to outdoor drying under the real September 12 observations. Replacing those conditions with September 15's humid weather reduces outdoor allocation to zero and refers the same-day priority batch to mechanical drying. Removing weather entirely also withholds outdoor work. This is evidence that the implementation meaningfully uses Conduit; it is not a claim about prediction accuracy or field impact.\n\n## Reproduce\n\nRun \`npm run data:prepare\`, then \`npx tsx scripts/evaluate.ts\`. The report is written to \`public/data/evaluation.json\` and this document is regenerated. The script asserts expected decisions, capacity and moisture-verification invariants and exits unsuccessfully if they change. It requires no network request or API key.\n\nSource bundle SHA-256: \`${report.datasetSha256}\`. Source file hashes and URLs are included in the JSON report. The fixed analysis clock is September 22, 2026, 09:00 EAT.\n\n## Controlled inputs\n\nThe same four fictional batches are evaluated in every case: A, 1,800 kg at 18.2%, due on the planning day; B, 900 kg at 16.1%, due the following day; C, 650 kg at 14.5%, due two days later; D, 500 kg at 12.8%, due on the planning day. The operating target is 13%, simultaneous yard capacity is 3,000 kg, and the reference weather location is less than one kilometre from the example yard. All intake measurements are historical and require remeasurement before current storage.\n\nThe indicative dryer rate is KES 377.80 per tonne per moisture percentage point, from the [NCPB drying service page](https://ncpb.co.ke/drying/), verified September 22, 2026. It is a configurable reference, not a current booking or negotiated offer.\n\nTo isolate weather, **all batch records, deadlines, weights, moisture levels, yard settings and the September 12 planning date are held identical**. For this comparison only, September 15 and September 8 hourly timestamps are shifted onto the common planning date while preserving their EAT hour of day and all numeric weather values. The production dataset is never changed. This explicit counterfactual alignment avoids accidentally attributing older deadlines or newer measurements to a weather effect.\n\n## Results\n\n| Weather input | Favourable hours | Outdoor kg | Evidence confidence | Batch actions | Suggested dryer budget, KES |\n| --- | ---: | ---: | --- | --- | ---: |\n${table}\n\nThe September 12 drying run ends at **${baseline.coverByEAT} EAT**. Batch C does not fit into the remaining 300 kg; the planner does not split it or assume another batch has become dry. The KES 3,536.21 referral quote in unsuitable/missing-weather scenarios is 1.8 tonnes × (18.2 − 13) percentage points × KES 377.80. It is not a measured extra cost or a claimed saving.\n\n“Good” on the humid day means the daytime weather evidence is adequately covered; it does **not** mean that the weather is favourable. Missing-data cases say “unavailable”. All four cases require a fresh moisture reading for batch D before storage.\n\n## What this proves, and what it cannot prove\n\nThe same executable path used by the app produces the report. Conduit input changes batch-level work, affects whole-batch yard allocation, triggers an explicit dryer referral, and removes outdoor authorization when data are absent. The required dataset therefore has an operational role beyond a decorative chart.\n\nThis evaluation uses retrospectively observed weather from the whole day. It has no train/test split because it makes no machine-learning or forecasting claim. There are no measured grain outcomes, commercial customers, controlled field trial, energy readings or labour measurements. It cannot establish avoided losses, earnings, emissions reductions, moisture-removal rates, aflatoxin risk or predictive performance.\n\nA next-stage prospective pilot should preregister the operating protocol and compare actual drying tasks, calibrated meter readings, labour time, rehandling, rain interruptions, measured energy and charges against the operator's baseline. Grain condition and local safety procedures need independent validation.\n\n## Robustness audit\n\nThe shared engine tests cover rainy/invalid/missing weather, malformed CSV rows, overlapping exports, duplicate rainfall, interval gaps, location mismatch, stale forecasts, invalid dates, nonfinite numbers, whole-batch capacity, deadline priority, existing occupancy, mechanical drying in progress and current moisture verification. Integration tests verify the raw-source hashes and the actual September 12/15 weather contrast.\n\nThe audit fixed four operational risks: a proposed move no longer frees space before confirmation; a batch already in a mechanical dryer cannot be allocated outdoors again; current exposed grain receives a protective action if conditions are unsuitable even when a later dry window exists; and historical intake readings cannot authorize present-day storage. New live allocations use upcoming hours only.\n`;
await writeFile('docs/evaluation.md', doc);
console.log(JSON.stringify({ datasetSha256: report.datasetSha256, scenarios: scenarios.map(scenario => ({ id: scenario.id, dryHours: scenario.favourableHours, allocatedKg: scenario.allocatedOrOccupiedKg, confidence: scenario.confidence, dryerBudgetKes: scenario.suggestedDryerBudgetKes, decisions: scenario.decisions.map(rec => `${rec.batch}:${rec.action}`) })), comparison }, null, 2));
