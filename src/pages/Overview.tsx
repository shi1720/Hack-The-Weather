import {
  Sun,
  ArrowUpRight,
  Clock3,
  Layers3,
  Coins,
  ArrowRight,
  Wind,
  Droplets,
  CloudRain,
  Check,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import { Badge, Button, PanelTitle, Stat } from '../components/UI';
import WeatherChart from '../components/WeatherChart';
import { day, kes, number, time } from '../lib/format';
import type { Dataset, Plan, Workspace } from '../shared/types';
export default function Overview({
  workspace: w,
  plan: p,
  dataset,
  onPlan,
  onAdd,
  navigate,
  busy,
  isDemo,
  onReplay,
}: {
  workspace: Workspace;
  plan: Plan;
  dataset: Dataset;
  onPlan: () => void;
  onAdd: () => void;
  navigate: (s: string) => void;
  busy: boolean;
  isDemo: boolean;
  onReplay: (date: string) => void;
}) {
  const active = w.batches.filter((b) => !['ready', 'dispatched'].includes(b.status)),
    pending = w.tasks.filter(
      (t) => t.status === 'pending' && t.id.startsWith(`plan:${p.mode}:${p.date}:`),
    );
  const hours = p.hours.filter(
    (h) =>
      Number(time(h.timestamp).slice(0, 2)) >= 8 && Number(time(h.timestamp).slice(0, 2)) <= 17,
  );
  const mid = hours.find((h) => h.verdict === 'dry') ?? hours.find((h) => h.temperatureC !== null);
  const primary = p.recommendations[0];
  const batch = w.batches.find((b) => b.id === primary?.batchId);
  const rainComplete = hours.length > 0 && hours.every((h) => h.rainMm !== null);
  const rainKnown = hours.some((h) => h.rainMm !== null);
  const rainLabel = rainComplete
    ? `${number(hours.reduce((s, h) => s + (h.rainMm ?? 0), 0))} mm reported rain`
    : rainKnown
      ? 'Rain record incomplete'
      : 'Rain data unavailable';
  return (
    <>
      <div className="overview-heading">
        <div>
          <div className="eyebrow">YOUR HARVEST. A CLEAR PLAN.</div>
          <h1>Make every dry hour count.</h1>
          <p>Local weather, a coordinated yard, and a record for every batch.</p>
        </div>
        <Button onClick={w.batches.length ? onPlan : onAdd} busy={busy}>
          <CalendarDays size={17} />
          {w.batches.length ? 'Build operator plan' : 'Add your first batch'}
          <ArrowRight size={16} />
        </Button>
      </div>
      {isDemo && (
        <details className="journey-guide">
          <summary>
            <span className="journey-number">3</span>
            <span>
              <strong>Explore the complete workflow</strong>
              <small>Real Conduit weather. Sample cooperative records.</small>
            </span>
            <ArrowRight size={17} />
          </summary>
          <div className="journey-steps">
            <div>
              <span>01 · COMPARE THE WEATHER</span>
              <p>See how the plan responds to a dry day, a humid day, and a genuine station gap.</p>
              <div className="example-days">
                {[
                  ['2026-09-12', 'Dry day'],
                  ['2026-09-15', 'Humid day'],
                  ['2026-09-08', 'Missing data'],
                ].map(([date, label]) => (
                  <button
                    key={date}
                    aria-pressed={p.date === date && p.mode === 'replay'}
                    onClick={() => onReplay(date)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span>02 · PUT THE YARD TO WORK</span>
              <p>Review the allocation, create operator jobs, then record the work completed.</p>
              <button className="text-button" onClick={onPlan}>
                Review the plan <ArrowRight size={14} />
              </button>
            </div>
            <div>
              <span>03 · CLOSE THE LOOP</span>
              <p>
                Log an illustrative meter reading and inspect the evidence ledger. No moisture is
                simulated.
              </p>
              <button className="text-button" onClick={() => navigate('batches')}>
                Open sample batches <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </details>
      )}
      {!w.batches.length && (
        <section className="onboarding-card" aria-label="Set up your workspace">
          <div>
            <span className="eyebrow">YOUR FIRST DAY AT THE DESK</span>
            <h2>Start with the grain in front of you.</h2>
            <p>
              Set your yard capacity, add a batch with a real moisture reading, then review a
              current weather plan.
            </p>
          </div>
          <Button secondary onClick={() => navigate('data')}>
            Set up your yard <ArrowRight size={16} />
          </Button>
        </section>
      )}
      <div className="stats-grid">
        <Stat
          title={p.mode === 'forecast' ? 'Upcoming suitable hours' : 'Drying window'}
          value={
            <>
              {p.dryHours}
              <small>hours</small>
            </>
          }
          note={p.dryHours ? 'Suitable hours in selected day' : 'No suitable hours confirmed'}
          icon={<Sun size={19} />}
          accent
        />
        <Stat
          title="Grain in the queue"
          value={
            <>
              {number(active.reduce((s, b) => s + b.weightKg, 0) / 1000)}
              <small>tonnes</small>
            </>
          }
          note={`${active.length} active batches · maize`}
          icon={<Layers3 size={18} />}
        />
        <Stat
          title="Yard allocation"
          value={
            <>
              {number(p.capacityUsedKg / 1000)}
              <small>/ {number(w.settings.capacityKg / 1000)} t</small>
            </>
          }
          note="Suggested outdoor allocation"
          icon={<Clock3 size={18} />}
        />
        <Stat
          title="Suggested dryer budget"
          value={
            <>
              <small>KSh</small>
              {number(Math.round(p.totalDryerCostKes))}
            </>
          }
          note="For batches routed to a dryer"
          icon={<Coins size={18} />}
        />
      </div>
      <div className="overview-main">
        <section className="panel weather-panel">
          <PanelTitle
            title="A window worth working with"
            meta={`${day(p.date)} · ${p.mode === 'replay' ? 'Observed historical weather' : 'Model forecast'} · East Africa Time`}
          >
            <Badge tone={p.confidence === 'good' ? 'green' : 'amber'}>
              <span className="live-dot" />
              {p.confidence === 'good'
                ? 'Good coverage'
                : p.confidence === 'limited'
                  ? 'Limited confidence'
                  : 'Data unavailable'}
            </Badge>
          </PanelTitle>
          <div className="weather-headline">
            <div>
              <strong>
                {mid?.temperatureC?.toFixed(1) ?? '–'}
                <small>°C</small>
              </strong>
              <span>
                {mid ? `${time(mid.timestamp)} local conditions` : 'Conditions unavailable'}
              </span>
            </div>
            <div className="weather-detail">
              <span>
                <Droplets size={16} />
                {mid?.humidityPct?.toFixed(0) ?? '–'}% humidity
              </span>
              <span>
                <Wind size={16} />
                {mid?.windMs?.toFixed(1) ?? '–'} m/s wind
              </span>
              <span>
                <CloudRain size={16} />
                {rainLabel}
              </span>
            </div>
          </div>
          <WeatherChart hours={p.hours} />
          <div className="weather-caption">
            <span className="caption-line" />
            <p>
              Drying suitability uses {p.mode === 'replay' ? 'observed' : 'forecast'} temperature,
              humidity and rain. It does not predict grain moisture.
            </p>
            <button onClick={() => navigate('data')} className="text-button">
              See the evidence <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
        <section className="priority-card">
          <div className="priority-top">
            <span className="eyebrow">NEXT BEST ACTION</span>
            <div className="priority-sun">
              <Sun size={27} />
            </div>
          </div>
          <h2>
            {primary?.title ??
              (w.batches.length ? 'The active queue is clear.' : 'Start with your first batch.')}
          </h2>
          <p>
            {primary?.reason ??
              (w.batches.length
                ? 'Review ready batches before dispatch, or add the next intake when it arrives.'
                : 'Add the weight, measured moisture, and deadline. Kavu will put the next drying decision in context.')}
          </p>
          {batch && (
            <div className="priority-batch">
              <div className="batch-avatar">{batch.name.slice(0, 1)}</div>
              <div>
                <strong>{batch.name}</strong>
                <span>
                  {number(batch.weightKg)} kg · {batch.moisturePct}% moisture
                </span>
              </div>
              <ArrowUpRight size={18} />
            </div>
          )}
          <div className="priority-bottom">
            <span>
              {p.coverBy ? (
                <>
                  <Clock3 size={15} />
                  Reassess by {time(p.coverBy)}
                </>
              ) : (
                <>
                  <Check size={15} />
                  Measure before storage
                </>
              )}
            </span>
            <button
              onClick={primary ? onPlan : w.batches.length ? () => navigate('batches') : onAdd}
              disabled={busy}
            >
              {primary
                ? 'Make it a job'
                : w.batches.length
                  ? 'Review batches'
                  : 'Add your first batch'}
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </div>
      <section className="panel decision-panel">
        <PanelTitle
          title="Every batch has a next step"
          meta="A practical plan for the grain already in your care."
        >
          <button className="text-button" onClick={() => navigate('batches')}>
            All batches <ArrowUpRight size={16} />
          </button>
        </PanelTitle>
        {p.recommendations.length > 0 && (
          <p className="table-scroll-hint">Scroll sideways to compare every column.</p>
        )}
        {p.recommendations.length ? (
          <div
            className="table-scroll"
            role="region"
            aria-label="Recommended batch decisions"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Batch / grower</th>
                  <th>Weight</th>
                  <th>Moisture</th>
                  <th>Suggested next step</th>
                  <th>Dryer equivalent</th>
                </tr>
              </thead>
              <tbody>
                {p.recommendations.slice(0, 4).map((r) => {
                  const b = w.batches.find((b) => b.id === r.batchId)!;
                  return (
                    <tr key={r.batchId}>
                      <td>
                        <strong>{b.name}</strong>
                        <span>{b.farmer}</span>
                      </td>
                      <td>
                        {number(b.weightKg)} <span className="inline-muted">kg</span>
                      </td>
                      <td>
                        <span className="moisture-inline">
                          <i style={{ width: `${Math.min(32, b.moisturePct)}px` }} />
                          {b.moisturePct}%
                        </span>
                      </td>
                      <td>
                        <Badge
                          tone={
                            r.action === 'spread'
                              ? 'green'
                              : r.action === 'dryer'
                                ? 'amber'
                                : r.action === 'store'
                                  ? 'blue'
                                  : 'neutral'
                          }
                        >
                          {r.title}
                        </Badge>
                      </td>
                      <td>{kes(r.estimatedDryerCostKes)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-row">
            {w.batches.length
              ? 'No batches need a drying plan. Review ready batches or add a new intake.'
              : 'Your workspace is ready. Add a batch to build its first plan.'}
          </div>
        )}
        <div className="panel-footer">
          <span>
            <span className="live-dot" /> {pending.length} open operator jobs
          </span>
          <button className="text-button" onClick={() => navigate('yard')}>
            Open drying yard <ArrowRight size={15} />
          </button>
        </div>
      </section>
      <div className="bottom-note">
        <span>
          <AlertTriangle size={15} />
          Weather guides the work. Moisture meters verify the grain.
        </span>
        <span>Conduit@Empathy · {number(dataset.summary.uniqueRows)} station observations</span>
      </div>
    </>
  );
}
