import { classifyHour } from '../src/shared/engine';
import type { Forecast, WeatherHour } from '../src/shared/types';
import { WorkspaceError } from '../src/shared/workspace';

interface MetPoint { time: string; data: { instant?: { details?: Record<string, number> }; next_1_hours?: { details?: Record<string, number> } }; }
interface MetResponse { properties?: { meta?: { updated_at?: string }; timeseries?: MetPoint[] }; }
export function parseForecast(payload: MetResponse, latitude: number, longitude: number, fetchedAt = new Date().toISOString()): Forecast {
  if (!Array.isArray(payload.properties?.timeseries) || !payload.properties.timeseries.length) throw new WorkspaceError('The weather provider returned no forecast hours.', 'FORECAST_UNAVAILABLE', 503);
  const value = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max ? n : null;
  const hours: WeatherHour[] = payload.properties.timeseries.slice(0, 54).filter(p => !Number.isNaN(Date.parse(p.time))).map(p => {
    const d = p.data?.instant?.details ?? {};
    return classifyHour({ timestamp: p.time, temperatureC: value(d.air_temperature, -50, 65), humidityPct: value(d.relative_humidity, 0, 100), rainMm: value(p.data?.next_1_hours?.details?.precipitation_amount, 0, 500), windMs: value(d.wind_speed, 0, 100), sampleCount: 1, coverage: 1, vpdKpa: null, verdict: 'unknown', reasons: [] }, 'forecast');
  });
  if (!hours.length) throw new WorkspaceError('The weather provider returned invalid timestamps.', 'FORECAST_UNAVAILABLE', 503);
  return { fetchedAt, issuedAt: payload.properties.meta?.updated_at ?? fetchedAt, latitude, longitude, hours, source: 'MET Norway Locationforecast 2.0 · CC BY 4.0' };
}
export function createForecastService(userAgent: string, fetcher: typeof fetch = fetch) {
  const cache = new Map<string, { until: number; forecast: Forecast }>();
  const pending = new Map<string, Promise<Forecast>>();
  return async (latitude: number, longitude: number): Promise<Forecast> => {
    const lat = Math.round(latitude * 10000) / 10000;
    const lon = Math.round(longitude * 10000) / 10000;
    const key = `${lat},${lon}`;
    const current = cache.get(key);
    if (current && current.until > Date.now()) return current.forecast;
    const ongoing = pending.get(key);
    if (ongoing) return ongoing;
    if (pending.size >= 12) throw new WorkspaceError('The forecast service is busy. Please try again shortly.', 'FORECAST_BUSY', 503);
    const operation = (async () => {
      let response: Response;
      try { response = await fetcher(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, { headers: { 'User-Agent': userAgent, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }); }
      catch { throw new WorkspaceError('Live forecast is temporarily unavailable. Historical Conduit replay remains available.', 'FORECAST_UNAVAILABLE', 503); }
      if (!response.ok) throw new WorkspaceError('Live forecast provider is unavailable. Please try again later.', 'FORECAST_UNAVAILABLE', 503);
      let forecast: Forecast;
      try { forecast = parseForecast(await response.json() as MetResponse, lat, lon); }
      catch (error) { if (error instanceof WorkspaceError) throw error; throw new WorkspaceError('The weather provider returned an unreadable response.', 'FORECAST_UNAVAILABLE', 503); }
      // Keep request coordinates bounded in memory and honour the provider's minimum cache lifetime.
      const expiresAt = Date.parse(response.headers.get('expires') ?? '');
      const until = Math.max(Date.now() + 30 * 60_000, Number.isFinite(expiresAt) ? expiresAt : 0);
      if (cache.size >= 200) cache.delete(cache.keys().next().value as string);
      cache.set(key, { until, forecast });
      return forecast;
    })();
    pending.set(key, operation);
    try { return await operation; } finally { pending.delete(key); }
  };
}
