import { useState } from 'react';
import { Search, Plus, Droplets, ChevronRight, PackageCheck, Download, Clock3 } from 'lucide-react';
import { Badge, Button, Empty, PageTitle } from '../components/UI';
import type { Batch, Workspace, WorkspaceCommand } from '../shared/types';
import { csv, day, download, number } from '../lib/format';
export default function Batches({
  workspace: w,
  onAdd,
  onMeasure,
  onSelect,
  send: _send,
}: {
  workspace: Workspace;
  onAdd: () => void;
  onMeasure: (b: Batch) => void;
  onSelect: (b: Batch) => void;
  send: (c: WorkspaceCommand) => Promise<void>;
}) {
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all');
  const shown = w.batches.filter(
    (b) =>
      (filter === 'all' || b.status === filter) &&
      `${b.name} ${b.farmer}`.toLowerCase().includes(query.toLowerCase()),
  );
  function exportCsv() {
    download(
      'kavu-batches.csv',
      csv([
        [
          'Batch',
          'Grower',
          'Weight kg',
          'Measured moisture %',
          'Target %',
          'Status',
          'Needed by (EAT calendar date)',
        ],
        ...shown.map((b) => [
          b.name,
          b.farmer,
          b.weightKg,
          b.moisturePct,
          b.targetMoisturePct,
          b.status,
          b.deadline,
        ]),
      ]),
    );
  }
  return (
    <>
      <PageTitle
        eyebrow="BATCH REGISTER"
        title="Know every batch."
        text="Measured at intake. Tracked through every drying decision."
        actions={
          <>
            <Button
              secondary
              onClick={exportCsv}
              disabled={!shown.length}
              title="Export the batches matching your current filters"
            >
              <Download size={16} />
              Export CSV
            </Button>
            <Button onClick={onAdd}>
              <Plus size={17} />
              Add batch
            </Button>
          </>
        }
      />
      <section className="panel">
        <div className="table-toolbar">
          <div className="filter-tabs">
            {['all', 'queued', 'drying', 'covered', 'ready', 'dispatched'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                aria-pressed={filter === s}
                className={filter === s ? 'active' : ''}
              >
                {s === 'all' ? 'All batches' : s}
                <span>{w.batches.filter((b) => s === 'all' || b.status === s).length}</span>
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              aria-label="Search batches"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a batch or grower"
            />
          </label>
        </div>
        {shown.length > 0 && (
          <p className="table-scroll-hint">
            Scroll sideways for moisture, status and batch actions.
          </p>
        )}
        {shown.length ? (
          <div className="table-scroll" role="region" aria-label="Batch register" tabIndex={0}>
            <table className="batch-table">
              <thead>
                <tr>
                  <th>Batch / grower</th>
                  <th>Weight</th>
                  <th>Moisture / target</th>
                  <th>Needed by</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <button className="batch-name" onClick={() => onSelect(b)}>
                        {b.name}
                        <ChevronRight size={14} />
                      </button>
                      <span>{b.farmer}</span>
                    </td>
                    <td>{number(b.weightKg)} kg</td>
                    <td>
                      <strong>
                        {b.moisturePct}%{' '}
                        <span className="inline-muted">/ {b.targetMoisturePct}%</span>
                      </strong>
                      <div className="moisture-track">
                        <i style={{ width: `${Math.min(100, (b.moisturePct / 35) * 100)}%` }} />
                        <b style={{ left: `${(b.targetMoisturePct / 35) * 100}%` }} />
                      </div>
                    </td>
                    <td>
                      {day(b.deadline)}
                      <span>
                        <Clock3 size={11} />
                        Local calendar day
                      </span>
                    </td>
                    <td>
                      <Badge
                        tone={
                          b.status === 'ready'
                            ? 'green'
                            : b.status === 'drying'
                              ? 'amber'
                              : b.status === 'covered'
                                ? 'blue'
                                : 'neutral'
                        }
                      >
                        {b.status}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="small-button"
                        onClick={() => onMeasure(b)}
                        disabled={b.status === 'dispatched'}
                      >
                        <Droplets size={15} />
                        Log reading
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            <Empty
              title={
                w.batches.length ? 'No batches match your search.' : 'Your first batch starts here.'
              }
            >
              {w.batches.length
                ? 'Try another name or status.'
                : 'Add a maize batch with its weight and measured moisture.'}
            </Empty>
            {w.batches.length > 0 && (
              <div className="empty-action">
                <Button
                  secondary
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
      <div className="callout-row">
        <PackageCheck size={24} />
        <div>
          <h3>Storage readiness starts with a measurement.</h3>
          <p>
            The moisture target supports your operating procedure. It is not a food-safety or
            aflatoxin certificate. Confirm other quality requirements before dispatch.
          </p>
        </div>
      </div>
    </>
  );
}
