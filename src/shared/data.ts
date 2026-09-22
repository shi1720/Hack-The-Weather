import Papa from 'papaparse';
import type { Dataset, Observation, WeatherHour } from './types';
import { classifyHour, emptyHour, localDate, RULES } from './engine';

export interface ParsedConduit {
  observations: Observation[];
  quality: { rawRows: number; invalidRows: number; flagCounts: Record<string, number> };
  metadata: Record<string, string>;
}
export interface ConduitFile {
  file: string;
  url: string;
  sha256: string;
  text: string;
}
const HOUR = 3_600_000;
const finite = (value: number | null): value is number => value !== null && Number.isFinite(value);
const round = (n: number, digits = 3) => Math.round(n * 10 ** digits) / 10 ** digits;
function validTimestamp(value: string): boolean {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
  );
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day &&
    hour < 24 &&
    minute < 60 &&
    second < 60
  );
}
const REQUIRED_HEADERS = ['Time', 'SHT Temperature', 'SHT Humidity', 'Rain Gauge 1'];
const STATION = {
  name: 'JKUAT Conduit @ Empathy · Juja',
  latitude: -1.099736,
  longitude: 37.014528,
  elevationM: 1523,
};

/** Strict named-column parsing: metadata unit labels in the supplied export are not consistently aligned. */
export function parseConduitCsv(text: string): ParsedConduit {
  const metadata: Record<string, string> = {};
  const flagCounts: Record<string, number> = {};
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^#\s*([^:]+):\s*(.*)$/);
    if (match) metadata[match[1].trim()] = match[2].trim();
  }
  const csv = lines.filter((line) => !line.trimStart().startsWith('#')).join('\n');
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  if (!REQUIRED_HEADERS.every((h) => parsed.meta.fields?.includes(h)))
    throw new Error(
      `Conduit CSV is missing required columns: ${REQUIRED_HEADERS.filter((h) => !parsed.meta.fields?.includes(h)).join(', ')}`,
    );
  const badRows = new Set(parsed.errors.filter((e) => e.row !== undefined).map((e) => e.row!));
  if (parsed.errors.some((e) => e.row === undefined))
    throw new Error('Conduit CSV cannot be parsed safely.');
  let invalidRows = 0;
  const observations: Observation[] = [];
  const flag = (name: string) => {
    flagCounts[name] = (flagCounts[name] ?? 0) + 1;
  };
  for (const [index, row] of parsed.data.entries()) {
    const timestamp = row.Time?.trim();
    // Require explicit timezone to avoid the host machine's timezone changing imported dates.
    if (badRows.has(index) || !timestamp || !validTimestamp(timestamp)) {
      invalidRows++;
      flag(badRows.has(index) ? 'malformed_row' : 'invalid_timestamp');
      continue;
    }
    const flags: string[] = [];
    const read = (key: string, min: number, max: number, label: string) => {
      const raw = row[key]?.trim();
      if (!raw || /^(?:NA|N\/A|NULL|NAN)$/i.test(raw)) {
        flags.push(`${label}_missing`);
        return null;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < min || n > max) {
        flags.push(`${label}_invalid`);
        return null;
      }
      return n;
    };
    let temperatureC = read('SHT Temperature', -50, 65, 'temperature');
    let humidityPct = read('SHT Humidity', 0, 100, 'humidity');
    let rainMm = read('Rain Gauge 1', 0, 100, 'rain');
    let windMs = read('Wind Speed', 0, 80, 'wind');
    // We have no published bit-mask for Health. Conservatively exclude non-zero/invalid health readings.
    const health = row.Health?.trim();
    if (
      health !== undefined &&
      health !== '' &&
      (!Number.isFinite(Number(health)) || Number(health) !== 0)
    ) {
      flags.push('station_health_flag');
      temperatureC = null;
      humidityPct = null;
      windMs = null;
      if (rainMm === 0) rainMm = null; // A positive rain signal still blocks exposed work.
    }
    flags.forEach(flag);
    observations.push({
      timestamp: new Date(timestamp).toISOString(),
      temperatureC,
      humidityPct,
      rainMm,
      windMs,
      flags,
    });
  }
  return {
    observations,
    quality: { rawRows: parsed.data.length, invalidRows, flagCounts },
    metadata,
  };
}

