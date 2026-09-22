import type { Batch } from '../shared/types';
import { number } from '../lib/format';
export default function YardMap({
  batches,
  capacity,
  onSelect,
}: {
  batches: Batch[];
  capacity: number;
  onSelect?: (id: string) => void;
}) {
  const active = batches.filter((b) => b.status === 'drying' && b.bay !== 'Mechanical dryer');
  return (
    <div className="yard-map">
      <div className="yard-road">
        <span>RECEIVING LANE</span>
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="yard-bays">
        {Array.from({ length: Math.max(4, active.length) }, (_, i) => {
          const b = active[i];
          return (
            <button
              key={i}
              className={`yard-bay ${b ? b.status : 'available'}`}
              onClick={() => b && onSelect?.(b.id)}
              disabled={!b}
              aria-label={b ? `Open ${b.name}` : `Slot ${i + 1} available`}
            >
              <span className="bay-label">LOT 0{i + 1}</span>
              <div className="grain-lines">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <strong>{b ? b.name : 'Available'}</strong>
              <small>
                {b
                  ? `${number(b.weightKg)} kg · ${b.moisturePct}% moisture`
                  : 'Ready for the next batch'}
              </small>
              <span className="bay-state">{b ? b.status : 'Open space'}</span>
            </button>
          );
        })}
      </div>
      <div className="yard-map-bottom">
        <span>OUTDOOR LOTS · SCHEMATIC</span>
        <span>Yard capacity {number(capacity)} kg</span>
      </div>
    </div>
  );
}
