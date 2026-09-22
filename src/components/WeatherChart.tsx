import { useState } from 'react';
import { ShieldCheck, Sun, CloudSun, CircleHelp } from 'lucide-react';
import type { WeatherHour } from '../shared/types';
import { time } from '../lib/format';
const colors: Record<string, string> = {
  dry: '#c8d7ad',
  marginal: '#f3dfaf',
  cover: '#bfd0dd',
  unknown: '#e8e8e2',
};
export default function WeatherChart({
  hours,
  compact = false,
}: {
  hours: WeatherHour[];
  compact?: boolean;
}) {
  const [selectedAt, setSelectedAt] = useState<string | null>(null);
  const selected = hours.find((hour) => hour.timestamp === selectedAt);
  const verdictLabels = {
    dry: 'Drying window',
    marginal: 'Marginal',
    cover: 'Keep covered',
    unknown: 'No data',
  };
  const shown = hours.filter((h) => {
    const hr = +time(h.timestamp).slice(0, 2);
    return hr >= 6 && hr <= 19;
  });
  return (
    <div className={`weather-chart ${compact ? 'compact' : ''}`}>
      <div
        className="chart-plot"
        role="img"
        aria-label="Hourly drying suitability based on temperature, humidity and rain from the selected weather source"
      >
        <div className="chart-y">
          <span>30°</span>
          <span>20°</span>
          <span>10°</span>
        </div>
        <svg viewBox="0 0 700 160" preserveAspectRatio="none">
          <defs>
            <linearGradient id="temp-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#d9b66f" stopOpacity=".24" />
              <stop offset="1" stopColor="#d9b66f" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[35, 80, 125].map((y) => (
            <line key={y} x1="0" y1={y} x2="700" y2={y} stroke="#e5e6df" strokeDasharray="4 5" />
          ))}
          {shown.map((h, i) => (
            <rect
              key={h.timestamp}
              x={i * (700 / shown.length) + 1}
              width={700 / shown.length - 2}
              y="5"
              height="145"
              rx="4"
              fill={colors[h.verdict]}
              opacity=".26"
            />
          ))}
          {shown.map((h, i) => {
            const next = shown[i + 1];
            if (h.temperatureC == null || next?.temperatureC == null) return null;
            const x = ((i + 0.5) * 700) / shown.length,
              nx = ((i + 1.5) * 700) / shown.length;
            const y = 145 - (h.temperatureC - 10) * 5,
              ny = 145 - (next.temperatureC - 10) * 5;
            return (
              <line
                key={h.timestamp}
                x1={x}
                y1={y}
                x2={nx}
                y2={ny}
                stroke="#b38435"
                strokeWidth="2.5"
              />
            );
          })}
          {shown.map(
            (h, i) =>
              h.temperatureC !== null && (
                <circle
                  key={h.timestamp}
                  cx={((i + 0.5) * 700) / shown.length}
                  cy={145 - (h.temperatureC - 10) * 5}
                  r="3.5"
                  fill="#b38435"
                  stroke="#fff"
                  strokeWidth="2"
                />
              ),
          )}
        </svg>
      </div>
      <div className="hour-grid" style={{ gridTemplateColumns: `repeat(${shown.length}, 1fr)` }}>
        {shown.map((h) => (
          <button
            type="button"
            key={h.timestamp}
            className={`hour-cell ${h.verdict}`}
            aria-label={`${time(h.timestamp)} EAT: ${verdictLabels[h.verdict]}. View weather evidence`}
            aria-pressed={selectedAt === h.timestamp}
            onClick={() => setSelectedAt(selectedAt === h.timestamp ? null : h.timestamp)}
            title={`${time(h.timestamp)} EAT: ${h.reasons.join('; ')}. ${h.temperatureC?.toFixed(1) ?? 'Unknown'}°C, ${h.humidityPct?.toFixed(0) ?? 'Unknown'}% RH`}
          >
            <span>{time(h.timestamp).slice(0, 2)}</span>
            {h.verdict === 'dry' ? (
              <Sun size={17} />
            ) : h.verdict === 'cover' ? (
              <ShieldCheck size={17} />
            ) : h.verdict === 'marginal' ? (
              <CloudSun size={17} />
            ) : (
              <CircleHelp size={17} />
            )}
            <b>{h.temperatureC?.toFixed(0) ?? '–'}°</b>
            <i style={{ background: colors[h.verdict] }} />
          </button>
        ))}
      </div>
      <p className="chart-help">Select an hour to see the conditions behind its recommendation.</p>
      {selected && (
        <div className="hour-evidence" role="status">
          <strong>
            {time(selected.timestamp)} EAT · {verdictLabels[selected.verdict]}
          </strong>
          <p>{selected.reasons.join(' ')}</p>
          <span>
            {selected.temperatureC === null
              ? 'Temperature unavailable'
              : `${selected.temperatureC.toFixed(1)}°C`}{' '}
            ·{' '}
            {selected.humidityPct === null
              ? 'Humidity unavailable'
              : `${selected.humidityPct.toFixed(0)}% humidity`}{' '}
            · {selected.rainMm === null ? 'Rain unavailable' : `${selected.rainMm} mm rain`}
          </span>
        </div>
      )}
      <div className="chart-legend">
        <span>
          <i style={{ background: colors.dry }} />
          Drying window
        </span>
        <span>
          <i style={{ background: colors.marginal }} />
          Marginal
        </span>
        <span>
          <i style={{ background: colors.cover }} />
          Keep covered
        </span>
        <span>
          <i style={{ background: colors.unknown }} />
          No data
        </span>
      </div>
    </div>
  );
}
