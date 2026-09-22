import { describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import { evidenceCsv } from '../src/lib/evidence';
import { createDemoWorkspace } from '../src/shared/workspace';

describe('portable evidence export', () => {
  it('preserves the editable calculation basis and every retained measurement independently of audit events', () => {
    const workspace = createDemoWorkspace();
    workspace.revision = 7;
    workspace.settings.dryerRateKes = 400;
    const batch = workspace.batches[0];
    batch.moisturePct = 15;
    const reading = {
      id: 'reading-independent-of-audit',
      measuredAt: '2026-09-22T09:30:00.000Z',
      moisturePct: 15,
      note: 'Three samples, meter 02',
    };
    batch.measurements.push(reading);
    workspace.audit = [];
    const before = JSON.stringify(workspace);
    const rows = Papa.parse<string[]>(evidenceCsv(workspace, true, '2026-09-22T10:00:00.000Z'), {
      skipEmptyLines: true,
    }).data;
    const metadata = (key: string) => rows.find((row) => row[0] === key)?.[1];
    expect(metadata('Export generated at UTC')).toBe('2026-09-22T10:00:00.000Z');
    expect(metadata('Configured tariff KES per tonne per moisture percentage point')).toBe('400');
    expect(metadata('Workspace revision')).toBe('7');
    expect(metadata('Method')).toContain('not realised savings');
    const summary = rows.find((row) => row[0] === batch.id)!;
    expect(summary.slice(1, 7)).toEqual(['Mavuno A-01', '1800', '18.2', '15', '13', '2']);
    expect(Number(summary[7])).toBeCloseTo(2304, 6);
    expect(rows.find((row) => row[0] === reading.id)).toEqual([
      reading.id,
      batch.id,
      batch.name,
      reading.measuredAt,
      '15',
      reading.note,
    ]);
    for (const retained of workspace.batches.flatMap((b) => b.measurements))
      expect(rows.some((row) => row[0] === retained.id)).toBe(true);
    expect(JSON.stringify(workspace)).toBe(before);
  });

  it('keeps multiline evidence legible while neutralizing spreadsheet formulas in all sections', () => {
    const workspace = createDemoWorkspace();
    workspace.settings.name = '=HYPERLINK("https://example.test")';
    const batch = workspace.batches[0];
    batch.name = '@example';
    batch.measurements[0].note = '+unsafe formula\nActual note with "quotes", and commas';
    const rows = Papa.parse<string[]>(evidenceCsv(workspace, false), { skipEmptyLines: true }).data;
    expect(rows.find((row) => row[0] === 'Workspace')?.[1]).toBe(`'${workspace.settings.name}`);
    expect(rows.find((row) => row[0] === batch.id)?.[1]).toBe("'@example");
    expect(rows.find((row) => row[0] === batch.measurements[0].id)?.[5]).toBe(
      `'${batch.measurements[0].note}`,
    );
    expect(rows[0][1]).toBe('USER-REPORTED OBSERVATIONS');
  });
});
