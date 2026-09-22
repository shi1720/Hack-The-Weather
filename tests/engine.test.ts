import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPlan, classifyHour, distanceKm, dryingCost, emptyHour, vapourPressureDeficit } from '../src/shared/engine';
import type { Batch, Dataset, Forecast, WeatherHour, Workspace } from '../src/shared/types';

const date = '2026-09-12';
const start = Date.parse(`${date}T00:00:00+03:00`);
function hour(local: number, patch: Partial<WeatherHour> = {}): WeatherHour { return { timestamp: new Date(start + local * 3_600_000).toISOString(), temperatureC: 25, humidityPct: 50, rainMm: 0, windMs: 1, sampleCount: 59, coverage: 0.983, vpdKpa: null, verdict: 'unknown', reasons: [], ...patch }; }
function dataset(hours = Array.from({ length: 24 }, (_, index) => hour(index))): Dataset { return { station: { name: 'JKUAT', latitude: -1.099736, longitude: 37.014528, elevationM: 1523 }, observations: [], hours, summary: { rawRows: 0, uniqueRows: 0, duplicatesRemoved: 0, invalidRows: 0, firstAt: new Date(start).toISOString(), lastAt: new Date(start + 23 * 3_600_000).toISOString(), days: [date], gaps: [] }, sources: [], importedAt: new Date(start).toISOString(), notes: [] }; }
function batch(id = 'b1', patch: Partial<Batch> = {}): Batch { return { id, name: id, farmer: 'Test farmer', weightKg: 500, moisturePct: 17, initialMoisturePct: 17, targetMoisturePct: 13.5, receivedAt: `${date}T06:00:00+03:00`, deadline: `${date}T18:00:00+03:00`, status: 'queued', bay: null, measurements: [], ...patch }; }
function workspace(batches = [batch()]): Workspace { return { revision: 1, batches, tasks: [], audit: [], settings: { name: 'Test yard', capacityKg: 1000, dryerRateKes: 377.8, targetMoisturePct: 13.5, latitude: -1.1, longitude: 37.015, maxDistanceKm: 25 } }; }
afterEach(() => vi.useRealTimers());

describe('transparent weather heuristic', () => {
  it('computes atmospheric VPD from temperature and RH', () => { expect(vapourPressureDeficit(25, 50)).toBeCloseTo(1.584, 3); expect(vapourPressureDeficit(25, 100)).toBe(0); expect(vapourPressureDeficit(NaN, 50)).toBeNull(); });
  it('requires daylight, no rain, sufficient coverage and drying potential', () => {
    expect(classifyHour(hour(10)).verdict).toBe('dry');
    expect(classifyHour(hour(7)).verdict).toBe('cover');
    expect(classifyHour(hour(17)).verdict).toBe('cover');
    expect(classifyHour(hour(10, { humidityPct: 73 })).verdict).toBe('marginal');
    expect(classifyHour(hour(10, { humidityPct: 85 })).verdict).toBe('cover');
    expect(classifyHour(hour(10, { rainMm: 0.01 })).verdict).toBe('cover');
  });
  it.each([{ rainMm: null }, { humidityPct: NaN }, { temperatureC: Infinity }, { coverage: 0.74 }, { sampleCount: 44 }, { humidityPct: 101 }, { coverage: NaN }])('withholds incomplete or invalid inputs: %j', patch => { expect(classifyHour(hour(10, patch)).verdict).toBe('unknown'); });
  it('keeps positive rainfall protective even when another sensor is missing', () => { expect(classifyHour(hour(10, { rainMm: 0.2, temperatureC: null, coverage: 0 })).verdict).toBe('cover'); });
  it('distinguishes forecast hourly values from station sampling coverage', () => { expect(classifyHour(hour(10, { sampleCount: 1, coverage: 1 }), 'forecast').verdict).toBe('dry'); expect(classifyHour(hour(10, { sampleCount: 1, coverage: 1 })).verdict).toBe('unknown'); });
  it('recomputes a caller supplied verdict and VPD', () => { const result = classifyHour(hour(10, { humidityPct: 90, vpdKpa: 99, verdict: 'dry' })); expect(result.verdict).toBe('cover'); expect(result.vpdKpa).toBeLessThan(1); });
});

