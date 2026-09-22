import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildDataset } from '../src/shared/data';
import { localDate, localHour } from '../src/shared/engine';

const files = [
  ['conduit-aug28-sep03.csv', '1uQLj3WHvGeX6WRU3EL0ZcLTDVI_Gl23P'],
  ['conduit-aug31-sep04.csv', '192QZkcS3F3B1OnfxvARbvLs-ZGR3abwE'],
  ['conduit-sep11-sep15.csv', '1XQo9JstB_RzGi40MByI88TLQNQHqXV4Q'],
];
const inputs = await Promise.all(files.map(async ([file, id]) => {
  const buffer = await readFile(resolve('data/raw', file));
  return { file, url: `https://drive.google.com/file/d/${id}/view`, text: buffer.toString('utf8'), sha256: createHash('sha256').update(buffer).digest('hex') };
}));
// Reproducible snapshot timestamp, not an assertion of current station freshness.
const dataset = buildDataset(inputs, '2026-09-22T00:00:00.000Z');
const report = {
  ...dataset.summary, station: dataset.station, sources: dataset.sources, notes: dataset.notes,
  bytes: Buffer.byteLength(JSON.stringify(dataset)),
  hours: { total: dataset.hours.length, dry: dataset.hours.filter(h => h.verdict === 'dry').length, cover: dataset.hours.filter(h => h.verdict === 'cover').length, marginal: dataset.hours.filter(h => h.verdict === 'marginal').length, unknown: dataset.hours.filter(h => h.verdict === 'unknown').length },
  byDay: dataset.summary.days.map(date => {
    const hours = dataset.hours.filter(h => localDate(h.timestamp) === date);
    return { date, observations: dataset.observations.filter(o => localDate(o.timestamp) === date).length, dryHours: hours.filter(h => h.verdict === 'dry').length, usableDaytimeHours: hours.filter(h => localHour(h.timestamp) >= 8 && localHour(h.timestamp) < 17 && h.verdict !== 'unknown').length, rainMm: hours.some(h => h.rainMm !== null) ? Math.round(hours.reduce((sum, h) => sum + (h.rainMm ?? 0), 0) * 100) / 100 : null };
  }),
};
await Promise.all([mkdir(resolve('public/data'), { recursive: true }), mkdir(resolve('data/processed'), { recursive: true })]);
await writeFile(resolve('public/data/conduit.json'), JSON.stringify(dataset));
await writeFile(resolve('data/processed/quality-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...dataset.summary, hours: report.hours, bytes: report.bytes, byDay: report.byDay }, null, 2));
