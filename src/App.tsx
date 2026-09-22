import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Grid2X2,
  Layers3,
  ChartNoAxesCombined,
  Database,
  LogOut,
  ArrowUpRight,
  Bell,
  Clock3,
  X,
  Menu,
  Info,
  RefreshCw,
  ArrowRight,
  Droplets,
  PackageCheck,
  Sprout,
  LoaderCircle,
} from 'lucide-react';
import type { Dataset, Forecast, User, Workspace, WorkspaceCommand } from './shared/types';
import { buildPlan } from './shared/engine';
import * as api from './lib/api';
import { day, number, time } from './lib/format';
import { Logo, Badge, Button, Modal, ErrorNotice } from './components/UI';
import { BatchForm, MeasurementForm } from './components/Forms';
import Auth from './pages/Auth';
import AccountForm from './components/AccountForm';
import Overview from './pages/Overview';
import Batches from './pages/Batches';
import Yard from './pages/Yard';
import Impact from './pages/Impact';
import Data from './pages/Data';
const nav = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'yard', label: 'Drying yard', icon: Grid2X2 },
  { id: 'batches', label: 'Batches', icon: Layers3 },
  { id: 'impact', label: 'Impact ledger', icon: ChartNoAxesCombined },
  { id: 'data', label: 'Data & settings', icon: Database },
];
type Dialog =
  | { type: 'batch' }
  | { type: 'measure'; batchId: string }
  | { type: 'detail'; batchId: string }
  | { type: 'plan' }
  | { type: 'reset' }
  | { type: 'account' }
  | null;
