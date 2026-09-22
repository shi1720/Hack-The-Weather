export type BatchStatus = 'queued' | 'drying' | 'covered' | 'ready' | 'dispatched';
export type TaskAction = 'spread' | 'turn' | 'cover' | 'measure' | 'dryer' | 'store';
export interface Measurement {
  id: string;
  moisturePct: number;
  measuredAt: string;
  note: string;
}
export interface Batch {
  id: string;
  name: string;
  farmer: string;
  weightKg: number;
  moisturePct: number;
  initialMoisturePct: number;
  targetMoisturePct: number;
  receivedAt: string;
  deadline: string;
  status: BatchStatus;
  bay: string | null;
  measurements: Measurement[];
}
export interface YardSettings {
  name: string;
  capacityKg: number;
  dryerRateKes: number;
  targetMoisturePct: number;
  latitude: number;
  longitude: number;
  maxDistanceKm: number;
}
export interface Task {
  id: string;
  batchId: string;
  action: TaskAction;
  title: string;
  reason: string;
  dueAt: string;
  status: 'pending' | 'done';
  completedAt: string | null;
}
export interface AuditEntry {
  id: string;
  at: string;
  action: string;
  detail: string;
  batchId?: string;
}
export interface Workspace {
  revision: number;
  batches: Batch[];
  tasks: Task[];
  settings: YardSettings;
  audit: AuditEntry[];
}
export interface User {
  id: string;
  name: string;
  email: string;
  demo: boolean;
}
export interface Observation {
  timestamp: string;
  temperatureC: number | null;
  humidityPct: number | null;
  rainMm: number | null;
  windMs: number | null;
  flags: string[];
}
export interface WeatherHour {
  timestamp: string;
  temperatureC: number | null;
  humidityPct: number | null;
  rainMm: number | null;
  windMs: number | null;
  sampleCount: number;
  coverage: number;
  vpdKpa: number | null;
  verdict: 'dry' | 'marginal' | 'cover' | 'unknown';
  reasons: string[];
}
export interface DataSource {
  file: string;
  url: string;
  sha256: string;
  rows: number;
}
export interface Dataset {
  station: { name: string; latitude: number; longitude: number; elevationM: number };
  observations: Observation[];
  hours: WeatherHour[];
  summary: {
    rawRows: number;
    uniqueRows: number;
    duplicatesRemoved: number;
    invalidRows: number;
    firstAt: string;
    lastAt: string;
    days: string[];
    gaps: { from: string; to: string; hours: number }[];
  };
  sources: DataSource[];
  importedAt: string;
  notes: string[];
}
export interface Recommendation {
  batchId: string;
  action: TaskAction;
  title: string;
  reason: string;
  priority: number;
  assignedKg: number;
  estimatedDryerCostKes: number;
}
export interface Plan {
  date: string;
  mode: 'replay' | 'forecast';
  hours: WeatherHour[];
  recommendations: Recommendation[];
  dryHours: number;
  coverBy: string | null;
  capacityUsedKg: number;
  remainingCapacityKg: number;
  totalDryerCostKes: number;
  confidence: 'good' | 'limited' | 'unavailable';
  notices: string[];
}
export interface Forecast {
  fetchedAt: string;
  issuedAt: string;
  hours: WeatherHour[];
  source: string;
  latitude: number;
  longitude: number;
}
export type WorkspaceCommand =
  | {
      type: 'batch.create';
      name: string;
      farmer: string;
      weightKg: number;
      moisturePct: number;
      deadline: string;
    }
  | { type: 'batch.measure'; batchId: string; moisturePct: number; note: string }
  | { type: 'batch.status'; batchId: string; status: BatchStatus }
  | { type: 'plan.commit'; date: string; mode: 'replay' | 'forecast' }
  | { type: 'task.complete'; taskId: string }
  | { type: 'settings.update'; settings: YardSettings }
  | { type: 'demo.reset' };
