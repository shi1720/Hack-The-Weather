import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    [dialogError, setDialogError] = useState(''),
    [date, setDate] = useState('2026-09-12'),
    [previousReplayDate, setPreviousReplayDate] = useState('2026-09-12'),
    [mode, setMode] = useState<'replay' | 'forecast'>('replay'),
    [forecast, setForecast] = useState<Forecast | undefined>(),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [loadingData, setLoadingData] = useState(false),
    [saving, setSaving] = useState(false),
    [clock, setClock] = useState(Date.now()),
    [smallScreen, setSmallScreen] = useState(() => matchMedia('(max-width: 760px)').matches);
  const sidebarRef = useRef<HTMLElement>(null),
    commandPending = useRef(false),
    loadGeneration = useRef(0),
    forecastGeneration = useRef(0);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    const media = matchMedia('(max-width: 760px)');
    const update = () => {
      setSmallScreen(media.matches);
      if (!media.matches) setMobile(false);
    };
    media.addEventListener('change', update);
    return () => {
      clearInterval(timer);
      media.removeEventListener('change', update);
    };
  }, []);
  useEffect(() => {
    if (!mobile || !smallScreen) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = sidebarRef.current;
    const controls = () =>
      [...(node?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? [])].filter(
        (el) => el.getClientRects().length > 0,
      );
    controls()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobile(false);
      if (event.key === 'Tab') {
        const items = controls(),
          first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [mobile, smallScreen]);
  const toast = useCallback((s: string) => setToastText(s), []),
    close = useCallback(() => {
      setDialog(null);
      setDialogError('');
    }, []);
  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);
  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoadingData(true);
    setError('');
    try {
      const [w, d] = await Promise.all([api.getWorkspace(), api.getDataset()]);
      if (generation !== loadGeneration.current) return;
      setWorkspace(w);
      setDataset(d);
      if (!d.summary.days.includes('2026-09-12'))
        setDate(d.summary.days[Math.max(0, d.summary.days.length - 2)]);
    } catch (e) {
      if (generation !== loadGeneration.current) return;
      setError(e instanceof Error ? e.message : 'Workspace could not load.');
      if (e instanceof api.APIError && e.status === 401) {
        setUser(null);
        setWorkspace(null);
        setDataset(null);
      }
    } finally {
      if (generation === loadGeneration.current) setLoadingData(false);
    }
  }, []);
  useEffect(() => {
    if (user) void load();
    return () => {
      loadGeneration.current++;
      forecastGeneration.current++;
    };
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
    requestAnimationFrame(() => document.getElementById('main')?.focus({ preventScroll: true }));
  };
  const plan = useMemo(
    () =>
      workspace && dataset ? buildPlan(workspace, dataset, date, mode, forecast, clock) : null,
    [workspace, dataset, date, mode, forecast, clock],
  );
  const pendingJobCount =
    workspace?.tasks.filter(
      (task) => task.status === 'pending' && task.id.startsWith(`plan:${mode}:${date}:`),
    ).length ?? 0;
  async function send(command: WorkspaceCommand) {
    if (!workspace) return;
    if (commandPending.current)
      throw new Error('Another change is still saving. Please wait and try again.');
    commandPending.current = true;
    setSaving(true);
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
      if (e instanceof api.APIError && e.status === 401) {
        setError('Your session has ended. Sign in again to continue.');
        setUser(null);
        setWorkspace(null);
        setDataset(null);
        setDialog(null);
      }
      if (e instanceof api.APIError && e.status === 409) {
        try {
          setWorkspace(await api.getWorkspace());
          e.message =
            'The workspace changed in another tab. Latest records loaded. Review your entries and save again.';
          toast(e.message);
        } catch {
          /* Original save error remains visible. */
        }
      }
      throw e;
    } finally {
      commandPending.current = false;
      setSaving(false);
    }
  }
  async function changeMode(value: string) {
    if (value === 'replay') {
      setMode('replay');
      setDate(previousReplayDate);
      return;
    }
    if (!workspace) return;
    const generation = ++forecastGeneration.current;
    setBusy(true);
    try {
      const f = await api.getForecast(workspace.settings.latitude, workspace.settings.longitude);
      if (generation !== forecastGeneration.current) return;
      setForecast(f);
      if (mode === 'replay') setPreviousReplayDate(date);
      setDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }));
      setMode('forecast');
      setClock(Date.now());
      toast('Forecast loaded. Check source freshness and local limits before acting.');
    } catch (e) {
      if (generation !== forecastGeneration.current) return;
      toast(
        e instanceof Error
          ? e.message
          : 'Forecast unavailable. Historical replay remains available.',
      );
    } finally {
      if (generation === forecastGeneration.current) setBusy(false);
    }
  }
  async function signOut() {
    try {
      await api.logout();
      setUser(null);
      setWorkspace(null);
      setDataset(null);
      setDialog(null);
      setMobile(false);
      setBusy(false);
      setForecast(undefined);
      setMode('replay');
      setDate('2026-09-12');
      setPreviousReplayDate('2026-09-12');
      setToastText('');
      setDialogError('');
      setError('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Sign out failed.');
    }
  }
  if (!loaded)
    return (
      <main className="loading-page" aria-busy="true">
        <Logo />
        <LoaderCircle size={24} className="spin" />
        <p role="status">Opening the drying desk…</p>
      </main>
    );
  if (!user)
    return (
      <Auth
        notice={error || toastText}
        onLogin={(nextUser) => {
          setError('');
          setDialogError('');
          setToastText('');
          setForecast(undefined);
          setMode('replay');
          setDate('2026-09-12');
          setPreviousReplayDate('2026-09-12');
          setUser(nextUser);
        }}
      />
    );
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
      <aside
        ref={sidebarRef}
        id="workspace-navigation"
        className={`sidebar ${mobile ? 'open' : ''}`}
        inert={smallScreen && !mobile}
        role={smallScreen && mobile ? 'dialog' : undefined}
        aria-modal={smallScreen && mobile ? true : undefined}
        aria-label={smallScreen && mobile ? 'Workspace navigation' : undefined}
      >
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
              {n.id === 'yard' && pendingJobCount > 0 && (
                <span className="nav-count">{pendingJobCount}</span>
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
                  onClick={() => {
                    if (mobile) {
                      setMobile(false);
                      requestAnimationFrame(() => setDialog({ type: 'account' }));
                    } else setDialog({ type: 'account' });
                  }}
                  aria-label="Account settings"
                >
                  {user.name}
                </button>
              )}
              <span>
                {api.isDemoOnly ? 'Local demo' : user.demo ? 'Demo operator' : 'Workspace owner'}
              </span>
            </div>
            <button
              className="icon-button"
              onClick={signOut}
              aria-label="Sign out"
              disabled={saving || busy}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell" inert={smallScreen && mobile}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-controls="workspace-navigation"
              aria-expanded={mobile}
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
              Yard time <span className="divider">|</span> EAT
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
              {pendingJobCount > 0 && <i className="notification-dot" />}
            </button>
          </div>
        </header>
        <main id="main" className="main-content" tabIndex={-1}>
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
                    <>
                      <span className="forecast-date">{day(date)}</span>
                      <button
                        className="icon-button forecast-refresh"
                        aria-label="Refresh live forecast"
                        title="Refresh live forecast"
                        disabled={busy}
                        onClick={() => void changeMode('forecast')}
                      >
                        <RefreshCw size={16} className={busy ? 'spin' : ''} />
                      </button>
                    </>
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
              {user.demo && (
                <div className="device-note">
                  <Info size={13} />
                  <span>
                    {api.isDemoOnly
                      ? 'Interactive demo · sample records saved on this device'
                      : 'Interactive demo · isolated sample workspace'}
                  </span>
                  <button onClick={() => setDialog({ type: 'reset' })}>Reset demo</button>
                </div>
              )}
              {plan.notices.length > 0 && (
                <details className="plan-notices">
                  <summary>
                    <Info size={14} />
                    Operating limits and source notes
                    <span>{plan.notices.length} notes</span>
                  </summary>
                  <ul>
                    {plan.notices.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </details>
              )}
              {!user.demo && mode === 'replay' && (
                <div className="replay-boundary">
                  <Clock3 size={16} />
                  <span>
                    Reviewing past weather. Switch to a live forecast before planning outdoor work
                    for today.
                  </span>
                  <button disabled={busy} onClick={() => void changeMode('forecast')}>
                    Use live forecast <ArrowRight size={14} />
                  </button>
                </div>
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
                  isDemo={user.demo}
                  onReplay={(replayDate) => {
                    setMode('replay');
                    setDate(replayDate);
                  }}
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
                  isDemo={user.demo}
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
            date={
              user.demo
                ? date
                : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
            }
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
            {dialogError && <ErrorNotice message={dialogError} />}
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
                  busy={saving}
                  onClick={async () => {
                    setDialogError('');
                    try {
                      await send({
                        type: 'batch.status',
                        batchId: modalBatch.id,
                        status: modalBatch.status === 'ready' ? 'dispatched' : 'ready',
                      });
                      close();
                    } catch (e) {
                      setDialogError(
                        e instanceof Error
                          ? e.message
                          : 'The status could not be saved. Please retry.',
                      );
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
          {dialogError && <ErrorNotice message={dialogError} />}
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
                ? user.demo
                  ? 'This creates sample jobs against historical weather. It is a workflow demonstration, not advice for the current day.'
                  : 'This creates historical review jobs. Outdoor work is disabled for real workspaces in replay; use a live forecast for current operations.'
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
                setDialogError('');
                try {
                  await send({ type: 'plan.commit', date, mode });
                  close();
                  navigate('yard');
                } catch (e) {
                  setDialogError(
                    e instanceof Error ? e.message : 'The plan could not be saved. Please retry.',
                  );
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
          {dialogError && <ErrorNotice message={dialogError} />}
          <p className="form-intro">
            This replaces this demo workspace’s sample batches, readings and jobs with the original
            demonstration. Export any records you want to keep first.
          </p>
          <div className="dialog-actions">
            <Button secondary onClick={close}>
              Keep my changes
            </Button>
            <Button
              busy={saving}
              onClick={async () => {
                setDialogError('');
                try {
                  await send({ type: 'demo.reset' });
                  setMode('replay');
                  setDate('2026-09-12');
                  setForecast(undefined);
                  close();
                } catch (e) {
                  setDialogError(
                    e instanceof Error ? e.message : 'The reset could not be saved. Please retry.',
                  );
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
