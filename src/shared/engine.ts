import type {
  Batch,
  Dataset,
  Forecast,
  Plan,
  Recommendation,
  WeatherHour,
  Workspace,
} from './types';

export const DEFAULT_DRYER_RATE_KES = 377.8;
export const RULES = Object.freeze({
  startHour: 8,
  endHour: 17,
  minimumCoverage: 0.75,
  minimumSamples: 45,
  maximumGapMinutes: 15,
  minimumWindowHours: 2,
  maximumHumidityPct: 65,
  minimumVpdKpa: 0.8,
  highHumidityPct: 80,
  highMoisturePct: 20,
  forecastMaxAgeHours: 6,
});
const HOUR = 3_600_000;
const OFFSET = 3 * HOUR;
const round = (n: number, places = 2) =>
  Math.round((n + Number.EPSILON) * 10 ** places) / 10 ** places;
const valid = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
export const localDate = (timestamp: string | number) =>
  new Date(new Date(timestamp).getTime() + OFFSET).toISOString().slice(0, 10);
export const localHour = (timestamp: string) =>
  new Date(new Date(timestamp).getTime() + OFFSET).getUTCHours();
export const formatLocalTime = (timestamp: string) =>
  new Date(new Date(timestamp).getTime() + OFFSET).toISOString().slice(11, 16);

/** FAO-56 saturation vapour pressure expression; atmospheric drying potential, not grain moisture. */
export function vapourPressureDeficit(
  temperatureC: number | null,
  humidityPct: number | null,
): number | null {
  if (!valid(temperatureC, -50, 65) || !valid(humidityPct, 0, 100)) return null;
  return round(
    0.6108 * Math.exp((17.27 * temperatureC) / (temperatureC + 237.3)) * (1 - humidityPct / 100),
    3,
  );
}

/** Refuse invalid quote inputs instead of silently displaying a misleading free service. */
export function dryingCost(
  weightKg: number,
  moisturePct: number,
  targetPct: number,
  rateKes = DEFAULT_DRYER_RATE_KES,
): number {
  if (
    !valid(weightKg, 0, 1e9) ||
    !valid(moisturePct, 0, 100) ||
    !valid(targetPct, 0, 100) ||
    !valid(rateKes, 0, 1e7)
  )
    throw new RangeError(
      'Dryer quote requires finite, non-negative weight, valid moisture percentages and a valid rate.',
    );
  return round((weightKg / 1000) * Math.max(0, moisturePct - targetPct) * rateKes);
}