describe('commercial cost calculation', () => {
  it('quotes per tonne per percentage point, not percent of percent', () => { expect(dryingCost(1000, 18, 13.5)).toBe(1700.1); expect(dryingCost(500, 18, 13.5)).toBe(850.05); expect(dryingCost(1000, 12, 13.5)).toBe(0); });
  it('is monotonic in weight, rate and moisture removal', () => { for (let n = 1; n <= 20; n++) { expect(dryingCost(n * 100, 18, 13.5)).toBeGreaterThan(dryingCost((n - 1) * 100, 18, 13.5)); expect(dryingCost(1000, 14 + n, 13.5)).toBeGreaterThan(dryingCost(1000, 13 + n, 13.5)); } });
  it.each([[NaN, 18, 13.5, 377.8], [500, Infinity, 13.5, 377.8], [-500, 18, 13.5, 377.8], [500, 18, 101, 377.8], [500, 18, 13.5, -1]])('rejects invalid quote %j', (weight, moisture, target, rate) => { expect(() => dryingCost(weight, moisture, target, rate)).toThrow(RangeError); });
});

describe('whole-batch operations planner', () => {
  it('returns 24 EAT hours, selects a contiguous window and preserves its inputs', () => {
    const ws = workspace(), data = dataset(), before = JSON.stringify({ ws, data }); const plan = buildPlan(ws, data, date);
    expect(plan.hours).toHaveLength(24); expect(plan.hours[0].timestamp).toBe('2026-09-11T21:00:00.000Z'); expect(plan.dryHours).toBe(9);
    expect(plan.recommendations[0].action).toBe('spread'); expect(plan.coverBy).toBe('2026-09-12T14:00:00.000Z'); expect(plan.confidence).toBe('good');
    expect(JSON.stringify({ ws, data })).toBe(before); expect(plan.notices.join(' ')).toContain('not a forecast backtest');
  });
  it('never allocates more than capacity and chooses deadline urgency deterministically', () => {
    const ws = workspace([batch('later', { weightKg: 700, moisturePct: 19, deadline: '2026-09-15T18:00:00+03:00' }), batch('urgent', { weightKg: 600 }), batch('small', { weightKg: 400, deadline: '2026-09-14T18:00:00+03:00' })]);
    const plan = buildPlan(ws, dataset(), date); expect(plan.capacityUsedKg).toBe(1000); expect(plan.remainingCapacityKg).toBe(0);
    expect(plan.recommendations.find(r => r.batchId === 'urgent')?.action).toBe('spread'); expect(plan.recommendations.find(r => r.batchId === 'later')?.assignedKg).toBe(0); expect(plan.recommendations.find(r => r.batchId === 'small')?.assignedKg).toBe(400);
    expect(buildPlan({ ...ws, batches: [...ws.batches].reverse() }, dataset(), date)).toEqual(plan);
  });
  it('excludes dispatched batches and escalates high moisture', () => { const plan = buildPlan(workspace([batch('done', { status: 'dispatched' }), batch('wet', { moisturePct: 22 })]), dataset(), date); expect(plan.recommendations).toHaveLength(1); expect(plan.recommendations[0].action).toBe('dryer'); expect(plan.capacityUsedKg).toBe(0); expect(plan.totalDryerCostKes).toBe(dryingCost(500, 22, 13.5)); });
  it('handles zero/invalid capacity without assigning outdoor work', () => { for (const capacityKg of [0, NaN, -1, Infinity]) { const ws = workspace(); ws.settings.capacityKg = capacityKg; const plan = buildPlan(ws, dataset(), date); expect(plan.capacityUsedKg).toBe(0); expect(plan.remainingCapacityKg).toBe(0); expect(plan.recommendations[0].action).toBe('dryer'); } });
  it('reserves existing outdoor occupancy before allocating urgent new batches', () => {
    const ws = workspace([batch('occupied', { weightKg: 700, status: 'drying', bay: 'Open drying yard', deadline: '2026-09-15T18:00:00+03:00' }), batch('urgent', { weightKg: 500 })]);
    const plan = buildPlan(ws, dataset(), date); expect(plan.capacityUsedKg).toBe(700); expect(plan.remainingCapacityKg).toBe(300); expect(plan.recommendations.find(r => r.batchId === 'occupied')?.action).toBe('turn'); expect(plan.recommendations.find(r => r.batchId === 'urgent')?.action).toBe('dryer');
  });
  it('does not release an occupied slot just because a move is recommended', () => {
    const ws = workspace([batch('occupied', { weightKg: 700, moisturePct: 22, status: 'drying', bay: 'Open drying yard' }), batch('new', { weightKg: 500 })]);
    const plan = buildPlan(ws, dataset(), date); expect(plan.capacityUsedKg).toBe(700); expect(plan.recommendations.every(r => r.action !== 'spread')).toBe(true); expect(plan.recommendations.find(r => r.batchId === 'occupied')?.action).toBe('dryer');
  });
  it('prioritizes protecting exposed grain when no weather window exists', () => {
    const plan = buildPlan(workspace([batch('outside', { status: 'drying', bay: null })]), dataset([]), date); expect(plan.recommendations[0].action).toBe('cover'); expect(plan.capacityUsedKg).toBe(500);
  });
  it('does not send grain already in a mechanical dryer back outdoors or book it twice', () => {
    const plan = buildPlan(workspace([batch('dryer', { status: 'drying', bay: 'Mechanical dryer', moisturePct: 22 }), batch('new')]), dataset(), date); expect(plan.recommendations.find(r => r.batchId === 'dryer')?.action).toBe('measure'); expect(plan.capacityUsedKg).toBe(500); expect(plan.totalDryerCostKes).toBe(0);
  });
  it('omits stored grain and blocks uncertain or over-capacity occupancy', () => {
    const ws = workspace([batch('stored', { status: 'ready' }), batch('unknown', { status: 'drying', weightKg: NaN }), batch('new')]); const plan = buildPlan(ws, dataset(), date); expect(plan.recommendations.some(r => r.batchId === 'stored')).toBe(false); expect(plan.recommendations.some(r => r.action === 'spread')).toBe(false);
    const over = buildPlan(workspace([batch('occupied', { weightKg: 1500, status: 'drying' }), batch('new')]), dataset(), date); expect(over.capacityUsedKg).toBe(1500); expect(over.remainingCapacityKg).toBe(0); expect(over.notices.join(' ')).toContain('exceeds configured capacity');
  });
  it('requires a current measurement even when replaying its historical intake day', () => {
    const old = batch('old', { moisturePct: 13, measurements: [{ id: 'm1', moisturePct: 13, measuredAt: `${date}T08:00:00Z`, note: 'Historical meter' }] }); expect(buildPlan(workspace([old]), dataset(), date, 'replay', undefined, Date.parse('2026-09-22T08:00:00Z')).recommendations[0].action).toBe('measure');
  });
  it('does not bridge missing or rainy hours into one drying window', () => { const data = dataset([hour(9), hour(10, { rainMm: 0.2 }), hour(11)]); const plan = buildPlan(workspace(), data, date); expect(plan.dryHours).toBe(2); expect(plan.capacityUsedKg).toBe(0); expect(plan.coverBy).toBeNull(); expect(plan.recommendations[0].action).toBe('dryer'); });
  it('ends the allocation at the first gap or rainfall', () => { const plan = buildPlan(workspace(), dataset([hour(9), hour(10), hour(11, { rainMm: 0.2 }), hour(12), hour(13)]), date); expect(plan.coverBy).toBe(hour(11).timestamp); expect(plan.recommendations[0].reason).toContain('2 contiguous'); });
  it('withholds out of radius weather and missing days', () => { const ws = workspace(); ws.settings.latitude = 0.52; ws.settings.longitude = 35.27; const plan = buildPlan(ws, dataset(), date); expect(plan.confidence).toBe('unavailable'); expect(plan.capacityUsedKg).toBe(0); expect(plan.notices.join(' ')).toContain('operating radius'); expect(buildPlan(workspace(), dataset(), '2026-09-08').hours.every(h => h.verdict === 'unknown')).toBe(true); });
  it('does not turn at-target intake moisture into an automatic storage claim', () => { const plan = buildPlan(workspace([batch('target', { moisturePct: 13 })]), dataset(), date); expect(plan.recommendations[0].action).toBe('measure'); });
  it('requires a fresh measured reading and rejects inconsistent/future measurements', () => {
    vi.useFakeTimers(); vi.setSystemTime('2026-09-22T09:00:00Z');
    const current = batch('measured', { moisturePct: 13, measurements: [{ id: 'm1', moisturePct: 13, measuredAt: '2026-09-22T08:00:00Z', note: 'meter' }] });
    expect(buildPlan(workspace([current]), dataset(), date).recommendations[0].action).toBe('store');
    current.measurements[0].measuredAt = '2026-09-23T08:00:00Z'; expect(buildPlan(workspace([current]), dataset(), date).recommendations[0].action).toBe('measure');
    current.measurements[0].measuredAt = '2026-09-12T08:00:00Z'; current.measurements[0].moisturePct = 18; expect(buildPlan(workspace([current]), dataset(), date).recommendations[0].action).toBe('measure');
  });
  it('fails closed for non-finite batch input without poisoning totals', () => { const plan = buildPlan(workspace([batch('bad', { weightKg: NaN }), batch('okay')]), dataset(), date); expect(plan.recommendations.find(r => r.batchId === 'bad')?.action).toBe('measure'); expect(plan.capacityUsedKg).toBe(500); expect(Number.isFinite(plan.totalDryerCostKes)).toBe(true); });
  it.each(['2026-02-30', 'not-a-date', '2026-9-12', '2026-09-12T00:00:00Z'])('rejects invalid date %s', invalidDate => expect(() => buildPlan(workspace(), dataset(), invalidDate)).toThrow(RangeError));
});