export default function App() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const [user, setUser] = useState<User | null>(null),
    [loaded, setLoaded] = useState(false),
    [workspace, setWorkspace] = useState<Workspace | null>(null),
    [dataset, setDataset] = useState<Dataset | null>(null),
    [error, setError] = useState(''),
    [toastText, setToastText] = useState(''),
    [page, setPage] = useState('overview'),
    [dialog, setDialog] = useState<Dialog>(null),
    [date, setDate] = useState('2026-09-12'),
    [previousReplayDate, setPreviousReplayDate] = useState('2026-09-12'),
    [mode, setMode] = useState<'replay' | 'forecast'>('replay'),
    [forecast, setForecast] = useState<Forecast | undefined>(),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [loadingData, setLoadingData] = useState(false);
  const toast = useCallback((s: string) => setToastText(s), []),
    close = useCallback(() => setDialog(null), []);
  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);
  const load = useCallback(async () => {
    setLoadingData(true);
    setError('');
    try {
      const [w, d] = await Promise.all([api.getWorkspace(), api.getDataset()]);
      setWorkspace(w);
      setDataset(d);
      if (!d.summary.days.includes('2026-09-12'))
        setDate(d.summary.days[Math.max(0, d.summary.days.length - 2)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Workspace could not load.');
    } finally {
      setLoadingData(false);
    }
  }, []);
  useEffect(() => {
    if (user) void load();
  }, [user, load]);
  useEffect(() => {
    if (toastText) {
      const t = setTimeout(() => setToastText(''), 5500);
      return () => clearTimeout(t);
    }
  }, [toastText]);
  useEffect(() => {
    function hash() {
      const id = location.hash.slice(1);
      if (nav.some((n) => n.id === id)) setPage(id);
    }
    hash();
    window.addEventListener('hashchange', hash);
    return () => window.removeEventListener('hashchange', hash);
  }, []);
  const navigate = (id: string) => {
    setPage(id);
    location.hash = id;
    setMobile(false);
    window.scrollTo(0, 0);
  };
  const plan = useMemo(
    () => (workspace && dataset ? buildPlan(workspace, dataset, date, mode, forecast) : null),
    [workspace, dataset, date, mode, forecast],
  );
  async function send(command: WorkspaceCommand) {
    if (!workspace) return;
    try {
      const w = await api.command(command, workspace.revision);
      setWorkspace(w);
      toast(
        command.type === 'task.complete'
          ? 'Job completed and recorded.'
          : command.type === 'batch.measure'
            ? 'Measurement saved to the batch record.'
            : command.type === 'settings.update'
              ? 'Workspace settings saved.'
              : command.type === 'plan.commit'
                ? 'Operator plan created. Open the yard to begin.'
                : 'Workspace updated.',
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save the change.';
      toast(message);
      if (e instanceof api.APIError && e.status === 409)
        try {
          setWorkspace(await api.getWorkspace());
        } catch {
          /* error already visible */
        }
      throw e;
    }
  }
  async function changeMode(value: string) {
    if (value === 'replay') {
      setMode('replay');
      setDate(previousReplayDate);
      return;
    }
    if (!workspace) return;
    setBusy(true);
    try {
      const f = await api.getForecast(workspace.settings.latitude, workspace.settings.longitude);
      setForecast(f);
      setPreviousReplayDate(date);
      setDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }));
      setMode('forecast');
      toast('Forecast loaded. Check source freshness and local limits before acting.');
    } catch (e) {
      toast(
        e instanceof Error
          ? e.message
          : 'Forecast unavailable. Historical replay remains available.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    try {
      await api.logout();
      setUser(null);
      setWorkspace(null);
      setDataset(null);
      setDialog(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Sign out failed.');
    }
  }
  if (!loaded)
    return (
      <div className="loading-page">
        <Logo />
        <LoaderCircle size={24} className="spin" />
        <p>Opening the drying desk…</p>
      </div>
    );
  if (!user) return <Auth onLogin={setUser} />;
  const modalBatch =
    dialog && 'batchId' in dialog
      ? workspace?.batches.find((b) => b.id === dialog.batchId)
      : undefined;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobile && <div className="sidebar-scrim" onClick={() => setMobile(false)} />}
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-close"
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-switch">
          <span className="workspace-icon">
            <Sprout size={20} />
          </span>
          <div>
            <strong>{workspace?.settings.name ?? 'Your workspace'}</strong>
            <span>{user.demo ? 'Demonstration workspace' : 'Cooperative workspace'}</span>
          </div>
        </div>
        <div className="nav-section-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => navigate(n.id)}
              aria-current={page === n.id ? 'page' : undefined}
            >
              <n.icon size={19} />
              {n.label}
              {n.id === 'yard' &&
                !!workspace?.tasks.filter((t) => t.status === 'pending').length && (
                  <span className="nav-count">
                    {workspace.tasks.filter((t) => t.status === 'pending').length}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="conduit-card">
            <span className="station-small">
              <span className="live-dot" />
              CONNECTED TO THE EVIDENCE
            </span>
            <strong>Grounded in Conduit.</strong>
            <p>
              Real station observations.
              <br />A clearer next step.
            </p>
            <button onClick={() => navigate('data')}>
              Explore the data <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="sidebar-user">
            <span className="user-avatar">
              {user.name
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div>
              {user.demo ? (
                <strong>{user.name}</strong>
              ) : (
                <button
                  className="account-link"
                  onClick={() => setDialog({ type: 'account' })}
                  aria-label="Account settings"
                >
                  {user.name}
                </button>
              )}
              <span>
                {api.isDemoOnly ? 'Local demo' : user.demo ? 'Demo operator' : 'Workspace owner'}
              </span>
            </div>
            <button className="icon-button" onClick={signOut} aria-label="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{nav.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-label">
              <span className="live-dot" />
              Juja, Kenya <span className="divider">|</span> EAT
            </span>
            <a
              href="https://github.com/shi1720/Hack-The-Weather"
              target="_blank"
              rel="noreferrer"
              className="github-link"
            >
              Project <ArrowUpRight size={14} />
            </a>
            <button
              className="icon-button"
              onClick={() => navigate('yard')}
              aria-label="View pending jobs"
            >
              <Bell size={18} />
              {workspace?.tasks.some((t) => t.status === 'pending') && (
                <i className="notification-dot" />
              )}
            </button>
          </div>
        </header>
        <main id="main" className="main-content">
          {!online && (
            <div className="notice-strip">
              <Info size={16} />
              {api.isDemoOnly
                ? 'Offline demo · using the cached historical dataset and this device’s sample workspace.'
                : 'You are offline. Server changes cannot be saved until the connection returns.'}
            </div>
          )}
          {!workspace || !dataset || !plan ? (
            <div className="loading-panel">
              {loadingData ? (
                <>
                  <LoaderCircle className="spin" />
                  <p>Loading your workspace and Conduit observations…</p>
                </>
              ) : (
                <>
                  <ErrorNotice message={error || 'Your workspace could not be loaded.'} />
                  <Button onClick={load}>
                    <RefreshCw size={16} />
                    Try again
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="context-bar">
                <div>
                  <span className="context-icon">
                    <Clock3 size={15} />
                  </span>
                  <strong>{mode === 'replay' ? 'Historical replay' : 'Forecast guidance'}</strong>
                  <span>
                    {mode === 'replay'
                      ? 'Original Conduit observations. All hours shown are historical.'
                      : 'MET Norway model. Conduit archive is not a current sensor reading.'}
                  </span>
                </div>
                <div className="context-controls">
                  <label className="sr-only" htmlFor="data-mode">
                    Weather mode
                  </label>
                  <select
                    id="data-mode"
                    value={mode}
                    onChange={(e) => void changeMode(e.target.value)}
                    disabled={busy}
                  >
                    <option value="replay">Conduit replay</option>
                    <option value="forecast" disabled={api.isDemoOnly}>
                      {api.isDemoOnly ? 'Live forecast (server)' : 'Live forecast'}
                    </option>
                  </select>
                  {mode === 'replay' ? (
                    <>
                      <label className="sr-only" htmlFor="replay-date">
                        Replay date
                      </label>
                      <select
                        id="replay-date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      >
                        {dataset.summary.days.map((d) => (
                          <option key={d} value={d}>
                            {day(d)}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <span className="forecast-date">{day(date)}</span>
                  )}
                </div>
              </div>
              {mode === 'forecast' && forecast && (
                <div className="device-note">
                  <Info size={13} />
                  <span>
                    <a href="https://api.met.no/" target="_blank" rel="noreferrer">
                      MET Norway Locationforecast
                    </a>
                    {' · '}
                    <a
                      href="https://creativecommons.org/licenses/by/4.0/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      CC BY 4.0
                    </a>
                    {' · '}Issued {day(forecast.issuedAt)}, {time(forecast.issuedAt)} EAT
                    {' · '}Drying suitability calculated by Kavu
                  </span>
                </div>
              )}
              {api.isDemoOnly && (
                <div className="device-note">
                  <Info size={13} />
                  <span>
                    Interactive demo · sample cooperative records · changes saved on this device
                  </span>
                  <button onClick={() => setDialog({ type: 'reset' })}>Reset demo</button>
                </div>
              )}
              {plan.notices.length > 0 && (
                <details className="plan-notices">
                  <summary>
                    <Info size={14} />
                    {plan.notices[0]}
                    {plan.notices.length > 1 && <span>+{plan.notices.length - 1} notes</span>}
                  </summary>
                  <ul>
                    {plan.notices.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </details>
              )}
              {page === 'overview' && (
                <Overview
                  workspace={workspace}
                  dataset={dataset}
                  plan={plan}
                  onPlan={() => setDialog({ type: 'plan' })}
                  onAdd={() => setDialog({ type: 'batch' })}
                  navigate={navigate}
                  busy={busy}
                />
              )}
              {page === 'batches' && (
                <Batches
                  workspace={workspace}
                  onAdd={() => setDialog({ type: 'batch' })}
                  onMeasure={(b) => setDialog({ type: 'measure', batchId: b.id })}
                  onSelect={(b) => setDialog({ type: 'detail', batchId: b.id })}
                  send={send}
                />
              )}
              {page === 'yard' && (
                <Yard
                  workspace={workspace}
                  plan={plan}
                  onPlan={() => setDialog({ type: 'plan' })}
                  send={send}
                  onSelect={(b) => setDialog({ type: 'detail', batchId: b.id })}
                  onMeasure={(b) => setDialog({ type: 'measure', batchId: b.id })}
                  toast={toast}
                />
              )}
              {page === 'impact' && <Impact workspace={workspace} isDemo={user.demo} />}
              {page === 'data' && <Data workspace={workspace} dataset={dataset} send={send} />}
              <footer className="app-footer">
                <span>kavu. &nbsp; Every dry hour counts.</span>
                <span>Built with Conduit@Empathy · Hack the Weather 2026</span>
              </footer>
            </>
          )}
        </main>
      </div>
      {toastText && (
        <div className="toast" role="status">
          <Info size={18} />
          <span>{toastText}</span>
          <button onClick={() => setToastText('')} aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      )}
      {dialog?.type === 'account' && (
        <Modal title="Account settings" onClose={close}>
          <AccountForm
            user={user}
            onSuccess={() => {
              setUser(null);
              setWorkspace(null);
              setDataset(null);
              close();
              toast('Password changed. Sign in with your new password.');
            }}
          />
        </Modal>
      )}
      {dialog?.type === 'batch' && (
        <Modal title="Add a maize batch" onClose={close}>
          <BatchForm
            date={date}
            onSave={async (c) => {
              await send(c);
              close();
            }}
          />
        </Modal>
      )}
      {dialog?.type === 'measure' && modalBatch && (
        <Modal title="Log a moisture reading" onClose={close}>
          <MeasurementForm
            batch={modalBatch}
            onSave={async (c) => {
              await send(c);
              close();
            }}
          />
        </Modal>
      )}
      {dialog?.type === 'detail' && modalBatch && (
        <Modal title={modalBatch.name} onClose={close}>
          <div className="batch-detail">
            <div className="detail-metrics">
              <div>
                <span>Weight</span>
                <strong>{number(modalBatch.weightKg)} kg</strong>
              </div>
              <div>
                <span>Measured moisture</span>
                <strong>{modalBatch.moisturePct}%</strong>
              </div>
              <div>
                <span>Current status</span>
                <Badge tone="green">{modalBatch.status}</Badge>
              </div>
            </div>
            <p>
              Grower: <strong>{modalBatch.farmer}</strong> · Needed by {day(modalBatch.deadline)}
            </p>
            <h3>Measurement history</h3>
            <div className="reading-list">
              {[...modalBatch.measurements].reverse().map((m) => (
                <div key={m.id}>
                  <strong>{m.moisturePct}%</strong>
                  <p>
                    {m.note}
                    <span>
                      {day(m.measuredAt)} · {time(m.measuredAt)} EAT
                    </span>
                  </p>
                </div>
              ))}
            </div>
            <div className="info-box">
              <Info size={17} />
              <span>
                Storage readiness requires a recent measured reading at or below{' '}
                {modalBatch.targetMoisturePct}%. Complete your other quality checks before dispatch.
              </span>
            </div>
            <div className="dialog-actions">
              <Button
                secondary
                onClick={() => setDialog({ type: 'measure', batchId: modalBatch.id })}
                disabled={modalBatch.status === 'dispatched'}
              >
                <Droplets size={16} />
                Log reading
              </Button>
              {modalBatch.status !== 'dispatched' && (
                <Button
                  onClick={async () => {
                    try {
                      await send({
                        type: 'batch.status',
                        batchId: modalBatch.id,
                        status: modalBatch.status === 'ready' ? 'dispatched' : 'ready',
                      });
                      close();
                    } catch {
                      /* toast has error */
                    }
                  }}
                >
                  <PackageCheck size={16} />
                  {modalBatch.status === 'ready' ? 'Confirm dispatch' : 'Confirm storage readiness'}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
      {dialog?.type === 'plan' && plan && workspace && (
        <Modal title="Review the operator plan" onClose={close}>
          <p className="form-intro">
            {day(date, true)} · {mode === 'replay' ? 'Historical replay' : 'Forecast guidance'}.
            Recommendations use your measured batch inputs and{' '}
            {number(workspace.settings.capacityKg)} kg of yard capacity.
          </p>
          <div className="plan-summary">
            <div>
              <SunStat value={`${plan.dryHours} h`} label="Suitable hours" />
            </div>
            <div>
              <SunStat value={`${number(plan.capacityUsedKg)} kg`} label="Suggested allocation" />
            </div>
          </div>
          <div className="plan-review-list">
            {plan.recommendations.map((r) => (
              <div key={r.batchId}>
                <span className={`action-dot ${r.action}`} />
                <div>
                  <h3>
                    {r.title}
                    <span>{workspace.batches.find((b) => b.id === r.batchId)?.name}</span>
                  </h3>
                  <p>{r.reason}</p>
                </div>
              </div>
            ))}
            {!plan.recommendations.length && <p>Add an active batch to build a plan.</p>}
          </div>
          <div className="info-box">
            <Info size={17} />
            <span>
              {mode === 'replay'
                ? 'This creates sample jobs against historical weather. It is a workflow demonstration, not advice for the current day.'
                : 'Confirm local conditions before acting. Model forecasts do not guarantee a dry window.'}
            </span>
          </div>
          <div className="dialog-actions">
            <Button secondary onClick={close}>
              Keep reviewing
            </Button>
            <Button
              busy={busy}
              disabled={!plan.recommendations.length}
              onClick={async () => {
                setBusy(true);
                try {
                  await send({ type: 'plan.commit', date, mode });
                  close();
                  navigate('yard');
                } catch {
                  /* toast has error */
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create operator jobs <ArrowRight size={17} />
            </Button>
          </div>
        </Modal>
      )}
      {dialog?.type === 'reset' && (
        <Modal title="Reset this demo workspace?" onClose={close}>
          <p className="form-intro">
            This replaces this device’s sample batches, readings and jobs with the original
            demonstration. Export any records you want to keep first.
          </p>
          <div className="dialog-actions">
            <Button secondary onClick={close}>
              Keep my changes
            </Button>
            <Button
              onClick={async () => {
                try {
                  await send({ type: 'demo.reset' });
                  close();
                } catch {
                  /* toast has error */
                }
              }}
            >
              <RefreshCw size={16} />
              Reset sample records
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function SunStat({ value, label }: { value: string; label: string }) {
  return (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );
}
