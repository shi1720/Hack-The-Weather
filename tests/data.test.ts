import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { aggregateHours, buildDataset, parseConduitCsv } from '../src/shared/data';
import type { Dataset, Observation } from '../src/shared/types';

const header = 'Time,Health,SHT Temperature,SHT Humidity,Rain Gauge 1,Wind Speed';
const row = (time = '2026-09-12T06:00:00Z', rest = '0,25,50,0,1') => `${time},${rest}`;
const csv = (...rows: string[]) => `${header}\n${rows.join('\n')}\n`;
const file = (text: string, name = 'test.csv') => ({ file: name, url: 'https://example.org/test.csv', sha256: createHash('sha256').update(text).digest('hex'), text });
function observation(minute: number, patch: Partial<Observation> = {}): Observation { return { timestamp: new Date(Date.parse('2026-09-12T06:00:00Z') + minute * 60_000).toISOString(), temperatureC: 25, humidityPct: 50, rainMm: 0, windMs: 1, flags: [], ...patch }; }

describe('strict Conduit ingestion', () => {
  it('uses named columns and preserves metadata without depending on column order', () => { const parsed = parseConduitCsv('# doi: https://doi.org/test\nSHT Humidity,Time,Rain Gauge 1,SHT Temperature,Wind Speed\n50,2026-09-12T06:00:00Z,0,25,1'); expect(parsed.metadata.doi).toBe('https://doi.org/test'); expect(parsed.observations[0]).toMatchObject({ humidityPct: 50, temperatureC: 25, rainMm: 0 }); });
  it('distinguishes missing rain from zero and retains invalid-value flags', () => { const parsed = parseConduitCsv(csv(row(undefined, '0,NaN,101,,Infinity'))); expect(parsed.observations[0]).toMatchObject({ temperatureC: null, humidityPct: null, rainMm: null, windMs: null }); expect(parsed.quality.flagCounts.rain_missing).toBe(1); });
  it('rejects malformed rows and timezone-free timestamps without crashing import', () => { const parsed = parseConduitCsv(csv(row(), row('invalid'), row('2026-09-12T06:00:00'), '2026-09-12T07:00:00Z,0,25')); expect(parsed.quality).toMatchObject({ rawRows: 4, invalidRows: 3 }); expect(parsed.observations).toHaveLength(1); });
  it('rejects impossible calendar timestamps instead of normalizing them into another date', () => { const parsed = parseConduitCsv(csv(row('2026-02-30T06:00:00Z'), row('2026-09-12T24:00:00Z'))); expect(parsed.quality.invalidRows).toBe(2); expect(parsed.observations).toHaveLength(0); });
  it('rejects missing required columns', () => { expect(() => parseConduitCsv('Time,Temperature\n2026-09-12T00:00:00Z,25')).toThrow('missing required'); });
  it('excludes health-flagged measurements while retaining protective rain', () => { const parsed = parseConduitCsv(csv(row(undefined, '32,25,50,0.2,1'))); expect(parsed.observations[0]).toMatchObject({ temperatureC: null, humidityPct: null, rainMm: 0.2, flags: ['station_health_flag'] }); });
  it('deduplicates timestamps before summing rain', () => { const input = file(csv(row(undefined, '0,25,50,0.2,1'))); const data = buildDataset([input, input]); expect(data.summary).toMatchObject({ rawRows: 2, uniqueRows: 1, duplicatesRemoved: 1 }); expect(data.hours.find(h => h.timestamp === '2026-09-12T06:00:00.000Z')?.rainMm).toBe(0.2); });
  it('withholds conflicting duplicate observations instead of picking a convenient value', () => { const data = buildDataset([file(csv(row())), file(csv(row(undefined, '0,27,50,0.2,1')))]); expect(data.observations[0].temperatureC).toBeNull(); expect(data.observations[0].flags).toContain('conflicting_duplicate'); expect(data.observations[0].rainMm).toBe(0.2); });
  it('rejects combining a different station and empty input', () => { expect(() => buildDataset([])).toThrow('At least one'); expect(() => buildDataset([file('# data collection latitude: 0.5\n' + csv(row()))])).toThrow('Unexpected station'); expect(() => buildDataset([file(csv(row('invalid')))])).toThrow('No valid'); });
});

describe('coverage-aware hourly aggregation', () => {
  it('calculates hourly means, rainfall sums and sample coverage', () => { const hours = aggregateHours(Array.from({ length: 60 }, (_, i) => observation(i, { temperatureC: i % 2 ? 24 : 26, rainMm: i === 4 ? 0.2 : 0 }))); const hour = hours.find(h => h.sampleCount > 0)!; expect(hour.temperatureC).toBe(25); expect(hour.coverage).toBe(1); expect(hour.sampleCount).toBe(60); expect(hour.rainMm).toBe(0.2); expect(hour.verdict).toBe('cover'); expect(hours).toHaveLength(24); });
  it('does not treat burst sampling as full-hour coverage', () => { const observations = Array.from({ length: 60 }, (_, i) => observation(0, { timestamp: new Date(Date.parse('2026-09-12T06:00:00Z') + i * 1000).toISOString() })); const hour = aggregateHours(observations).find(h => h.sampleCount > 0)!; expect(hour.verdict).toBe('unknown'); expect(hour.coverage).toBe(0); });
  it('withholds a 15-minute gap even if 45 samples exist', () => { const hour = aggregateHours(Array.from({ length: 45 }, (_, i) => observation(i))).find(h => h.sampleCount > 0)!; expect(hour.sampleCount).toBe(45); expect(hour.verdict).toBe('unknown'); expect(hour.reasons[0]).toContain('15 minutes'); });
  it('never interpolates across a multi-day gap', () => { const data = buildDataset([file(csv(row(), row('2026-09-15T06:00:00Z')))]); expect(data.summary.gaps[0].hours).toBe(72); expect(data.hours.filter(h => h.timestamp.startsWith('2026-09-13')).every(h => h.verdict === 'unknown')).toBe(true); expect(data.hours).toHaveLength(96); });
  it('preserves missing rain across an otherwise complete hour', () => { const hour = aggregateHours(Array.from({ length: 60 }, (_, i) => observation(i, { rainMm: null }))).find(h => h.temperatureC !== null)!; expect(hour.rainMm).toBeNull(); expect(hour.verdict).toBe('unknown'); });
});

describe('official export integration', () => {
  const data = JSON.parse(readFileSync('public/data/conduit.json', 'utf8')) as Dataset;
  it('contains reproducible meaningful station evidence, including overlap and gaps', () => { expect(data.summary).toMatchObject({ rawRows: 21189, uniqueRows: 18364, duplicatesRemoved: 2825, invalidRows: 0 }); expect(data.summary.gaps[0].hours).toBeCloseTo(144.029, 3); expect(data.observations).toHaveLength(data.summary.uniqueRows); expect(data.sources).toHaveLength(3); });
  it('documents source bytes with a verified SHA-256 manifest', () => { for (const source of data.sources) expect(createHash('sha256').update(readFileSync(`data/raw/${source.file}`)).digest('hex')).toBe(source.sha256); });
  it('produces a dry Sep12 and genuinely unsuitable Sep15 from source observations', () => { const dryHours = (date: string) => data.hours.filter(h => new Date(Date.parse(h.timestamp) + 3 * 3_600_000).toISOString().startsWith(date) && h.verdict === 'dry').length; expect(dryHours('2026-09-12')).toBe(6); expect(dryHours('2026-09-15')).toBe(0); expect(data.hours.reduce((sum, h) => sum + (h.rainMm ?? 0), 0)).toBeCloseTo(0.4); });
});