function mean(values: (number | null)[]) {
  const numbers = values.filter(finite);
  return numbers.length ? round(numbers.reduce((a, b) => a + b, 0) / numbers.length) : null;
}

/** Hourly means for air measurements; sum incremental gauge 1 tips, never cumulative daily totals. */
export function aggregateHours(observations: Observation[]): WeatherHour[] {
  const sorted = [...observations]
    .filter((o) => Number.isFinite(Date.parse(o.timestamp)))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  if (!sorted.length) return [];
  const firstDate = localDate(sorted[0].timestamp);
  const lastDate = localDate(sorted[sorted.length - 1].timestamp);
  const first = Date.parse(`${firstDate}T00:00:00+03:00`);
  const last = Date.parse(`${lastDate}T00:00:00+03:00`) + 24 * HOUR;
  if (last - first > 366 * 24 * HOUR) throw new RangeError('One import is limited to 366 days.');
  const buckets = new Map<number, Observation[]>();
  for (const observation of sorted) {
    const key = Math.floor(Date.parse(observation.timestamp) / HOUR) * HOUR;
    const bucket = buckets.get(key) ?? [];
    bucket.push(observation);
    buckets.set(key, bucket);
  }
  const hours: WeatherHour[] = [];
  for (let time = first; time < last; time += HOUR) {
    const timestamp = new Date(time).toISOString();
    const bucket = buckets.get(time) ?? [];
    if (!bucket.length) {
      hours.push(emptyHour(timestamp));
      continue;
    }
    const complete = bucket.filter(
      (o) => finite(o.temperatureC) && finite(o.humidityPct) && finite(o.rainMm),
    );
    const minuteBins = new Set(complete.map((o) => Math.floor(Date.parse(o.timestamp) / 60_000)));
    const times = [time, ...complete.map((o) => Date.parse(o.timestamp)), time + HOUR];
    const maximumGap = Math.max(...times.slice(1).map((v, i) => v - times[i]));
    const rain = bucket.map((o) => o.rainMm).filter(finite);
    const rainMm = rain.length ? round(rain.reduce((a, b) => a + b, 0)) : null;
    const hour = classifyHour({
      timestamp,
      temperatureC: mean(bucket.map((o) => o.temperatureC)),
      humidityPct: mean(bucket.map((o) => o.humidityPct)),
      rainMm,
      windMs: mean(bucket.map((o) => o.windMs)),
      sampleCount: complete.length,
      coverage:
        maximumGap >= RULES.maximumGapMinutes * 60_000
          ? 0
          : round(Math.min(1, minuteBins.size / 60)),
      vpdKpa: null,
      verdict: 'unknown',
      reasons: [],
    });
    if (maximumGap >= RULES.maximumGapMinutes * 60_000 && hour.verdict === 'unknown')
      hour.reasons = [
        `At least ${RULES.maximumGapMinutes} minutes without complete observations; outdoor work withheld.`,
      ];
    hours.push(hour);
  }
  return hours;
}

