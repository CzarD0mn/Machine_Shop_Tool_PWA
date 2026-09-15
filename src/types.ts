export enum Units {
  INCH = 'INCH',
  METRIC = 'METRIC',
}

export enum ToolMaterial {
  CARBIDE = 'CARBIDE',
  HSS = 'HSS',
}

export enum Operation {
  MILLING = 'MILLING',
  DRILLING = 'DRILLING',
  TURNING = 'TURNING',
}

export interface WorkMaterial {
  id: string;
  name: string;
  group: string;
  carbideSfm: number;
  hssSfm: number;
  iptAtQuarterInch: number;
  drillIprAtQuarterInch: number;
  turnIpr: number;
  tip: string;
}

export interface CalcInputs {
  units: Units;
  materialId: string;
  tool: ToolMaterial;
  operation: Operation;
  diameterText: string;
  flutesText: string;
  sfmOverride: string;
  chipOverride: string;
}

export interface CalcResult {
  sfmUsed: number;
  recommendedSfm: number;
  rpm: number;
  feedIpm: number;
  chipLoad: number;
  feedPerRev: number;
  diameterInch: number;
  flutes: number;
  notes: string[];
  valid: boolean;
  error?: string;
}

export interface ClockStamp {
  epochMillis: number;
  zoneId: string;
  zoneOffset: string;
}

export interface OperationEntry {
  id: string;
  machineCell: string;
  partNumber: string;
  shopOrder: string;
  operationId: string;
  quantityStart: string;
  quantityFinish: string;
  nextOperation: string;
  notes: string;
  startSetup: ClockStamp | null;
  endSetup: ClockStamp | null;
  startProduction: ClockStamp | null;
  endProduction: ClockStamp | null;
  updatedAt: number;
}

export interface ProgramEntry {
  id: string;
  part: string;
  program: string;
  partRevision: string;
  programRevision: string;
  machine: string;
  updatedAt: number;
}

export interface PartTimeAverage {
  partNumber: string;
  shopOrderCount: number;
  setupMillis: number | null;
  productionMillis: number | null;
  totalMillis: number | null;
  lastRanMillis: number | null;
  lastRanZoneId: string | null;
}

export enum TextScale {
  NORMAL = 'NORMAL',
  LARGE = 'LARGE',
  EXTRA = 'EXTRA',
}

export enum StartTabChoice {
  LAST = 'LAST',
  LOG = 'LOG',
  PROGRAMS = 'PROGRAMS',
  CALC = 'CALC',
  SETTINGS = 'SETTINGS',
}

export enum AppTab {
  LOG = 'LOG',
  PROGRAMS = 'PROGRAMS',
  FEEDS = 'FEEDS',
  SETTINGS = 'SETTINGS',
}

export enum BackupInterval {
  OFF = 'OFF',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export enum BackupAlertKind {
  NONE = 'NONE',
  CREDENTIALS = 'CREDENTIALS',
  HTTP = 'HTTP',
  LOCAL = 'LOCAL',
}

export enum RemoteProtocol {
  NEXTCLOUD = 'NEXTCLOUD',
  WEBDAV = 'WEBDAV',
  FTPS = 'FTPS',
}

export interface RemoteTarget {
  enabled: boolean;
  protocol: RemoteProtocol;
  host: string;
  port: string;
  user: string;
  password: string;
  remotePath: string;
  verified: boolean;
  lastCheck: string;
  pinnedCertPem: string;
}

export interface ErrorEvent {
  epochMillis: number;
  source: string;
  kind: string;
  message: string;
}

export interface BackupPayload {
  operations?: OperationEntry[];
  programs?: ProgramEntry[];
}

export interface BackupCheck {
  ok: boolean;
  jobs: number;
  programs: number;
  fileName: string;
  error?: string;
}
