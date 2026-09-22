import { useState } from 'react';
import {
  Database,
  Check,
  MapPin,
  Download,
  Settings2,
  FileCheck2,
  Info,
  Clock3,
} from 'lucide-react';
import {
  Badge,
  Button,
  ErrorNotice,
  PageTitle,
  PanelTitle,
  SourceLink,
  Stat,
} from '../components/UI';
import type { Dataset, Workspace, WorkspaceCommand } from '../shared/types';
import { day, download, number } from '../lib/format';
export default function Data({
  dataset: d,
  workspace: w,
  send,
}: {
  dataset: Dataset;
  workspace: Workspace;
  send: (c: WorkspaceCommand) => Promise<void>;
}) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow="DATA & WORKSPACE"
        title="Trust starts at the source."
        text="Real observations. Visible gaps. Decisions you can trace."
        actions={
          <Button
            secondary
            onClick={() =>
              download(
                'kavu-data-provenance.json',
                JSON.stringify(
                  { station: d.station, summary: d.summary, sources: d.sources, notes: d.notes },
                  null,
                  2,
                ),
                'application/json',
              )
            }
          >
            <Download size={16} />
            Provenance report
          </Button>
        }
      />
      <div className="station-banner">
        <div className="station-emblem">
          <Database size={28} />
        </div>
        <div>
          <div className="eyebrow">STATION RECORDS · JKUAT</div>
          <h2>Conduit@Empathy</h2>
          <p>{d.station.name}</p>
          <span>
            <MapPin size={14} />
            {d.station.latitude.toFixed(6)}, {d.station.longitude.toFixed(6)} ·{' '}
            {number(d.station.elevationM)} m elevation
          </span>
        </div>
        <SourceLink href="https://conduit.jhubafrica.com/">Visit data platform</SourceLink>
      </div>
      <div className="stats-grid data-stats">
        <Stat
          title="Unique observations"
          value={number(d.summary.uniqueRows)}
          note={`${number(d.summary.rawRows)} raw rows ingested`}
          icon={<Database size={19} />}
        />
        <Stat
          title="Overlapping rows removed"
          value={number(d.summary.duplicatesRemoved)}
          note="Deduplicated by UTC timestamp"
          icon={<FileCheck2 size={19} />}
        />
        <Stat
          title="Observation period"
          value={
            <span className="date-stat">
              {day(d.summary.firstAt)}
              <br />
              <small>to {day(d.summary.lastAt)}</small>
            </span>
          }
          note="2026 · original timestamps preserved"
          icon={<Clock3 size={19} />}
        />
      </div>
      <div className="data-layout">
        <section className="panel">
          <PanelTitle
            title="What goes into a decision"
            meta="Source measurements and their role in the drying plan."
          />
          <div className="data-fields">
            {[
              [
                'Temperature + humidity',
                'Vapour pressure deficit estimates the air’s drying potential. It does not estimate grain moisture.',
                'SHT Temperature · SHT Humidity',
              ],
              [
                'Primary rain gauge',
                'Reported rainfall closes an outdoor drying window. Missing rainfall never becomes zero.',
                'Rain Gauge 1 (Gauge 2 excluded)',
              ],
              [
                'Time + data coverage',
                'Only daylight windows with sufficient observed coverage can support a replay allocation. Gaps stay visible.',
                'UTC timestamp · hourly sample coverage',
              ],
              [
                'Batch measurements',
                'Measured moisture, weight, deadline and yard capacity determine what work is feasible.',
                'Operator input · measured, not inferred',
              ],
            ].map(([title, desc, source]) => (
              <div className="data-field" key={title}>
                <Check size={17} />
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <code>{source}</code>
                </div>
              </div>
            ))}
          </div>
          <div className="methodology-notes">
            <h3>Important interpretation notes</h3>
            <ul>
              {d.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
            <p>
              Suitability thresholds are transparent operating heuristics awaiting local field
              calibration. Retrospective replay is not a forecast-accuracy test.
            </p>
          </div>
        </section>
        <section className="panel settings-panel">
          <PanelTitle
            title="Workspace settings"
            meta="Capacity and costs should match your operation."
          >
            <Settings2 size={19} />
          </PanelTitle>
          <form
            className="form-stack"
            key={w.revision}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              setError('');
              try {
                await send({
                  type: 'settings.update',
                  settings: {
                    ...w.settings,
                    name: String(f.get('name')),
                    capacityKg: Number(f.get('capacity')),
                    dryerRateKes: Number(f.get('rate')),
                    targetMoisturePct: Number(f.get('target')),
                    latitude: Number(f.get('latitude')),
                    longitude: Number(f.get('longitude')),
                  },
                });
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not save settings.');
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && <ErrorNotice message={error} />}
            <label>
              Cooperative / yard name
              <input name="name" defaultValue={w.settings.name} required maxLength={100} />
            </label>
            <div className="form-row">
              <label>
                Outdoor capacity (kg)
                <input
                  name="capacity"
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  defaultValue={w.settings.capacityKg}
                  required
                />
              </label>
              <label>
                Moisture target (%)
                <input
                  name="target"
                  type="number"
                  min="10"
                  max="14"
                  step="0.1"
                  defaultValue={w.settings.targetMoisturePct}
                  required
                />
              </label>
            </div>
            <label>
              Dryer rate (KSh / tonne / moisture point)
              <input
                name="rate"
                type="number"
                min="0"
                max="100000"
                step="0.1"
                defaultValue={w.settings.dryerRateKes}
                required
              />
            </label>
            <div className="form-row">
              <label>
                Yard latitude
                <input
                  name="latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  defaultValue={w.settings.latitude}
                  required
                />
              </label>
              <label>
                Yard longitude
                <input
                  name="longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  defaultValue={w.settings.longitude}
                  required
                />
              </label>
            </div>
            <div className="info-box">
              <MapPin size={17} />
              <span>
                One station cannot represent every farm. Conduit guidance is restricted to your
                configured local radius ({w.settings.maxDistanceKm} km). This is a conservative
                product limit, not a scientifically validated coverage area.
              </span>
            </div>
            <Button type="submit" busy={busy}>
              <Check size={17} />
              Save settings
            </Button>
            <p className="form-note">
              The moisture target applies to newly created batches. Existing batch targets remain
              auditable.
            </p>
          </form>
        </section>
      </div>
      <section className="panel">
        <PanelTitle
          title="Original files & provenance"
          meta="Organizer-provided GeoCSV files, retrieved without changing measurements."
        />
        <div className="source-files">
          {d.sources.map((s) => (
            <div className="source-file" key={s.file}>
              <FileCheck2 size={22} />
              <div>
                <h3>{s.file}</h3>
                <span>{number(s.rows)} observations</span>
                <code title={s.sha256}>SHA-256 {s.sha256}</code>
              </div>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="icon-button"
                aria-label={`Download ${s.file}`}
              >
                <Download size={19} />
              </a>
            </div>
          ))}
        </div>
        <div className="panel-footer">
          <SourceLink href="https://drive.google.com/drive/folders/1KDoCh8vss7nv_B6SuVBlQQssjSh1yaBg">
            Organizer’s source folder
          </SourceLink>
          <SourceLink href="https://3d-fewsnet.icdp.ucar.edu/instruments/61">
            CHORDS station 61
          </SourceLink>
        </div>
      </section>
      {d.summary.gaps.length > 0 && (
        <section className="panel gaps-panel">
          <PanelTitle
            title="Gaps are part of the evidence"
            meta="No values are fabricated to bridge station outages."
          />
          {d.summary.gaps.map((g, i) => (
            <div className="gap-row" key={i}>
              <Info size={17} />
              <span>
                {day(g.from)} to {day(g.to)}
              </span>
              <Badge tone="amber">{number(g.hours)} hours without observations</Badge>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
