import { z } from 'zod';
import { buildPlan, DEFAULT_DRYER_RATE_KES, localDate } from './engine';
import type { Batch, Dataset, Forecast, Workspace, WorkspaceCommand, YardSettings } from './types';

export class WorkspaceError extends Error {
  constructor(
    message: string,
    public code = 'INVALID_COMMAND',
    public status = 400,
  ) {
    super(message);
    this.name = 'WorkspaceError';
  }
}
const text = (max = 120) => z.string().trim().min(1).max(max);
const moisture = z.number().finite().min(5).max(45);
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
    'Use a valid date.',
  );
export const settingsSchema = z
  .object({
    name: text(100),
    capacityKg: z.number().finite().min(0).max(1_000_000),
    dryerRateKes: z.number().finite().min(0).max(100000),
    targetMoisturePct: z.number().finite().min(10).max(14),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    maxDistanceKm: z.number().finite().min(1).max(30),
  })
  .strict();
export const commandSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('batch.create'),
      name: text(),
      farmer: text(),
      weightKg: z.number().finite().min(1).max(100_000),
      moisturePct: moisture,
      deadline: dateOnly,
    })
    .strict(),
  z
    .object({
      type: z.literal('batch.measure'),
      batchId: text(),
      moisturePct: moisture,
      note: z.string().trim().max(500),
    })
    .strict(),
  z
    .object({
      type: z.literal('batch.status'),
      batchId: text(),
      status: z.enum(['queued', 'drying', 'covered', 'ready', 'dispatched']),
    })
    .strict(),
  z
    .object({
      type: z.literal('plan.commit'),
      date: dateOnly,
      mode: z.enum(['replay', 'forecast']),
    })
    .strict(),
  z.object({ type: z.literal('task.complete'), taskId: text() }).strict(),
  z.object({ type: z.literal('settings.update'), settings: settingsSchema }).strict(),
  z.object({ type: z.literal('demo.reset') }).strict(),
]);
export const defaultSettings: YardSettings = {
  name: 'My grain drying yard',
  capacityKg: 3000,
  dryerRateKes: DEFAULT_DRYER_RATE_KES,
  targetMoisturePct: 13.0,
  latitude: -1.0916,
  longitude: 37.014,
  maxDistanceKm: 10,
};
export function createWorkspace(): Workspace {
  return { revision: 0, batches: [], tasks: [], settings: { ...defaultSettings }, audit: [] };
}
export function createDemoWorkspace(): Workspace {
  const initial: [string, string, number, number, string, Batch['status'], string | null][] = [
    ['Mavuno A-01', 'Demo farmer · Mavuno', 1800, 18.2, '2026-09-12', 'queued', null],
    ['East field B-02', 'Demo farmer · East field', 900, 16.1, '2026-09-13', 'queued', null],
    ['Kijani C-03', 'Demo farmer · Kijani', 650, 14.5, '2026-09-14', 'covered', null],
    [
      'Morning intake D-04',
      'Demo farmer · Morning intake',
      500,
      12.8,
      '2026-09-12',
      'queued',
      null,
    ],
  ];
  return {
    ...createWorkspace(),
    settings: { ...defaultSettings, name: 'Juja demo cooperative' },
    batches: initial.map(([name, farmer, weightKg, moisturePct, deadline, status, bay], i) => ({
      id: `demo-batch-${i + 1}`,
      name,
      farmer,
      weightKg,
      moisturePct,
      initialMoisturePct: moisturePct,
      targetMoisturePct: 13.0,
      receivedAt: '2026-09-12T03:00:00.000Z',
      deadline,
      status,
      bay,
      measurements: [
        {
          id: `demo-measurement-${i + 1}`,
          moisturePct,
          measuredAt: '2026-09-12T03:00:00.000Z',
          note: 'Fictional demonstration intake reading.',
        },
      ],
    })),
    audit: [
      {
        id: 'demo-start',
        at: '2026-09-12T03:00:00.000Z',
        action: 'demo.created',
        detail:
          'Fictional cooperative, batches, costs and meter readings. Conduit weather observations are real.',
      },
    ],
  };
}
export interface CommandContext {
  dataset?: Dataset;
  forecast?: Forecast;
  demo?: boolean;
  now?: string;
  id?: () => string;
}
/** Pure reducer: validates, clones, applies a command. Never changes measured moisture based on weather. */
export function applyCommand(
  input: Workspace,
  raw: WorkspaceCommand | unknown,
  context: CommandContext = {},
): Workspace {
  const parsed = commandSchema.safeParse(raw);
  if (!parsed.success)
    throw new WorkspaceError(
      parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'command'}: ${issue.message}`)
        .join('; '),
    );
  const cmd = parsed.data;
  const now = context.now ?? new Date().toISOString();
  const id = context.id ?? (() => crypto.randomUUID());
  const w = structuredClone(input);
  const audit = (action: string, detail: string, batchId?: string) => {
    w.audit.unshift({ id: id(), at: now, action, detail, ...(batchId ? { batchId } : {}) });
    w.audit = w.audit.slice(0, 500);
  };
  const getBatch = (batchId: string) => {
    const batch = w.batches.find((b) => b.id === batchId);
    if (!batch)
      throw new WorkspaceError('This batch was not found in your workspace.', 'NOT_FOUND', 404);
    return batch;
  };
  const requireYardCapacity = (batch: Batch) => {
    const occupied = w.batches
      .filter((b) => b.id !== batch.id && b.status === 'drying' && b.bay !== 'Mechanical dryer')
      .reduce((total, b) => total + b.weightKg, 0);
    if (occupied + batch.weightKg > w.settings.capacityKg)
      throw new WorkspaceError(
        `This batch exceeds the remaining ${Math.max(0, w.settings.capacityKg - occupied)} kg of yard capacity. Cover or clear another batch first.`,
        'CAPACITY_EXCEEDED',
      );
  };
  const requireStorageMeasurement = (batch: Batch) => {
    const last = batch.measurements.at(-1);
    if (
      !last ||
      !Number.isFinite(last.moisturePct) ||
      Math.abs(last.moisturePct - batch.moisturePct) > 0.001 ||
      last.moisturePct > batch.targetMoisturePct ||
      batch.moisturePct > batch.targetMoisturePct
    )
      throw new WorkspaceError(
        `Record a meter reading at or below ${batch.targetMoisturePct}% before marking grain ready for storage.`,
        'MEASUREMENT_REQUIRED',
      );
    const age = Date.parse(now) - Date.parse(last.measuredAt);
    if (!Number.isFinite(age) || age < 0 || age > 24 * 60 * 60_000)
      throw new WorkspaceError(
        'Record a fresh moisture reading (within 24 hours) before confirming storage.',
        'MEASUREMENT_REQUIRED',
      );
  };
  if (cmd.type === 'demo.reset') {
    if (!context.demo)
      throw new WorkspaceError('Only demonstration workspaces can be reset.', 'FORBIDDEN', 403);
    return { ...createDemoWorkspace(), revision: input.revision + 1 };
  }
  if (cmd.type === 'batch.create') {
    if (w.batches.length >= 500)
      throw new WorkspaceError(
        'This workspace has reached its 500-batch limit. Contact the operator to archive old records.',
        'LIMIT_REACHED',
      );
    const batchId = id();
    const batch: Batch = {
      id: batchId,
      name: cmd.name,
      farmer: cmd.farmer,
      weightKg: cmd.weightKg,
      moisturePct: cmd.moisturePct,
      initialMoisturePct: cmd.moisturePct,
      targetMoisturePct: w.settings.targetMoisturePct,
      deadline: cmd.deadline,
      receivedAt: now,
      status: 'queued',
      bay: null,
      measurements: [
        {
          id: id(),
          moisturePct: cmd.moisturePct,
          measuredAt: now,
          note: 'Intake moisture meter reading.',
        },
      ],
    };
    w.batches.push(batch);
    audit(
      cmd.type,
      `${batch.name}: received ${batch.weightKg} kg at ${batch.moisturePct}% moisture.`,
      batchId,
    );
  } else if (cmd.type === 'batch.measure') {
    const batch = getBatch(cmd.batchId);
    if (batch.status === 'dispatched')
      throw new WorkspaceError('Dispatched grain cannot receive new yard measurements.');
    batch.moisturePct = cmd.moisturePct;
    batch.measurements.push({
      id: id(),
      moisturePct: cmd.moisturePct,
      measuredAt: now,
      note: cmd.note,
    });
    batch.measurements = batch.measurements.slice(-500);
    if (batch.status === 'ready' && batch.moisturePct > batch.targetMoisturePct)
      batch.status = 'covered';
    for (const task of w.tasks)
      if (
        task.batchId === batch.id &&
        task.action === 'measure' &&
        task.status === 'pending' &&
        Date.parse(task.dueAt) <= Date.parse(now)
      ) {
        task.status = 'done';
        task.completedAt = now;
      }
    audit(cmd.type, `${batch.name}: meter reading ${cmd.moisturePct}%. ${cmd.note}`, batch.id);
  } else if (cmd.type === 'batch.status') {
    const batch = getBatch(cmd.batchId);
    if (batch.status === 'dispatched' && cmd.status !== 'dispatched')
      throw new WorkspaceError(
        'Dispatched batches are closed. Create a new intake for returned grain.',
      );
    if (cmd.status === 'ready') requireStorageMeasurement(batch);
    if (cmd.status === 'drying' && batch.status !== 'drying') requireYardCapacity(batch);
    if (cmd.status === 'dispatched' && batch.status === 'ready') requireStorageMeasurement(batch);
    if (cmd.status === 'dispatched' && batch.status !== 'ready' && batch.status !== 'dispatched')
      throw new WorkspaceError('Confirm grain is ready for storage before dispatching.');
    if (batch.status === cmd.status) return input;
    batch.status = cmd.status;
    if (cmd.status !== 'drying') batch.bay = null;
    audit(cmd.type, `${batch.name}: status changed to ${cmd.status}.`, batch.id);
  } else if (cmd.type === 'settings.update') {
    w.settings = cmd.settings;
    audit(
      cmd.type,
      `Updated yard settings. Targets on existing batches remain unchanged; the new target applies to new intakes.`,
    );
  } else if (cmd.type === 'plan.commit') {
    if (!context.dataset)
      throw new WorkspaceError(
        'Weather data is unavailable. Try loading it again.',
        'DATA_UNAVAILABLE',
        503,
      );
    const plan = buildPlan(
      w,
      context.dataset,
      cmd.date,
      cmd.mode,
      context.forecast,
      Date.parse(now),
    );
    let added = 0;
    let refreshed = 0;
    const desiredTaskIds = new Set<string>();
    const planPrefix = `plan:${cmd.mode}:${cmd.date}:`;
    const batchCycles = new Map<string, number>();
    for (const rec of plan.recommendations) {
      const batchPrefix = `${planPrefix}${rec.batchId}:`;
      const previous = w.tasks.flatMap((task) => {
        if (task.batchId !== rec.batchId || !task.id.startsWith(batchPrefix)) return [];
        const match = task.id
          .slice(batchPrefix.length)
          .match(/^(?:spread|turn|cover|measure|dryer|store)(?::cycle:(\d+))?$/);
        return match ? [{ task, cycle: Number(match[1] ?? 0) }] : [];
      });
      let cycle = Math.max(0, ...previous.map((entry) => entry.cycle));
      const completed = previous
        .filter((entry) => entry.cycle === cycle && entry.task.status === 'done')
        .map((entry) => entry.task.action);
      // A physical return to outdoor work needs fresh companion jobs. Keep the
      // completed cycle immutable; pending jobs make subsequent commits idempotent.
      if (
        (rec.action === 'spread' &&
          completed.some((action) => ['spread', 'turn', 'cover', 'store'].includes(action))) ||
        (rec.action === 'turn' && completed.includes('cover'))
      )
        cycle++;
      batchCycles.set(rec.batchId, cycle);
    }
    const addTask = (
      batchId: string,
      action: Workspace['tasks'][number]['action'],
      title: string,
      reason: string,
      dueAt: string,
    ) => {
      const cycle = batchCycles.get(batchId) ?? 0;
      const taskId = `${planPrefix}${batchId}:${action}${cycle ? `:cycle:${cycle}` : ''}`;
      desiredTaskIds.add(taskId);
      const existing = w.tasks.find((t) => t.id === taskId);
      const contextLabel =
        cmd.mode === 'replay'
          ? 'HISTORICAL REPLAY: retrospective weather; not a live operating instruction. '
          : 'FORECAST GUIDANCE: confirm local conditions before acting. ';
      if (action === 'dryer') title = 'Record the mechanical-dryer referral';
      if (action === 'cover') title = 'Move grain under shelter';
      const operatorConfirmation =
        action === 'cover'
          ? ' Confirm this job only after moving grain under shelter and clearing its drying-floor allocation; a tarp over grain still on the floor does not release yard capacity.'
          : action === 'dryer'
            ? ' Record this only after you have made a referral or contacted a provider outside Kavu. This records the referral; it does not imply a confirmed booking, handoff, drying start or outcome. Kavu does not contact or book the dryer. Keep grain protected and record any physical move separately.'
            : '';
      const fullReason = contextLabel + reason + operatorConfirmation;
      if (existing) {
        if (
          existing.status === 'pending' &&
          (existing.title !== title || existing.reason !== fullReason || existing.dueAt !== dueAt)
        ) {
          existing.title = title;
          existing.reason = fullReason;
          existing.dueAt = dueAt;
          refreshed++;
        }
        return;
      }
      w.tasks.push({
        id: taskId,
        batchId,
        action,
        title,
        reason: fullReason,
        dueAt,
        status: 'pending',
        completedAt: null,
      });
      added++;
    };
    let windowStart: string | null = null;
    let runStart: string | null = null;
    let runLength = 0;
    for (const hour of plan.hours) {
      const upcoming =
        cmd.mode === 'replay' ||
        Date.parse(hour.timestamp) >= Math.ceil(Date.parse(now) / 3_600_000) * 3_600_000;
      if (hour.verdict === 'dry' && upcoming) {
        if (!runStart) runStart = hour.timestamp;
        if (++runLength >= 2) {
          windowStart = runStart;
          break;
        }
      } else {
        runStart = null;
        runLength = 0;
      }
    }
    for (const rec of plan.recommendations) {
      const currentBatch = getBatch(rec.batchId);
      const immediateCover =
        rec.action === 'cover' &&
        currentBatch.status === 'drying' &&
        currentBatch.bay !== 'Mechanical dryer';
      const dueAt = immediateCover
        ? cmd.mode === 'replay'
          ? `${cmd.date}T06:00:00+03:00`
          : now
        : (rec.action === 'spread' || rec.action === 'turn') && windowStart
          ? windowStart
          : rec.action === 'cover' && plan.coverBy
            ? plan.coverBy
            : `${cmd.date}T06:00:00+03:00`;
      addTask(rec.batchId, rec.action, rec.title, rec.reason, dueAt);
      if ((rec.action === 'spread' || rec.action === 'turn') && windowStart && plan.coverBy) {
        const midpoint = new Date(
          (Date.parse(windowStart) + Date.parse(plan.coverBy)) / 2,
        ).toISOString();
        if (rec.action !== 'turn')
          addTask(
            rec.batchId,
            'turn',
            'Turn grain and inspect conditions',
            'Operator check during the allocated drying window. Follow local handling procedures; cover immediately if rain develops.',
            midpoint,
          );
        addTask(
          rec.batchId,
          'measure',
          'Measure moisture before the window closes',
          'Enter a representative moisture meter reading. Weather and elapsed drying time never establish storage readiness.',
          plan.coverBy,
        );
        addTask(
          rec.batchId,
          'cover',
          'Move grain under shelter',
          'Protect grain when this verified weather window ends, or sooner if conditions deteriorate. This is an operator reminder, not an automatic action.',
          plan.coverBy,
        );
      }
    }
    const obsolete = w.tasks.filter(
      (t) => t.status === 'pending' && t.id.startsWith(planPrefix) && !desiredTaskIds.has(t.id),
    );
    w.tasks = w.tasks.filter((t) => !obsolete.includes(t));
    if (!added && !refreshed && !obsolete.length) return input;
    if (w.tasks.length > 2000)
      throw new WorkspaceError('This workspace has reached its 2,000-task limit.', 'LIMIT_REACHED');
    audit(
      cmd.type,
      `${cmd.mode === 'replay' ? 'Historical replay' : 'Forecast'} plan for ${cmd.date}: ${added} tasks added, ${refreshed} refreshed, ${obsolete.length} obsolete pending tasks removed. Completed tasks retained.`,
    );
  } else if (cmd.type === 'task.complete') {
    const task = w.tasks.find((t) => t.id === cmd.taskId);
    if (!task)
      throw new WorkspaceError('This task was not found in your workspace.', 'NOT_FOUND', 404);
    if (task.status === 'done') return input;
    const batch = getBatch(task.batchId);
    if (batch.status === 'dispatched')
      throw new WorkspaceError('This batch has already been dispatched.');
    if (task.action === 'measure')
      throw new WorkspaceError(
        'Record a moisture measurement on this batch to complete its measurement task.',
        'MEASUREMENT_REQUIRED',
      );
    if (
      (task.action === 'spread' || task.action === 'turn') &&
      task.id.startsWith('plan:replay:') &&
      !context.demo
    )
      throw new WorkspaceError(
        'Historical replay cannot authorize outdoor work in a real yard. Generate a current forecast plan and check local conditions. Replay remains interactive in the demonstration.',
        'REPLAY_ONLY',
      );
    if (
      (task.action === 'spread' || task.action === 'turn') &&
      task.id.startsWith('plan:forecast:')
    ) {
      const date = task.id.split(':')[2];
      if (localDate(now) !== date || Date.parse(now) < Date.parse(task.dueAt))
        throw new WorkspaceError(
          'This outdoor task is outside its scheduled day or has not started yet. Refresh the plan for current conditions.',
          'STALE_TASK',
        );
      if (!context.dataset || !context.forecast)
        throw new WorkspaceError(
          'A fresh weather check is required before confirming outdoor work.',
          'FORECAST_UNAVAILABLE',
          503,
        );
      const livePlan = buildPlan(
        w,
        context.dataset,
        date,
        'forecast',
        context.forecast,
        Date.parse(now),
      );
      const currentHour = Math.floor(Date.parse(now) / 3_600_000) * 3_600_000;
      const current = livePlan.hours.find((h) => Date.parse(h.timestamp) === currentHour);
      const next = livePlan.hours.find((h) => Date.parse(h.timestamp) === currentHour + 3_600_000);
      if (
        livePlan.confidence === 'unavailable' ||
        current?.verdict !== 'dry' ||
        (task.action === 'spread' && next?.verdict !== 'dry')
      )
        throw new WorkspaceError(
          'The latest forecast no longer supports this outdoor task. Keep grain protected and generate a new plan; check actual local conditions.',
          'STALE_TASK',
        );
    }

    if (task.action === 'turn' && (batch.status !== 'drying' || batch.bay === 'Mechanical dryer'))
      throw new WorkspaceError(
        'Confirm this batch is spread in the outdoor yard before completing a turning task.',
        'INVALID_TRANSITION',
      );
    if (
      task.action === 'spread' &&
      (batch.status === 'ready' ||
        batch.moisturePct <= batch.targetMoisturePct ||
        batch.moisturePct >= 20 ||
        batch.bay === 'Mechanical dryer')
    )
      throw new WorkspaceError(
        'This batch no longer matches the outdoor-drying task. Refresh its measurement and generate a new plan.',
        'STALE_TASK',
      );
    if (task.action === 'store') {
      requireStorageMeasurement(batch);
      batch.status = 'ready';
      batch.bay = null;
    }
    if (task.action === 'spread') {
      requireYardCapacity(batch);
      batch.status = 'drying';
      batch.bay = 'Open drying yard';
    }
    if (task.action === 'cover' && batch.status !== 'ready') {
      batch.status = 'covered';
      batch.bay = null;
    }
    if (
      task.action === 'dryer' &&
      (batch.status === 'ready' ||
        batch.moisturePct <= batch.targetMoisturePct ||
        batch.bay === 'Mechanical dryer')
    )
      throw new WorkspaceError(
        'This dryer referral is no longer appropriate for the batch. Refresh its meter reading and generate a new plan.',
        'STALE_TASK',
      );
    task.status = 'done';
    task.completedAt = now;
    audit(
      cmd.type,
      task.action === 'dryer'
        ? `${batch.name}: operator recorded a mechanical-dryer referral. Kavu sent no contact or booking request; no drying start or outcome is implied. Physical status and measured moisture unchanged.`
        : `${batch.name}: operator confirmed “${task.title}”. Moisture unchanged.`,
      batch.id,
    );
  }
  w.revision = input.revision + 1;
  return w;
}