/** Pure, deterministic except an explicitly supplied import timestamp. Conflicting duplicates fail closed. */
export function buildDataset(files: ConduitFile[], importedAt = new Date().toISOString()): Dataset {
  if (!files.length) throw new Error('At least one official Conduit CSV file is required.');
  if (!Number.isFinite(Date.parse(importedAt))) throw new Error('Invalid import timestamp.');
  const unique = new Map<string, Observation>();
  let rawRows = 0,
    invalidRows = 0,
    duplicatesRemoved = 0,
    conflictingDuplicates = 0;
  const allFlags: Record<string, number> = {};
  const sources: Dataset['sources'] = [];
  const station = { ...STATION };
  for (const file of files) {
    const parsed = parseConduitCsv(file.text);
    for (const [key, expected] of [
      ['data collection latitude', STATION.latitude],
      ['data collection longitude', STATION.longitude],
    ] as const) {
      const provided = parsed.metadata[key];
      if (
        provided !== undefined &&
        (!Number.isFinite(Number(provided)) || Math.abs(Number(provided) - expected) > 0.00001)
      )
        throw new Error(
          `Unexpected station location in ${file.file}; do not combine different stations.`,
        );
    }
    rawRows += parsed.quality.rawRows;
    invalidRows += parsed.quality.invalidRows;
    for (const [flag, count] of Object.entries(parsed.quality.flagCounts))
      allFlags[flag] = (allFlags[flag] ?? 0) + count;
    sources.push({
      file: file.file,
      url: file.url,
      sha256: file.sha256,
      rows: parsed.quality.rawRows,
    });
    for (const observation of parsed.observations) {
      const previous = unique.get(observation.timestamp);
      if (!previous) {
        unique.set(observation.timestamp, observation);
        continue;
      }
      duplicatesRemoved++;
      const keys = ['temperatureC', 'humidityPct', 'rainMm', 'windMs'] as const;
      if (
        keys.some((key) => previous[key] !== observation[key]) ||
        previous.flags.join('|') !== observation.flags.join('|')
      ) {
        conflictingDuplicates++;
        const rain = [previous.rainMm, observation.rainMm].filter(finite);
        unique.set(observation.timestamp, {
          timestamp: observation.timestamp,
          temperatureC: null,
          humidityPct: null,
          rainMm: rain.length && Math.max(...rain) > 0 ? Math.max(...rain) : null,
          windMs: null,
          flags: [...new Set([...previous.flags, ...observation.flags, 'conflicting_duplicate'])],
        });
      }
    }
  }
  const observations = [...unique.values()].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
  if (!observations.length) throw new Error('No valid timestamped observations were found.');
  const gaps: Dataset['summary']['gaps'] = [];
  for (let i = 1; i < observations.length; i++) {
    const previous = observations[i - 1].timestamp,
      current = observations[i].timestamp;
    const gap = (Date.parse(current) - Date.parse(previous)) / HOUR;
    if (gap >= RULES.maximumGapMinutes / 60)
      gaps.push({ from: previous, to: current, hours: round(gap) });
  }
  const hours = aggregateHours(observations);
  return {
    station,
    observations,
    hours,
    summary: {
      rawRows,
      uniqueRows: observations.length,
      duplicatesRemoved,
      invalidRows,
      firstAt: observations[0].timestamp,
      lastAt: observations[observations.length - 1].timestamp,
      days: [...new Set(hours.map((h) => localDate(h.timestamp)))],
      gaps,
    },
    sources,
    importedAt,
    notes: [
      'Official hackathon GeoCSV exports from the JKUAT Conduit platform resource folder. Attribution: 3d-fewsnet.icdp.ucar.edu; DOI https://doi.org/10.5065/d6v1236q. No license is assumed; confirm redistribution and commercial-use terms with the data owner.',
      'Actual timestamps determine coverage. The file named conduit-aug28-sep03.csv ends on September 1 UTC, not September 3.',
      'Air temperature and relative humidity use SHT Temperature and SHT Humidity. The export metadata unit row labels humidity as degC; this inconsistency is recorded rather than silently propagated. Named humidity values are interpreted as percent, constrained to 0–100.',
      'Rain uses incremental Rain Gauge 1 (mm), summed after deduplication. Daily and prior-day cumulative counters are not summed. Gauge 2 is zero throughout these exports and is not used as corroboration.',
      'Every non-zero station Health value is excluded from favourable-weather evidence because the bit-mask was not supplied. Positive rainfall still triggers protection.',
      'Hourly eligibility requires at least 45 complete observations, 75% distinct minute coverage, and no gap of 15 minutes or more, including hour edges. Missing rain is never converted to zero.',
      'All calendar days and hours are Africa/Nairobi (EAT, UTC+03:00). Stored timestamps are UTC. No interpolation crosses missing intervals.',
      `${conflictingDuplicates} conflicting duplicate timestamps were withheld. Raw-row flag counts (before overlap removal): ${JSON.stringify(allFlags)}.`,
      'Historical replay is retrospective and uses observed weather from the whole selected day. It does not estimate prediction accuracy, grain moisture, aflatoxin risk or achieved savings.',
    ],
  };
}