describe('live forecast boundaries', () => {
  function forecast(): Forecast { return { fetchedAt: '2026-09-12T05:00:00Z', issuedAt: '2026-09-12T03:00:00Z', source: 'test model', latitude: -1.1, longitude: 37.015, hours: Array.from({ length: 24 }, (_, index) => hour(index, { sampleCount: 1, coverage: 1 })) }; }
  it('uses model hours explicitly and avoids past work', () => { vi.useFakeTimers(); vi.setSystemTime('2026-09-12T08:30:00Z'); const plan = buildPlan(workspace(), dataset(), date, 'forecast', forecast()); expect(plan.recommendations[0].title).toContain('12:00'); expect(plan.confidence).toBe('limited'); expect(plan.notices.join(' ')).toContain('model guidance'); });
  it('protects currently exposed grain even when a later forecast window is dry', () => { vi.useFakeTimers(); vi.setSystemTime('2026-09-12T06:30:00Z'); const weather = forecast(); weather.hours = weather.hours.map(h => h.timestamp === hour(9).timestamp ? { ...h, rainMm: 0.2 } : h); const plan = buildPlan(workspace([batch('outside', { status: 'drying', bay: 'Open drying yard' })]), dataset(), date, 'forecast', weather); expect(plan.coverBy).not.toBeNull(); expect(plan.recommendations[0].action).toBe('cover'); expect(plan.capacityUsedKg).toBe(500); });
  it('rejects missing, stale, future-issued or distant forecasts', () => { vi.useFakeTimers(); vi.setSystemTime('2026-09-12T08:00:00Z'); for (const input of [undefined, { ...forecast(), fetchedAt: '2026-09-11T00:00:00Z' }, { ...forecast(), issuedAt: '2026-09-13T00:00:00Z' }, { ...forecast(), latitude: 10 }]) { const plan = buildPlan(workspace(), dataset(), date, 'forecast', input); expect(plan.capacityUsedKg).toBe(0); expect(plan.confidence).toBe('unavailable'); } });
  it('marks stale station history without pretending model calibration', () => { vi.useFakeTimers(); vi.setSystemTime('2026-09-12T08:00:00Z'); const data = dataset(); data.summary.lastAt = '2026-08-30T00:00:00Z'; expect(buildPlan(workspace(), data, date, 'forecast', forecast()).notices.join(' ')).toContain('not calibrated'); });
});

it('geography fails closed for invalid coordinates', () => { expect(distanceKm(-1.1, 37, -1.1, 37)).toBe(0); expect(distanceKm(NaN, 37, -1.1, 37)).toBe(Infinity); expect(emptyHour('2026-09-12T00:00:00Z').rainMm).toBeNull(); });
