import { useState } from 'react';
import { CalendarDays, Check, Copy, Printer, Languages, CheckCheck } from 'lucide-react';
import { Badge, Button, Empty, PageTitle, PanelTitle } from '../components/UI';
import YardMap from '../components/YardMap';
import type { Workspace, Plan, Batch, WorkspaceCommand } from '../shared/types';
import { day, number, time } from '../lib/format';
const sw: Record<string, string> = {
  spread: 'Tandaza mahindi',
  turn: 'Geuza mahindi',
  cover: 'Hamisha mahindi chini ya paa',
  measure: 'Pima unyevu',
  dryer: 'Panga kukausha kwa mashine',
  store: 'Thibitisha vipimo kabla ya kuhifadhi',
};
export default function Yard({
  workspace: w,
  plan: p,
  onPlan,
  send,
  onSelect,
  toast,
  onMeasure,
}: {
  workspace: Workspace;
  plan: Plan;
  onPlan: () => void;
  send: (c: WorkspaceCommand) => Promise<void>;
  onSelect: (b: Batch) => void;
  toast: (s: string) => void;
  onMeasure: (b: Batch) => void;
}) {
  const [showDone, setShowDone] = useState(false),
    [language, setLanguage] = useState('en'),
    [saving, setSaving] = useState('');
  const dayTasks = w.tasks
    .filter((t) => t.id.startsWith(`plan:${p.mode}:${p.date}:`))
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt) || a.id.localeCompare(b.id));
  const tasks = dayTasks.filter((t) => showDone || t.status === 'pending');
  const used = w.batches
    .filter((b) => b.status === 'drying' && b.bay !== 'Mechanical dryer')
    .reduce((s, b) => s + b.weightKg, 0);
  async function copy() {
    const text =
      `KAVU · ${w.settings.name}\n${day(p.date)} · EAT · ${p.mode === 'replay' ? 'HISTORICAL REPLAY' : 'FORECAST GUIDANCE'}\n` +
      dayTasks
        .filter((t) => t.status === 'pending')
        .map(
          (t) =>
            `${time(t.dueAt)} ${language === 'sw' ? sw[t.action] : t.title} — ${w.batches.find((b) => b.id === t.batchId)?.name ?? 'Batch'}`,
        )
        .join('\n') +
      (language === 'sw'
        ? '\nPima unyevu kabla ya kuhifadhi.'
        : '\nMeasure grain moisture before storage.');
    try {
      await navigator.clipboard.writeText(text);
      toast('Operator brief copied. Ready to share.');
    } catch {
      toast('Clipboard unavailable. Use Print brief to save the operator sheet.');
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="DRYING YARD"
        title="A plan your team can act on."
        text="Assign the space, complete the jobs, and keep everyone in step."
        actions={
          <>
            <Button secondary onClick={() => window.print()}>
              <Printer size={16} />
              Print brief
            </Button>
            <Button onClick={onPlan}>
              <CalendarDays size={17} />
              Build operator plan
            </Button>
          </>
        }
      />
      <div className="yard-layout">
        <section className="panel">
          <PanelTitle
            title="Your working yard"
            meta={`${number(used)} kg drying · ${number(w.settings.capacityKg)} kg configured capacity`}
          >
            <Badge tone="green">{w.settings.name}</Badge>
          </PanelTitle>
          <YardMap
            batches={w.batches}
            capacity={w.settings.capacityKg}
            onSelect={(id) => {
              const b = w.batches.find((b) => b.id === id);
              if (b) onSelect(b);
            }}
          />
          <div className="panel-footer">
            <span>Visual overview · capacity enforced by weight</span>
            <span>
              {p.remainingCapacityKg >= 0 ? number(p.remainingCapacityKg) : 0} kg unallocated in
              plan
            </span>
          </div>
        </section>
        <section className="brief-card">
          <span className="eyebrow">THE OPERATOR BRIEF</span>
          <h2>
            Clear jobs.
            <br />
            One shared plan.
          </h2>
          <p>Copy a short brief into your team’s existing chat, or print it for the yard.</p>
          <div className="language-toggle">
            <Languages size={17} />
            <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>
              English
            </button>
            <button className={language === 'sw' ? 'active' : ''} onClick={() => setLanguage('sw')}>
              Kiswahili
            </button>
          </div>
          <div className="brief-preview">
            <strong>KAVU · {day(p.date)}</strong>
            {dayTasks
              .filter((t) => t.status === 'pending')
              .slice(0, 3)
              .map((t) => (
                <p key={t.id}>
                  {time(t.dueAt)} — {language === 'sw' ? sw[t.action] : t.title}
                  <span>{w.batches.find((b) => b.id === t.batchId)?.name}</span>
                </p>
              ))}
            {!dayTasks.some((t) => t.status === 'pending') && (
              <p>Build a plan to prepare the operator brief.</p>
            )}
          </div>
          <Button secondary onClick={copy} disabled={!dayTasks.some((t) => t.status === 'pending')}>
            <Copy size={16} />
            Copy brief
          </Button>
          <small>Nothing is sent automatically.</small>
        </section>
      </div>
      <section className="panel task-panel">
        <PanelTitle
          title="Operator jobs"
          meta={`${day(p.date)} · ${p.mode === 'replay' ? 'Historical demonstration' : 'Forecast plan'} · only this plan’s jobs`}
        >
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
            />
            Show completed
          </label>
        </PanelTitle>
        {tasks.length ? (
          <div className="task-list">
            {tasks.map((t) => {
              const b = w.batches.find((b) => b.id === t.batchId);
              return (
                <div className={`task-row ${t.status === 'done' ? 'complete' : ''}`} key={t.id}>
                  <span className={`task-symbol ${t.action}`}>
                    {t.status === 'done' ? <CheckCheck size={21} /> : <CalendarDays size={21} />}
                  </span>
                  <div className="task-copy">
                    <h3>
                      {t.title} <span>{b?.name}</span>
                    </h3>
                    <p>{t.reason}</p>
                  </div>
                  <div className="task-due">
                    <strong>{time(t.dueAt)}</strong>
                    <span>{day(t.dueAt)} EAT</span>
                  </div>
                  <Button
                    secondary
                    className="task-complete"
                    disabled={t.status === 'done' || !!saving}
                    busy={saving === t.id}
                    onClick={async () => {
                      if (t.action === 'measure' && b) {
                        onMeasure(b);
                        return;
                      }
                      setSaving(t.id);
                      try {
                        await send({ type: 'task.complete', taskId: t.id });
                      } catch {
                        /* App displays error */
                      } finally {
                        setSaving('');
                      }
                    }}
                  >
                    <Check size={16} />
                    {t.status === 'done'
                      ? 'Done'
                      : t.action === 'measure'
                        ? 'Log reading'
                        : t.action === 'cover'
                          ? 'Confirm yard cleared'
                          : t.action === 'dryer'
                            ? 'Confirm referral'
                            : 'Complete'}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty title="No open jobs.">
            Build an operator plan to turn the weather window into a coordinated day.
          </Empty>
        )}
      </section>
    </>
  );
}
