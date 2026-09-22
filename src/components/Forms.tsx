import { useState } from 'react';
import { Check, Plus, Droplets, Info, ArrowRight } from 'lucide-react';
import { Button, ErrorNotice } from './UI';
import type { Batch, WorkspaceCommand } from '../shared/types';
import { number } from '../lib/format';
type Save = (cmd: WorkspaceCommand) => Promise<void>;
export function BatchForm({ onSave, date }: { onSave: Save; date: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError('');
        try {
          await onSave({
            type: 'batch.create',
            name: String(f.get('name')),
            farmer: String(f.get('farmer')),
            weightKg: Number(f.get('weight')),
            moisturePct: Number(f.get('moisture')),
            deadline: String(f.get('deadline')),
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not save batch.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="form-intro">
        Start with a scale and a moisture meter. Kavu uses these readings to plan the next action.
      </p>
      {error && <ErrorNotice message={error} />}
      <label>
        Batch name
        <input name="name" placeholder="e.g. North field E-05" required maxLength={80} />
      </label>
      <label>
        Grower or group
        <input name="farmer" placeholder="e.g. North field growers" required maxLength={100} />
      </label>
      <div className="form-row">
        <label>
          Weight (kg)
          <input
            name="weight"
            type="number"
            min="1"
            max="100000"
            step="1"
            placeholder="2500"
            required
          />
        </label>
        <label>
          Measured moisture (%)
          <input
            name="moisture"
            type="number"
            min="5"
            max="45"
            step="0.1"
            placeholder="18.5"
            required
          />
        </label>
      </div>
      <label>
        Needed by (EAT)
        <input name="deadline" type="date" min={date} defaultValue={date} required />
      </label>
      <div className="info-box">
        <Info size={17} />
        <span>
          Maize only. Use a representative moisture-meter sample. Weather cannot measure grain
          moisture or detect aflatoxin.
        </span>
      </div>
      <Button type="submit" busy={busy}>
        <Plus size={17} />
        Add batch
      </Button>
    </form>
  );
}
export function MeasurementForm({ batch, onSave }: { batch: Batch; onSave: Save }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError('');
        try {
          await onSave({
            type: 'batch.measure',
            batchId: batch.id,
            moisturePct: Number(f.get('moisture')),
            note: String(f.get('note')),
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not save reading.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="measurement-summary">
        <div>
          <span>{batch.name}</span>
          <strong>
            {number(batch.weightKg)} <small>kg maize</small>
          </strong>
        </div>
        <ArrowRight size={20} />
        <div>
          <span>Last measured</span>
          <strong>
            {batch.moisturePct}
            <small>%</small>
          </strong>
        </div>
      </div>
      {error && <ErrorNotice message={error} />}
      <label>
        New measured moisture (%)
        <input
          name="moisture"
          type="number"
          step="0.1"
          min="5"
          max="45"
          required
          placeholder="e.g. 14.2"
        />
      </label>
      <label>
        Measurement note
        <textarea
          name="note"
          required
          maxLength={500}
          placeholder="Meter ID, sampling location, and operator. e.g. Meter 02; three samples from across the batch."
          rows={3}
        />
      </label>
      <div className="info-box">
        <Droplets size={17} />
        <span>
          Record a reading from your meter, not a weather estimate. The operational moisture target
          is {batch.targetMoisturePct}%. Other quality checks still apply.
        </span>
      </div>
      <Button type="submit" busy={busy}>
        <Check size={17} />
        Save measurement
      </Button>
    </form>
  );
}
