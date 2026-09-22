import type { Workspace } from '../shared/types';
import { dryingCost } from '../shared/engine';
import { csv } from './format';

/** A self-contained snapshot of the calculation basis and retained source records. */
export function evidenceCsv(w: Workspace, isDemo: boolean, generatedAt = new Date().toISOString()) {
  return csv([
    ['KAVU evidence ledger', isDemo ? 'DEMONSTRATION WORKSPACE' : 'USER-REPORTED OBSERVATIONS'],
    ['Export generated at UTC', generatedAt],
    ['Workspace', w.settings.name],
    ['Workspace revision', w.revision],
    ['Configured tariff KES per tonne per moisture percentage point', w.settings.dryerRateKes],
    ['Default tariff reference', 'https://ncpb.co.ke/drying/'],
    ['Method', 'Tariff equivalent is not realised savings. No causal attribution.'],
    [
      'Calculation',
      'Intake weight kg / 1000 x max(0, max(intake moisture - target, 0) - max(latest moisture - target, 0)) x configured tariff',
    ],
    [
      'Mass basis',
      'Uses recorded intake mass; water loss and actual service charges are not measured by this calculation.',
    ],
    [
      'Record scope',
      'Current retained workspace history, not an immutable archive. All timestamps below are UTC.',
    ],
    [],
    [
      'Batch ID',
      'Batch',
      'Weight kg',
      'Intake moisture %',
      'Latest measured moisture %',
      'Target moisture %',
      'Readings',
      'Tariff-equivalent reduction KES',
    ],
    ...w.batches.map((b) => [
      b.id,
      b.name,
      b.weightKg,
      b.initialMoisturePct,
      b.moisturePct,
      b.targetMoisturePct,
      b.measurements.length,
      Math.max(
        0,
        dryingCost(b.weightKg, b.initialMoisturePct, b.targetMoisturePct, w.settings.dryerRateKes) -
          dryingCost(b.weightKg, b.moisturePct, b.targetMoisturePct, w.settings.dryerRateKes),
      ),
    ]),
    [],
    ['Measurement ID', 'Batch ID', 'Batch', 'Measured at UTC', 'Moisture %', 'Measurement note'],
    ...w.batches.flatMap((b) =>
      b.measurements.map((m) => [m.id, b.id, b.name, m.measuredAt, m.moisturePct, m.note]),
    ),
    [],
    [
      'Task ID',
      'Batch ID',
      'Action',
      'Title',
      'Due at UTC',
      'Status',
      'Completed at UTC',
      'Reason',
    ],
    ...w.tasks.map((t) => [
      t.id,
      t.batchId,
      t.action,
      t.title,
      t.dueAt,
      t.status,
      t.completedAt ?? '',
      t.reason,
    ]),
    [],
    ['Audit ID', 'Audit timestamp UTC', 'Batch ID', 'Action', 'Detail'],
    ...w.audit.map((a) => [a.id, a.at, a.batchId ?? '', a.action, a.detail]),
  ]);
}
