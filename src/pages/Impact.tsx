import { Download, Scale, Droplets, ClipboardCheck, Info, Sprout } from 'lucide-react';
import { Badge, Button, Empty, PageTitle, PanelTitle, Stat, SourceLink } from '../components/UI';
import type { Workspace } from '../shared/types';
import { dryingCost } from '../shared/engine';
import { day, download, number, time } from '../lib/format';
import { evidenceCsv } from '../lib/evidence';
export default function Impact({
  workspace: w,
  isDemo,
}: {
  workspace: Workspace;
  isDemo: boolean;
}) {
  const measured = w.batches.filter((b) => b.measurements.length > 1),
    kg = measured.reduce((s, b) => s + b.weightKg, 0),
    completed = w.tasks.filter((t) => t.status === 'done');
  const equivalent = w.batches.reduce(
    (s, b) =>
      s +
      Math.max(
        0,
        dryingCost(b.weightKg, b.initialMoisturePct, b.targetMoisturePct, w.settings.dryerRateKes) -
          dryingCost(b.weightKg, b.moisturePct, b.targetMoisturePct, w.settings.dryerRateKes),
      ),
    0,
  );
  function exportLedger() {
    download('kavu-impact-ledger.csv', evidenceCsv(w, isDemo));
  }
  return (
    <>
      <PageTitle
        eyebrow="IMPACT LEDGER"
        title="Evidence, one batch at a time."
        text="Separate the work completed from the value still to be proven."
        actions={
          <Button secondary onClick={exportLedger}>
            <Download size={17} />
            Export evidence
          </Button>
        }
      />
      {isDemo && (
        <div className="notice-strip">
          <Info size={17} />
          <span>
            Demonstration workspace. Batch records illustrate the workflow; they are not
            field-verified impact.
          </span>
        </div>
      )}
      <div className="stats-grid impact-stats">
        <Stat
          title="Completed jobs"
          value={completed.length}
          note="Recorded operator actions"
          icon={<ClipboardCheck size={20} />}
          accent
        />
        <Stat
          title="Grain remeasured"
          value={
            <>
              {number(kg / 1000)}
              <small>tonnes</small>
            </>
          }
          note="Batches with a follow-up reading"
          icon={<Scale size={20} />}
        />
        <Stat
          title="Tariff-equivalent reduction"
          value={
            <>
              <small>KSh</small>
              {number(Math.round(equivalent))}
            </>
          }
          note="Measured gap reduction · not savings"
          icon={<Droplets size={20} />}
        />
      </div>
      <div className="impact-layout">
        <section className="panel">
          <PanelTitle
            title="The moisture trail"
            meta="Intake reading compared with the latest recorded measurement."
          />
          {w.batches.length ? (
            <div className="moisture-comparison">
              {w.batches.map((b) => (
                <div key={b.id} className="comparison-row">
                  <div>
                    <strong>{b.name}</strong>
                    <span>
                      {number(b.weightKg)} kg · {b.measurements.length} reading
                      {b.measurements.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="comparison-chart">
                    <div
                      className="comparison-bar initial"
                      style={{ width: `${(b.initialMoisturePct / 45) * 100}%` }}
                    >
                      <span>{b.initialMoisturePct}% intake</span>
                    </div>
                    <div
                      className="comparison-bar latest"
                      style={{ width: `${(b.moisturePct / 45) * 100}%` }}
                    >
                      <span>{b.moisturePct}% latest</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Your evidence starts at intake.">
              Add a batch and log a follow-up reading to track the moisture change.
            </Empty>
          )}
          <div className="panel-footer">
            <span>
              <i className="legend-dot cream" /> Intake
            </span>
            <span>
              <i className="legend-dot green" /> Latest measured
            </span>
            <span>Moisture % wet basis</span>
          </div>
        </section>
        <aside className="method-card">
          <Scale size={27} />
          <h2>Value you can explain.</h2>
          <p>NCPB publishes a drying tariff per tonne, per percentage point of moisture removed.</p>
          <div className="formula">
            <span>Weight in tonnes</span>
            <b>×</b>
            <span>Moisture gap in percentage points</span>
            <b>×</b>
            <span>KSh {number(w.settings.dryerRateKes)} reference rate</span>
          </div>
          <p className="small-copy">
            A smaller moisture gap reduces the quoted dryer equivalent. Actual savings need
            invoices, handling costs, and a comparable baseline.
          </p>
          <SourceLink href="https://ncpb.co.ke/drying/">Read the NCPB tariff</SourceLink>
        </aside>
      </div>
      <section className="panel">
        <PanelTitle
          title="The action record"
          meta="An audit trail of workspace changes and completed work."
        >
          <Badge>Latest {w.audit.length} events</Badge>
        </PanelTitle>
        {w.audit.length ? (
          <div className="audit-list">
            {w.audit.slice(0, 30).map((a) => (
              <div key={a.id} className="audit-row">
                <span className="audit-dot" />
                <div>
                  <strong>{a.detail}</strong>
                  <span>{a.action.replaceAll('.', ' · ')}</span>
                </div>
                <time>
                  {day(a.at)} · {time(a.at)} EAT
                </time>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Ready to record your first action.">
            Changes to batches, plans and measurements appear here.
          </Empty>
        )}
      </section>
      <div className="pilot-note">
        <Sprout size={23} />
        <p>
          <strong>The next proof is in the field.</strong> A cooperative pilot should track actual
          dryer invoices, verified moisture, covered-before-rain events, operator adoption and
          handling costs. Kavu currently claims no measured reduction in food loss or emissions.
        </p>
      </div>
    </>
  );
}
