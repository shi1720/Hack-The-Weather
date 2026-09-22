import { describe, expect, it } from 'vitest';
import { applyCommand, createDemoWorkspace, createWorkspace, defaultSettings, WorkspaceError } from '../src/shared/workspace';
import type { Dataset, Forecast, Workspace } from '../src/shared/types';

const NOW = '2026-09-12T06:00:00.000Z';
let nextId = 0;
const context = () => ({ now: NOW, id: () => `test-${++nextId}` });
const intake = { type: 'batch.create' as const, name: 'Harvest A', farmer: 'Test farmer', weightKg: 1000, moisturePct: 18, deadline: '2026-09-13' };
const fixture: Dataset = {
  station: { name: 'Test station', latitude: defaultSettings.latitude, longitude: defaultSettings.longitude, elevationM: 1500 }, observations: [],
  hours: Array.from({ length: 5 }, (_, i) => ({ timestamp: `2026-09-12T${String(i + 6).padStart(2, '0')}:00:00Z`, temperatureC: 28, humidityPct: 40, rainMm: 0, windMs: 2, sampleCount: 60, coverage: 1, vpdKpa: 2, verdict: 'dry' as const, reasons: [] })),
  sources: [], importedAt: NOW, notes: [], summary: { rawRows: 300, uniqueRows: 300, duplicatesRemoved: 0, invalidRows: 0, firstAt: NOW, lastAt: '2026-09-12T10:59:00Z', days: ['2026-09-12'], gaps: [] },
};
describe('workspace commands', () => {
  it('creates real accounts empty and demos explicitly fictional', () => {
    expect(createWorkspace().batches).toHaveLength(0);
    expect(createDemoWorkspace().batches).toHaveLength(4);
    expect(createDemoWorkspace().audit[0].detail).toMatch(/Fictional/);
  });
  it('applies intake immutably and captures measured moisture instead of predicting it', () => {
    const original = createWorkspace();
    const next = applyCommand(original, intake, context());
    expect(original.batches).toHaveLength(0);
    expect(next.revision).toBe(1);
    expect(next.batches[0].measurements[0].moisturePct).toBe(18);
    expect(next.batches[0].initialMoisturePct).toBe(18);
  });
  it.each([-1, 0, Infinity, NaN, 100001])('rejects invalid batch weight %s', weightKg => {
    expect(() => applyCommand(createWorkspace(), { ...intake, weightKg }, context())).toThrow(WorkspaceError);
  });
  it('rejects impossible dates, unknown fields, and cross-workspace references', () => {
    expect(() => applyCommand(createWorkspace(), { ...intake, deadline: '2026-02-30' }, context())).toThrow();
    expect(() => applyCommand(createWorkspace(), { ...intake, userId: 'victim' }, context())).toThrow();
    expect(() => applyCommand(createWorkspace(), { type: 'batch.measure', batchId: 'not-owned', moisturePct: 12, note: '' }, context())).toThrow(/not found/);
  });
  it('gates storage on a fresh verified meter reading and never lets a dryer task fake drying', () => {
    let w = applyCommand(createWorkspace(), intake, context());
    const batchId = w.batches[0].id;
    expect(() => applyCommand(w, { type: 'batch.status', batchId, status: 'ready' }, context())).toThrow(/meter reading/);
    w.tasks.push({ id: 'dryer', batchId, action: 'dryer', title: 'Book mechanical dryer', reason: 'Wet grain', dueAt: NOW, status: 'pending', completedAt: null });
    w = applyCommand(w, { type: 'task.complete', taskId: 'dryer' }, context());
    expect(w.batches[0].moisturePct).toBe(18);
    expect(w.batches[0].status).toBe('queued');
    expect(w.audit[0].detail).toContain('no drying start or outcome');
    w = applyCommand(w, { type: 'batch.measure', batchId, moisturePct: 13, note: 'Handheld meter, three samples' }, context());
    const ready = applyCommand(w, { type: 'batch.status', batchId, status: 'ready' }, context());
    expect(ready.batches[0].status).toBe('ready');
    expect(() => applyCommand(w, { type: 'batch.status', batchId, status: 'ready' }, { ...context(), now: '2026-09-14T06:00:00Z' })).toThrow(/fresh/);
  });
  it('marks measurement tasks done only when a measurement is entered', () => {
    let w = applyCommand(createWorkspace(), intake, context());
    const batchId = w.batches[0].id;
    w.tasks.push({ id: 'meter', batchId, action: 'measure', title: 'Measure', reason: 'Verify storage', dueAt: NOW, status: 'pending', completedAt: null });
    expect(() => applyCommand(w, { type: 'task.complete', taskId: 'meter' }, context())).toThrow(/Record/);
    w = applyCommand(w, { type: 'batch.measure', batchId, moisturePct: 13, note: '' }, context());
    expect(w.tasks[0].status).toBe('done');
  });
  it('withdraws ready status if a new meter reading exceeds the target', () => {
    let w = applyCommand(createWorkspace(), { ...intake, moisturePct: 12.8 }, context());
    const batchId = w.batches[0].id;
    w = applyCommand(w, { type: 'batch.status', batchId, status: 'ready' }, context());
    w = applyCommand(w, { type: 'batch.measure', batchId, moisturePct: 15, note: 'Recheck' }, context());
    expect(w.batches[0].status).toBe('covered');
  });
  it('closes dispatched grain and retains targets on existing batches', () => {
    let w = applyCommand(createWorkspace(), { ...intake, moisturePct: 13 }, context());
    const batchId = w.batches[0].id;
    w = applyCommand(w, { type: 'settings.update', settings: { ...w.settings, targetMoisturePct: 12 } }, context());
    expect(w.batches[0].targetMoisturePct).toBe(13.0);
    w = applyCommand(w, { type: 'batch.status', batchId, status: 'ready' }, context());
    w = applyCommand(w, { type: 'batch.status', batchId, status: 'dispatched' }, context());
    expect(() => applyCommand(w, { type: 'batch.measure', batchId, moisturePct: 12, note: '' }, context())).toThrow(/Dispatched/);
    expect(() => applyCommand(w, { type: 'batch.status', batchId, status: 'queued' }, context())).toThrow(/closed/);
  });
  it('commits plan tasks once per date, mode, batch and action', () => {
    const w = applyCommand(createWorkspace(), intake, context());
    const cmd = { type: 'plan.commit' as const, date: '2026-09-12', mode: 'replay' as const };
    const first = applyCommand(w, cmd, { ...context(), dataset: fixture });
    expect(first.tasks.length).toBeGreaterThan(0);
    const second = applyCommand(first, cmd, { ...context(), dataset: fixture });
    expect(second).toBe(first);
    expect(second.revision).toBe(first.revision);
    expect(second.batches[0].moisturePct).toBe(18);
  });
  it('creates fresh same-day outdoor cycles after shelter while preserving completed evidence', () => {
    let ctx = { ...context(), dataset: fixture, demo: true };
    const cmd = { type: 'plan.commit' as const, date: '2026-09-12', mode: 'replay' as const };
    let w = applyCommand(applyCommand(createWorkspace(), intake, ctx), cmd, ctx);
    const firstSpread = w.tasks.find(t => t.action === 'spread')!;
    const firstTurn = w.tasks.find(t => t.action === 'turn')!;
    const firstCover = w.tasks.find(t => t.action === 'cover')!;
    w = applyCommand(w, { type: 'task.complete', taskId: firstSpread.id }, ctx);
    w = applyCommand(w, { type: 'task.complete', taskId: firstTurn.id }, ctx);
    ctx = { ...ctx, now: '2026-09-12T11:00:00Z' };
    w = applyCommand(w, { type: 'batch.measure', batchId: w.batches[0].id, moisturePct: 17, note: 'Window end reading' }, ctx);
    w = applyCommand(w, { type: 'task.complete', taskId: firstCover.id }, ctx);
    const completed = structuredClone(w.tasks);
    expect(completed.every(t => t.status === 'done')).toBe(true);
    expect(w.batches[0].status).toBe('covered');
    expect(applyCommand(w, { type: 'task.complete', taskId: firstSpread.id }, ctx)).toBe(w);
    w = applyCommand(w, cmd, ctx);
    expect(w.tasks.filter(t => t.status === 'done')).toEqual(completed);
    expect(w.tasks.filter(t => t.status === 'pending').map(t => t.action).sort()).toEqual(['cover', 'measure', 'spread', 'turn']);
    expect(new Set(w.tasks.map(t => t.id)).size).toBe(w.tasks.length);
    expect(applyCommand(w, cmd, ctx)).toBe(w);
    const nextSpread = w.tasks.find(t => t.status === 'pending' && t.action === 'spread')!;
    expect(nextSpread.id).not.toBe(firstSpread.id);
    w = applyCommand(w, { type: 'task.complete', taskId: nextSpread.id }, ctx);
    expect(w.batches[0].status).toBe('drying');
    const nextCover = w.tasks.find(t => t.status === 'pending' && t.action === 'cover')!;
    w = applyCommand(w, { type: 'task.complete', taskId: nextCover.id }, ctx);
    w = applyCommand(w, cmd, ctx);
    expect(w.tasks.filter(t => t.status === 'pending').map(t => t.action).sort()).toEqual(['cover', 'measure', 'spread', 'turn']);
    expect(w.tasks.find(t => t.status === 'pending' && t.action === 'spread')?.id).not.toBe(nextSpread.id);
    expect(w.tasks.filter(t => t.status === 'done' && t.action === 'spread')).toHaveLength(2);
    expect(applyCommand(w, cmd, ctx)).toBe(w);
  });
  it('can resume a forecast drying allocation after rain and a confirmed same-day shelter move', () => {
    const forecast: Forecast = { fetchedAt: NOW, issuedAt: NOW, source: 'Test forecast', latitude: defaultSettings.latitude, longitude: defaultSettings.longitude, hours: fixture.hours };
    const ctx = { ...context(), dataset: fixture, forecast };
    const cmd = { type: 'plan.commit' as const, date: '2026-09-12', mode: 'forecast' as const };
    let w = applyCommand(applyCommand(createWorkspace(), intake, ctx), cmd, ctx);
    const initialSpread = w.tasks.find(t => t.action === 'spread')!;
    const oldTurn = w.tasks.find(t => t.action === 'turn')!;
    w = applyCommand(w, { type: 'task.complete', taskId: initialSpread.id }, ctx);
    const rainContext = { ...ctx, now: '2026-09-12T07:00:00Z', forecast: { ...forecast, hours: fixture.hours.map((h, i) => i === 1 ? { ...h, rainMm: 1 } : h) } };
    w = applyCommand(w, cmd, rainContext);
    const shelter = w.tasks.find(t => t.status === 'pending' && t.action === 'cover')!;
    w = applyCommand(w, { type: 'task.complete', taskId: shelter.id }, rainContext);
    const laterContext = { ...ctx, now: '2026-09-12T09:00:00Z' };
    w = applyCommand(w, cmd, laterContext);
    const freshSpread = w.tasks.find(t => t.status === 'pending' && t.action === 'spread')!;
    expect(freshSpread).toBeDefined();
    expect(freshSpread.id).not.toBe(initialSpread.id);
    expect(w.tasks.filter(t => t.status === 'pending').map(t => t.action).sort()).toEqual(['cover', 'measure', 'spread', 'turn']);
    expect(applyCommand(w, cmd, laterContext)).toBe(w);
    expect(() => applyCommand(w, { type: 'task.complete', taskId: oldTurn.id }, laterContext)).toThrow(/not found/);
    w = applyCommand(w, { type: 'task.complete', taskId: freshSpread.id }, laterContext);
    expect(w.batches[0].status).toBe('drying');
    expect(w.tasks.find(t => t.id === initialSpread.id)?.status).toBe('done');
    expect(w.tasks.find(t => t.id === shelter.id)?.status).toBe('done');
  });
  it('replaces unperformed outdoor jobs after shelter without erasing the shelter confirmation', () => {
    const ctx = { ...context(), dataset: fixture, demo: true };
    const cmd = { type: 'plan.commit' as const, date: '2026-09-12', mode: 'replay' as const };
    let w = applyCommand(applyCommand(createWorkspace(), intake, ctx), cmd, ctx);
    const oldSpread = w.tasks.find(t => t.action === 'spread')!;
    const shelter = w.tasks.find(t => t.action === 'cover')!;
    w = applyCommand(w, { type: 'task.complete', taskId: shelter.id }, ctx);
    w = applyCommand(w, cmd, ctx);
    expect(w.tasks.some(t => t.id === oldSpread.id)).toBe(false);
    expect(w.tasks.find(t => t.id === shelter.id)?.status).toBe('done');
    expect(w.tasks.filter(t => t.status === 'pending').map(t => t.action).sort()).toEqual(['cover', 'measure', 'spread', 'turn']);
    expect(applyCommand(w, cmd, ctx)).toBe(w);
  });
  it('creates fresh shelter reminders when an operator records an outdoor return directly', () => {
    const ctx = { ...context(), dataset: fixture, demo: true };
    const cmd = { type: 'plan.commit' as const, date: '2026-09-12', mode: 'replay' as const };
    let w = applyCommand(applyCommand(createWorkspace(), intake, ctx), cmd, ctx);
    const shelter = w.tasks.find(t => t.action === 'cover')!;
    w = applyCommand(w, { type: 'task.complete', taskId: shelter.id }, ctx);
    w = applyCommand(w, { type: 'batch.status', batchId: w.batches[0].id, status: 'drying' }, ctx);
    w = applyCommand(w, cmd, ctx);
    expect(w.tasks.filter(t => t.status === 'pending').map(t => t.action).sort()).toEqual(['cover', 'measure', 'turn']);
    expect(w.tasks.find(t => t.id === shelter.id)?.status).toBe('done');
    expect(applyCommand(w, cmd, ctx)).toBe(w);
  });
  it('prevents stale spread tasks from overfilling the physical yard', () => {
    let w = applyCommand(createWorkspace(), { ...intake, weightKg: 2000 }, context());
    w = applyCommand(w, { ...intake, name: 'Second batch', weightKg: 2000 }, context());
    w = applyCommand(w, { type: 'batch.status', batchId: w.batches[0].id, status: 'drying' }, context());
    const batchId = w.batches[1].id;
    w.tasks.push({ id: 'spread', batchId, action: 'spread', title: 'Spread', reason: 'Previously planned', dueAt: NOW, status: 'pending', completedAt: null });
    expect(() => applyCommand(w, { type: 'task.complete', taskId: 'spread' }, context())).toThrow(/capacity/);
    expect(() => applyCommand(w, { type: 'batch.status', batchId, status: 'drying' }, context())).toThrow(/capacity/);
    expect(w.tasks[0].status).toBe('pending');
  });
  it('accepts a closed yard and keeps the tariff units and target defaults consistent', () => {
    const w = applyCommand(createWorkspace(), { type: 'settings.update', settings: { ...defaultSettings, capacityKg: 0, dryerRateKes: 100000 } }, context());
    expect(w.settings.capacityKg).toBe(0);
    expect(createWorkspace().settings.dryerRateKes).toBe(377.8);
    expect(createWorkspace().settings.targetMoisturePct).toBe(13);
  });
  it('does not satisfy future measurement reminders with an early meter reading', () => {
    let w = applyCommand(createWorkspace(), intake, context());
    const batchId = w.batches[0].id;
    w.tasks.push({ id: 'later-reading', batchId, action: 'measure', title: 'Final meter reading', reason: '', dueAt: '2026-09-12T10:00:00Z', status: 'pending', completedAt: null });
    w = applyCommand(w, { type: 'batch.measure', batchId, moisturePct: 13, note: '' }, context());
    expect(w.tasks[0].status).toBe('pending');
    w = applyCommand(w, { type: 'batch.measure', batchId, moisturePct: 12.8, note: '' }, { ...context(), now: '2026-09-12T10:00:00Z' });
    expect(w.tasks[0].status).toBe('done');
  });
  it('requires a fresh reading again at dispatch and preserves ready status when completing old cover reminders', () => {
    let w = applyCommand(createWorkspace(), { ...intake, moisturePct: 12.8 }, context());
    const batchId = w.batches[0].id;
    w = applyCommand(w, { type: 'batch.status', batchId, status: 'ready' }, context());
    expect(() => applyCommand(w, { type: 'batch.status', batchId, status: 'dispatched' }, { ...context(), now: '2026-09-14T06:00:00Z' })).toThrow(/fresh/);
    w.tasks.push({ id: 'old-cover', batchId, action: 'cover', title: 'Cover', reason: '', dueAt: NOW, status: 'pending', completedAt: null });
    w = applyCommand(w, { type: 'task.complete', taskId: 'old-cover' }, context());
    expect(w.batches[0].status).toBe('ready');
  });
  it('rejects obsolete spread tasks after the grain condition changes', () => {
    let w = applyCommand(createWorkspace(), intake, context());
    const batchId = w.batches[0].id;
    w.tasks.push({ id: 'spread-old', batchId, action: 'spread', title: 'Spread', reason: '', dueAt: NOW, status: 'pending', completedAt: null });
    w = applyCommand(w, { type: 'batch.measure', batchId, moisturePct: 23, note: 'Recheck' }, context());
    expect(() => applyCommand(w, { type: 'task.complete', taskId: 'spread-old' }, context())).toThrow(/no longer matches/);
  });
  it('rejects future, invalid or mismatched measurements for storage', () => {
    const w = applyCommand(createWorkspace(), { ...intake, moisturePct: 13 }, context());
    const batchId = w.batches[0].id;
    for (const measuredAt of ['2026-09-12T06:01:00Z', 'broken']) {
      w.batches[0].measurements[0].measuredAt = measuredAt;
      expect(() => applyCommand(w, { type: 'batch.status', batchId, status: 'ready' }, context())).toThrow(/fresh/);
    }
    w.batches[0].measurements[0].measuredAt = NOW;
    w.batches[0].measurements[0].moisturePct = 12;
    expect(() => applyCommand(w, { type: 'batch.status', batchId, status: 'ready' }, context())).toThrow(/meter reading/);
  });
  it('labels replay tasks and prevents their use as real outdoor instructions', () => {
    const w = applyCommand(createWorkspace(), intake, context());
    const planned = applyCommand(w, { type: 'plan.commit', mode: 'replay', date: '2026-09-12' }, { ...context(), dataset: fixture });
    const spread = planned.tasks.find(t => t.action === 'spread')!;
    expect(spread.reason).toContain('HISTORICAL REPLAY');
    expect(() => applyCommand(planned, { type: 'task.complete', taskId: spread.id }, context())).toThrow(/Historical replay/);
    expect(applyCommand(planned, { type: 'task.complete', taskId: spread.id }, { ...context(), demo: true }).batches[0].status).toBe('drying');
  });
  it('rechecks weather and start time before confirming a forecast spread task', () => {
    const forecast: Forecast = { fetchedAt: NOW, issuedAt: NOW, source: 'Test forecast', latitude: defaultSettings.latitude, longitude: defaultSettings.longitude, hours: fixture.hours };
    const ctx = { ...context(), dataset: fixture, forecast };
    const w = applyCommand(createWorkspace(), intake, ctx);
    const planned = applyCommand(w, { type: 'plan.commit', mode: 'forecast', date: '2026-09-12' }, ctx);
    const spread = planned.tasks.find(t => t.action === 'spread')!;
    expect(spread).toBeDefined();
    expect(() => applyCommand(planned, { type: 'task.complete', taskId: spread.id }, { ...ctx, now: '2026-09-12T05:59:00Z' })).toThrow(/not started/);
    const wetForecast = { ...forecast, hours: fixture.hours.map((h, i) => i === 0 ? { ...h, rainMm: 1 } : h) };
    expect(() => applyCommand(planned, { type: 'task.complete', taskId: spread.id }, { ...ctx, forecast: wetForecast })).toThrow(/no longer supports/);
    expect(() => applyCommand(planned, { type: 'task.complete', taskId: spread.id }, { ...ctx, forecast: undefined })).toThrow(/fresh weather check/);
    expect(applyCommand(planned, { type: 'task.complete', taskId: spread.id }, ctx).batches[0].status).toBe('drying');
  });
  it('refreshes a plan by removing obsolete pending tasks without removing completed evidence', () => {
    let w = applyCommand(createWorkspace(), intake, context());
    const cmd = { type: 'plan.commit' as const, mode: 'replay' as const, date: '2026-09-12' };
    const ctx = { ...context(), dataset: fixture, demo: true };
    w = applyCommand(w, cmd, ctx);
    const spread = w.tasks.find(t => t.action === 'spread')!;
    w = applyCommand(w, { type: 'task.complete', taskId: spread.id }, ctx);
    w = applyCommand(w, { type: 'batch.measure', batchId: w.batches[0].id, moisturePct: 23, note: 'Recheck' }, ctx);
    w = applyCommand(w, cmd, ctx);
    expect(w.tasks.find(t => t.id === spread.id)?.status).toBe('done');
    expect(w.tasks.some(t => t.status === 'pending' && t.action === 'turn')).toBe(false);
    expect(w.audit[0].detail).toContain('obsolete pending tasks removed');
  });
  it('records dryer referrals without changing occupancy and rejects obsolete referrals for ready grain', () => {
    let w = applyCommand(createWorkspace(), intake, context());
    const batchId = w.batches[0].id;
    w = applyCommand(w, { type: 'batch.status', batchId, status: 'drying' }, context());
    w.tasks.push({ id: 'referral', batchId, action: 'dryer', title: 'Record referral', reason: '', dueAt: NOW, status: 'pending', completedAt: null });
    w = applyCommand(w, { type: 'task.complete', taskId: 'referral' }, context());
    expect(w.batches[0].status).toBe('drying');
    expect(w.batches[0].bay).not.toBe('Mechanical dryer');
    expect(w.batches[0].moisturePct).toBe(18);
    w.tasks.push({ id: 'old-referral', batchId, action: 'dryer', title: 'Record referral', reason: '', dueAt: NOW, status: 'pending', completedAt: null });
    w = applyCommand(w, { type: 'batch.measure', batchId, moisturePct: 12.8, note: '' }, context());
    w = applyCommand(w, { type: 'batch.status', batchId, status: 'ready' }, context());
    expect(() => applyCommand(w, { type: 'task.complete', taskId: 'old-referral' }, context())).toThrow(/no longer appropriate/);
    expect(w.batches[0].status).toBe('ready');
  });
  it('bounds audit records and restricts demo reset', () => {
    const w: Workspace = { ...createWorkspace(), audit: Array.from({ length: 500 }, (_, i) => ({ id: `old-${i}`, at: NOW, action: 'old', detail: 'old' })) };
    expect(applyCommand(w, intake, context()).audit).toHaveLength(500);
    expect(() => applyCommand(w, { type: 'demo.reset' }, context())).toThrow(/Only demonstration/);
    expect(applyCommand(w, { type: 'demo.reset' }, { ...context(), demo: true }).batches).toHaveLength(4);
  });
});