/** Re-evaluate every hour; callers cannot force a favourable verdict or supply their own VPD. */
export function classifyHour(
  hour: WeatherHour,
  source: 'station' | 'forecast' = 'station',
): WeatherHour {
  const temperatureC = valid(hour.temperatureC, -50, 65) ? hour.temperatureC : null;
  const humidityPct = valid(hour.humidityPct, 0, 100) ? hour.humidityPct : null;
  const rainMm = valid(hour.rainMm, 0, 500) ? hour.rainMm : null;
  const windMs = valid(hour.windMs, 0, 80) ? hour.windMs : null;
  const coverage = valid(hour.coverage, 0, 1) ? hour.coverage : 0;
  const sampleCount =
    Number.isInteger(hour.sampleCount) && hour.sampleCount >= 0 ? hour.sampleCount : 0;
  const result: WeatherHour = {
    ...hour,
    temperatureC,
    humidityPct,
    rainMm,
    windMs,
    coverage,
    sampleCount,
    vpdKpa: vapourPressureDeficit(temperatureC, humidityPct),
    verdict: 'unknown',
    reasons: [],
  };
  // Positive rain remains an actionable warning even if other instruments are unavailable.
  if (rainMm !== null && rainMm > 0) {
    result.verdict = 'cover';
    result.reasons = [
      `${rainMm.toFixed(1)} mm ${source === 'station' ? 'observed' : 'forecast'} rain; keep grain under cover.`,
    ];
    return result;
  }
  if (
    !Number.isFinite(Date.parse(hour.timestamp)) ||
    coverage < RULES.minimumCoverage ||
    (source === 'station' && sampleCount < RULES.minimumSamples) ||
    temperatureC === null ||
    humidityPct === null ||
    rainMm === null
  ) {
    result.reasons = [
      coverage < RULES.minimumCoverage || sampleCount === 0
        ? 'Insufficient weather coverage; outdoor work withheld.'
        : 'A required weather measurement is missing or invalid.',
    ];
    return result;
  }
  const hourOfDay = localHour(hour.timestamp);
  if (hourOfDay < RULES.startHour || hourOfDay >= RULES.endHour) {
    result.verdict = 'cover';
    result.reasons = ['Outside the conservative 08:00–17:00 EAT operating window.'];
    return result;
  }
  if (humidityPct >= RULES.highHumidityPct) {
    result.verdict = 'cover';
    result.reasons = [
      `Relative humidity ${humidityPct.toFixed(0)}% is too high for the outdoor-drying rule.`,
    ];
    return result;
  }
  if (humidityPct <= RULES.maximumHumidityPct && result.vpdKpa! >= RULES.minimumVpdKpa) {
    result.verdict = 'dry';
    result.reasons = [
      `No recorded rain, RH ${humidityPct.toFixed(0)}%, VPD ${result.vpdKpa!.toFixed(2)} kPa: favourable atmospheric drying potential.`,
    ];
    if (source === 'forecast')
      result.reasons[0] = result.reasons[0].replace('recorded', 'forecast');
  } else {
    result.verdict = 'marginal';
    result.reasons = [
      `RH ${humidityPct.toFixed(0)}% / VPD ${result.vpdKpa!.toFixed(2)} kPa: wait for a stronger drying window.`,
    ];
  }
  return result;
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (
    ![lat1, lat2].every((n) => valid(n, -90, 90)) ||
    ![lon1, lon2].every((n) => valid(n, -180, 180))
  )
    return Infinity;
  const rad = (n: number) => (n * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

export function emptyHour(timestamp: string): WeatherHour {
  return {
    timestamp,
    temperatureC: null,
    humidityPct: null,
    rainMm: null,
    windMs: null,
    sampleCount: 0,
    coverage: 0,
    vpdKpa: null,
    verdict: 'unknown',
    reasons: ['No weather data for this hour; outdoor work withheld.'],
  };
}

function validBatch(batch: Batch) {
  return (
    valid(batch.weightKg, 0.001, 1e9) &&
    valid(batch.moisturePct, 0, 100) &&
    valid(batch.targetMoisturePct, 0, 100) &&
    Number.isFinite(Date.parse(batch.deadline))
  );
}

/** One transparent whole-batch allocation for one contiguous operating window. No moisture prediction. */
export function buildPlan(
  workspace: Workspace,
  dataset: Dataset,
  date: string,
  mode: 'replay' | 'forecast' = 'replay',
  forecast?: Forecast,
  now = Date.now(),
): Plan {
  if (!Number.isFinite(now)) throw new RangeError('Planning clock must be a valid timestamp.');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T00:00:00+03:00`)) ||
    localDate(`${date}T00:00:00+03:00`) !== date
  )
    throw new RangeError('Plan date must be a valid YYYY-MM-DD date.');
  const start = Date.parse(`${date}T00:00:00+03:00`);
  const capacity = valid(workspace.settings.capacityKg, 0, 1e9) ? workspace.settings.capacityKg : 0;
  const notices: string[] = [
    'Weather suitability is a transparent operating heuristic, not a grain-moisture forecast or food-safety assessment. Use a moisture meter and local operating procedures.',
  ];
  if (!valid(workspace.settings.dryerRateKes, 0, 1e7))
    notices.push(
      'Configured dryer rate is invalid. Quote amounts are unavailable and displayed as zero placeholders; this does not mean drying is free.',
    );
  const weather = mode === 'forecast' ? (forecast?.hours ?? []) : dataset.hours;
  const source = mode === 'forecast' ? 'forecast' : 'station';
  const byHour = new Map(
    weather
      .filter((h) => Number.isFinite(Date.parse(h.timestamp)))
      .map((h) => [Math.floor(Date.parse(h.timestamp) / HOUR) * HOUR, h]),
  );
  const hours = Array.from({ length: 24 }, (_, index) => {
    const timestamp = new Date(start + index * HOUR).toISOString();
    const found = byHour.get(start + index * HOUR);
    return found ? classifyHour({ ...found, timestamp }, source) : emptyHour(timestamp);
  });
  const maxDistance = valid(workspace.settings.maxDistanceKm, 0, 500)
    ? workspace.settings.maxDistanceKm
    : 0;
  const referenceLocation = mode === 'forecast' && forecast ? forecast : dataset.station;
  const separation = distanceKm(
    workspace.settings.latitude,
    workspace.settings.longitude,
    referenceLocation.latitude,
    referenceLocation.longitude,
  );
  let withheld = false;
  if (!Number.isFinite(separation) || separation > maxDistance) {
    withheld = true;
    notices.push(
      `Weather reference is ${Number.isFinite(separation) ? `${round(separation, 1)} km` : 'at an invalid location'} from this yard, outside the ${maxDistance} km operating radius. Outdoor allocation withheld.`,
    );
  }
  if (mode === 'replay') {
    notices.push(
      'Historical replay uses weather observed during the selected day, including observations after each decision time. It demonstrates the workflow; it is not a forecast backtest.',
    );
  } else {
    notices.push(
      'Forecast hours are model guidance, not station observations. Local rain checks remain necessary.',
    );
    const stationAge = (now - Date.parse(dataset.summary.lastAt)) / HOUR;
    notices.push(
      !Number.isFinite(stationAge) || stationAge > 6
        ? 'The bundled Conduit record is stale for live operations; the forecast is not calibrated or live-validated against this station.'
        : 'Recent bundled station observations are available; no forecast calibration is claimed.',
    );
    const fetchedAge = forecast ? (now - Date.parse(forecast.fetchedAt)) / HOUR : Infinity;
    const issuedAge = forecast ? (now - Date.parse(forecast.issuedAt)) / HOUR : Infinity;
    if (
      !forecast ||
      !Number.isFinite(fetchedAge) ||
      !Number.isFinite(issuedAge) ||
      fetchedAge > RULES.forecastMaxAgeHours ||
      issuedAge > 24 ||
      fetchedAge < -0.25 ||
      issuedAge < -0.25
    ) {
      withheld = true;
      notices.push(
        'No fresh, valid forecast is available. Outdoor allocation withheld; refresh weather or use a historical replay.',
      );
    }
  }
  if (withheld)
    for (const hour of hours)
      if (hour.verdict === 'dry' || hour.verdict === 'marginal') {
        hour.verdict = 'unknown';
        hour.reasons = ['Weather cannot support this yard/date; outdoor work withheld.'];
      }
  // A two-hour minimum avoids using isolated favourable measurements. Choose the earliest viable run.
  const runs: WeatherHour[][] = [];
  let run: WeatherHour[] = [];
  for (const hour of hours) {
    const upcoming =
      mode === 'replay' || Date.parse(hour.timestamp) >= Math.ceil(now / HOUR) * HOUR;
    if (hour.verdict === 'dry' && upcoming) run.push(hour);
    else {
      if (run.length) runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  const window = runs.find((r) => r.length >= RULES.minimumWindowHours) ?? [];
  const coverBy = window.length
    ? new Date(Date.parse(window[window.length - 1].timestamp) + HOUR).toISOString()
    : null;
  const dryHours = hours.filter(
    (h) =>
      h.verdict === 'dry' &&
      (mode === 'replay' || Date.parse(h.timestamp) >= Math.ceil(now / HOUR) * HOUR),
  ).length;
  const priority = (batch: Batch) => {
    if (!validBatch(batch)) return 1000;
    const hoursToDeadline = (Date.parse(batch.deadline) - start) / HOUR;
    return (
      (batch.moisturePct >= RULES.highMoisturePct ? 300 : 0) +
      (hoursToDeadline <= 24 ? 100 : hoursToDeadline <= 48 ? 50 : 0) +
      (batch.status === 'drying' ? 25 : 0) +
      batch.moisturePct
    );
  };
  const batches = workspace.batches
    .filter((b) => b.status !== 'dispatched' && b.status !== 'ready')
    .sort(
      (a, b) =>
        priority(b) - priority(a) ||
        Date.parse(a.deadline) - Date.parse(b.deadline) ||
        a.id.localeCompare(b.id),
    );
  const occupyingYard = new Set(
    workspace.batches
      .filter((b) => b.status === 'drying' && b.bay !== 'Mechanical dryer')
      .map((b) => b.id),
  );
  const occupancyUncertain = workspace.batches.some(
    (b) => occupyingYard.has(b.id) && !valid(b.weightKg, 0.001, 1e9),
  );
  let capacityUsedKg = round(
    workspace.batches
      .filter((b) => occupyingYard.has(b.id) && valid(b.weightKg, 0.001, 1e9))
      .reduce((sum, b) => sum + b.weightKg, 0),
    3,
  );
  if (occupancyUncertain)
    notices.push(
      'An occupied batch has an invalid weight. New outdoor allocations are withheld until yard occupancy is corrected.',
    );
  if (capacityUsedKg > capacity)
    notices.push(
      `Recorded yard occupancy (${capacityUsedKg.toLocaleString('en-KE')} kg) exceeds configured capacity. Clear or reconfigure the yard before allocating more grain.`,
    );
  const recommendations: Recommendation[] = batches.map((batch) => {
    const base = {
      batchId: batch.id,
      priority: round(priority(batch)),
      assignedKg: 0,
      estimatedDryerCostKes: 0,
    };
    if (!validBatch(batch))
      return {
        ...base,
        action: 'measure',
        title: 'Check this batch record',
        reason:
          'Invalid weight, moisture or deadline prevents a reliable allocation. Correct the record and measure moisture.',
      };
    let estimatedDryerCostKes = 0;
    try {
      estimatedDryerCostKes = dryingCost(
        batch.weightKg,
        batch.moisturePct,
        batch.targetMoisturePct,
        workspace.settings.dryerRateKes,
      );
    } catch {
      /* Invalid configured rate must never prevent the protective workflow. */
    }
    base.estimatedDryerCostKes = estimatedDryerCostKes;
    if (batch.moisturePct <= batch.targetMoisturePct) {
      const latest = [...batch.measurements]
        .filter((m) => Number.isFinite(Date.parse(m.measuredAt)) && valid(m.moisturePct, 0, 100))
        .sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt))[0];
      const measurementAge = latest ? now - Date.parse(latest.measuredAt) : Infinity;
      const verified =
        latest &&
        measurementAge >= 0 &&
        measurementAge <= 24 * HOUR &&
        latest.moisturePct <= batch.targetMoisturePct &&
        Math.abs(latest.moisturePct - batch.moisturePct) < 0.01;
      return verified
        ? {
            ...base,
            action: 'store',
            title: 'Moisture target measured',
            reason: `Recorded ${latest.moisturePct}% on ${localDate(latest.measuredAt)} meets the ${batch.targetMoisturePct}% operating target. Follow storage, sampling and quality checks; this is not a safety certification.`,
          }
        : {
            ...base,
            action: 'measure',
            title: 'Verify moisture before storage',
            reason: `${batch.moisturePct}% is at the operating target. Take a fresh representative meter reading; weather alone cannot confirm grain condition.`,
          };
    }
    if (batch.status === 'drying' && batch.bay === 'Mechanical dryer')
      return {
        ...base,
        action: 'measure',
        title: 'Check the batch already in the dryer',
        reason:
          'Mechanical drying is already recorded in progress. Coordinate with its operator and enter a fresh representative moisture reading; no outdoor slot or second dryer booking is assumed.',
      };
    const deadlineUrgent = Date.parse(batch.deadline) <= start + 24 * HOUR;
    const currentHour =
      mode === 'forecast'
        ? hours.find((h) => Math.floor(Date.parse(h.timestamp) / HOUR) === Math.floor(now / HOUR))
        : undefined;
    if (
      occupyingYard.has(batch.id) &&
      (!window.length || (mode === 'forecast' && currentHour?.verdict !== 'dry'))
    )
      return {
        ...base,
        action: 'cover',
        title: 'Protect the batch already in the yard',
        reason: `This batch is recorded outdoors and current conditions do not support leaving it exposed. Cover or move it promptly under local handling procedures; its ${batch.weightKg.toLocaleString('en-KE')} kg remains reserved until you confirm the move.${deadlineUrgent || batch.moisturePct >= RULES.highMoisturePct ? ' Then arrange priority mechanical drying.' : ''}`,
      };
    if (batch.moisturePct >= RULES.highMoisturePct)
      return {
        ...base,
        action: 'dryer',
        title: 'Arrange priority mechanical drying',
        reason: `${batch.moisturePct}% moisture exceeds the conservative ${RULES.highMoisturePct}% escalation trigger. Contact a dryer operator promptly; confirm availability and final quote.`,
      };
    if (!window.length)
      return deadlineUrgent
        ? {
            ...base,
            action: 'dryer',
            title: 'Arrange drying before the deadline',
            reason:
              'No verified contiguous two-hour outdoor window is available and the batch is due within this planning day. Confirm a dryer slot; the quote is indicative.',
          }
        : {
            ...base,
            action: 'cover',
            title: 'Keep protected; reassess conditions',
            reason:
              'No verified contiguous two-hour outdoor window is available. Keep protected according to local handling procedures, monitor moisture and arrange drying if delay becomes unacceptable.',
          };
    if (occupyingYard.has(batch.id))
      return {
        ...base,
        assignedKg: batch.weightKg,
        action: 'turn',
        title: `Turn and inspect the occupied batch`,
        reason: `Keep this existing ${batch.weightKg.toLocaleString('en-KE')} kg yard reservation through the ${window.length}-hour window beginning ${formatLocalTime(window[0].timestamp)} EAT. Measure moisture and cover by ${formatLocalTime(coverBy!)} EAT or sooner if conditions change. No second spread or assumed completion is scheduled.`,
      };
    if (occupancyUncertain || batch.weightKg > capacity - capacityUsedKg)
      return {
        ...base,
        action: deadlineUrgent ? 'dryer' : 'cover',
        title: deadlineUrgent ? 'Book overflow drying' : 'Hold for the next yard slot',
        reason: `This whole ${batch.weightKg.toLocaleString('en-KE')} kg batch does not fit the remaining ${Math.max(0, round(capacity - capacityUsedKg)).toLocaleString('en-KE')} kg yard capacity.${deadlineUrgent ? ' Its deadline is due today; confirm a mechanical dryer slot.' : ' No partial allocation or unmeasured completion is assumed.'}`,
      };
    capacityUsedKg = round(capacityUsedKg + batch.weightKg, 3);
    return {
      ...base,
      assignedKg: batch.weightKg,
      action: 'spread',
      title: `Spread at ${formatLocalTime(window[0].timestamp)} EAT`,
      reason: `${window.length} contiguous favourable hours; reserve ${batch.weightKg.toLocaleString('en-KE')} kg of yard capacity. Turn and measure during work; cover by ${formatLocalTime(coverBy!)} EAT or immediately if conditions change. Completion is determined by meter readings.`,
    };
  });
  const usable = hours.filter(
    (h) => localHour(h.timestamp) >= 8 && localHour(h.timestamp) < 17 && h.verdict !== 'unknown',
  ).length;
  const confidence: Plan['confidence'] =
    withheld || usable === 0
      ? 'unavailable'
      : usable === 9 && mode === 'replay'
        ? 'good'
        : 'limited';
  if (usable < 9)
    notices.push(
      `${usable} of 9 daytime hours have usable weather coverage. Missing hours are never treated as dry.`,
    );
  if (capacity === 0)
    notices.push('Yard capacity is zero or invalid. No outdoor allocation is possible.');
  if (!window.length && dryHours)
    notices.push(
      'Favourable hours do not form a usable upcoming two-hour window; no spread task is issued.',
    );
  notices.push(
    'Dryer estimates use tonnes × moisture percentage points × the configured rate; transport, minimum charges, tax changes and dryer availability require confirmation. They are not measured savings.',
  );
  return {
    date,
    mode,
    hours,
    recommendations,
    dryHours,
    coverBy,
    capacityUsedKg,
    remainingCapacityKg: round(Math.max(0, capacity - capacityUsedKg), 3),
    totalDryerCostKes: round(
      recommendations
        .filter((r) => r.action === 'dryer')
        .reduce((sum, r) => sum + r.estimatedDryerCostKes, 0),
    ),
    confidence,
    notices,
  };
}
