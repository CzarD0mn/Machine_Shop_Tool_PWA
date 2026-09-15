import JSZip from "jszip";
import {
  BackupAlertKind,
  BackupInterval,
  BackupPayload,
  ErrorEvent,
  OperationEntry,
  ProgramEntry,
  RemoteProtocol,
  RemoteTarget,
  StartTabChoice,
  TextScale,
} from "../types";
import {
  displayForExport,
  formatElapsed,
  productionMillis,
  setupMillis,
  totalMillis,
} from "./timeFormat";

const STORAGE_KEYS = {
  OP_LOG: "machinist_operation_log",
  PROGRAM_LOG: "machinist_program_log",
  UX_PREFS: "machinist_ux_prefs",
  BACKUP_PREFS: "machinist_backup_prefs",
  REMOTE_TARGET: "machinist_remote_target",
  ERROR_HISTORY: "machinist_error_history",
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readKey(key: string): string | null {
  if (!canUseStorage()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error("Failed to save", key, e);
  }
}

export function checkPasswordStrength(password: string): string | null {
  if (password.length < 12) {
    return "Password must be at least 12 characters";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Password needs at least one letter";
  }
  if (!/\d/.test(password)) {
    return "Password needs at least one number";
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return "Password needs at least one symbol (!@# etc.)";
  }
  return null;
}

export const OperationLogStore = {
  load(): OperationEntry[] {
    try {
      const raw = readKey(STORAGE_KEYS.OP_LOG);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const entries: OperationEntry[] = Array.isArray(parsed.entries)
        ? parsed.entries
        : Array.isArray(parsed)
          ? parsed
          : [];
      return entries.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  },

  saveAll(entries: OperationEntry[]) {
    const sorted = [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
    writeKey(STORAGE_KEYS.OP_LOG, JSON.stringify({ entries: sorted }, null, 2));
  },
};

export const ProgramLogStore = {
  load(): ProgramEntry[] {
    try {
      const raw = readKey(STORAGE_KEYS.PROGRAM_LOG);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const entries: ProgramEntry[] = Array.isArray(parsed.entries)
        ? parsed.entries
        : Array.isArray(parsed)
          ? parsed
          : [];
      return entries.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  },

  saveAll(entries: ProgramEntry[]) {
    const sorted = [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
    writeKey(
      STORAGE_KEYS.PROGRAM_LOG,
      JSON.stringify({ entries: sorted }, null, 2),
    );
  },
};

export interface UxPrefsData {
  textScale: TextScale;
  startTab: StartTabChoice;
  lastTab: string;
  outdoorGreen: boolean;
  compactPhone: boolean;
}

const DEFAULT_UX: UxPrefsData = {
  textScale: TextScale.NORMAL,
  startTab: StartTabChoice.LAST,
  lastTab: "FEEDS",
  outdoorGreen: false,
  compactPhone: false,
};

export const UxPrefs = {
  load(): UxPrefsData {
    try {
      const raw = readKey(STORAGE_KEYS.UX_PREFS);
      if (!raw) return { ...DEFAULT_UX };
      return { ...DEFAULT_UX, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_UX };
    }
  },

  save(data: Partial<UxPrefsData>) {
    const updated = { ...this.load(), ...data };
    writeKey(STORAGE_KEYS.UX_PREFS, JSON.stringify(updated));
    return updated;
  },
};

export interface BackupPrefsData {
  interval: BackupInterval;
  folder: string | null;
  password: string | null;
  lastStatus: string;
  lastAlertKind: BackupAlertKind;
  lastAlertMessage: string;
  lastBackupAt: number | null;
}

const DEFAULT_BACKUP: BackupPrefsData = {
  interval: BackupInterval.OFF,
  folder: null,
  password: null,
  lastStatus: "",
  lastAlertKind: BackupAlertKind.NONE,
  lastAlertMessage: "",
  lastBackupAt: null,
};

export const BackupPrefs = {
  load(): BackupPrefsData {
    try {
      const raw = readKey(STORAGE_KEYS.BACKUP_PREFS);
      if (!raw) return { ...DEFAULT_BACKUP };
      return { ...DEFAULT_BACKUP, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_BACKUP };
    }
  },

  save(data: Partial<BackupPrefsData>) {
    const updated = { ...this.load(), ...data };
    writeKey(STORAGE_KEYS.BACKUP_PREFS, JSON.stringify(updated));
    return updated;
  },
};

const DEFAULT_REMOTE: RemoteTarget = {
  enabled: false,
  protocol: RemoteProtocol.NEXTCLOUD,
  host: "",
  port: "",
  user: "",
  password: "",
  remotePath: "MachinistHelper",
  verified: false,
  lastCheck: "",
  pinnedCertPem: "",
};

export const RemoteBackupPrefs = {
  load(): RemoteTarget {
    try {
      const raw = readKey(STORAGE_KEYS.REMOTE_TARGET);
      if (!raw) return { ...DEFAULT_REMOTE };
      return { ...DEFAULT_REMOTE, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_REMOTE };
    }
  },

  save(target: RemoteTarget) {
    writeKey(STORAGE_KEYS.REMOTE_TARGET, JSON.stringify(target));
  },
};

export const ErrorHistoryStore = {
  load(): ErrorEvent[] {
    try {
      const raw = readKey(STORAGE_KEYS.ERROR_HISTORY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.entries) ? parsed.entries : [];
    } catch {
      return [];
    }
  },

  record(source: string, kind: string, message: string) {
    const clean = message.trim();
    if (!clean) return;
    const current = this.load();
    const newEvent: ErrorEvent = {
      epochMillis: Date.now(),
      source,
      kind: kind || "ERROR",
      message: clean,
    };
    const updated = [newEvent, ...current].slice(0, 200);
    writeKey(
      STORAGE_KEYS.ERROR_HISTORY,
      JSON.stringify({ entries: updated }, null, 2),
    );
  },

  clear() {
    writeKey(STORAGE_KEYS.ERROR_HISTORY, JSON.stringify({ entries: [] }));
  },
};

const ENCRYPTION_MAGIC = new Uint8Array([0x4d, 0x48, 0x42, 0x01]);

async function deriveKey(password: string, salt: BufferSource): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptData(
  data: Uint8Array,
  password: string,
): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource,
  );
  const cipherBytes = new Uint8Array(encrypted);
  const total = new Uint8Array(
    ENCRYPTION_MAGIC.length + salt.length + iv.length + cipherBytes.length,
  );
  total.set(ENCRYPTION_MAGIC, 0);
  total.set(salt, ENCRYPTION_MAGIC.length);
  total.set(iv, ENCRYPTION_MAGIC.length + salt.length);
  total.set(cipherBytes, ENCRYPTION_MAGIC.length + salt.length + iv.length);
  return total;
}

export function isEncryptedBackup(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  for (let i = 0; i < ENCRYPTION_MAGIC.length; i++) {
    if (bytes[i] !== ENCRYPTION_MAGIC[i]) return false;
  }
  return true;
}

export async function decryptData(
  bytes: Uint8Array,
  password: string,
): Promise<Uint8Array> {
  if (!isEncryptedBackup(bytes)) {
    return bytes;
  }
  const magicLen = ENCRYPTION_MAGIC.length;
  const salt = bytes.slice(magicLen, magicLen + 16);
  const iv = bytes.slice(magicLen + 16, magicLen + 16 + 12);
  const cipherBytes = bytes.slice(magicLen + 16 + 12);
  const key = await deriveKey(password, salt as BufferSource);
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      cipherBytes as BufferSource,
    );
    return new Uint8Array(decrypted);
  } catch {
    throw new Error("Incorrect password or corrupted backup file");
  }
}

export async function createBackupZip(
  operations: OperationEntry[],
  programs: ProgramEntry[],
  password?: string | null,
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();

  const manifest = {
    app: "The Machinist Helper",
    kind: password ? "password-protected-backup" : "plain-backup",
    createdAt: new Date().toISOString(),
    verified: true,
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file(
    "operation_log.json",
    JSON.stringify({ entries: operations }, null, 2),
  );
  zip.file("program_log.json", JSON.stringify({ entries: programs }, null, 2));

  const zipBuffer = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });

  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);

  if (password && password.trim().length > 0) {
    const encrypted = await encryptData(zipBuffer, password.trim());
    return {
      blob: new Blob([encrypted.buffer as ArrayBuffer], {
        type: "application/octet-stream",
      }),
      filename: `machinist_helper_backup_${stamp}.mhb`,
    };
  }

  return {
    blob: new Blob([zipBuffer.buffer as ArrayBuffer], {
      type: "application/zip",
    }),
    filename: `machinist_helper_backup_${stamp}.zip`,
  };
}

export async function readBackupBytes(
  bytes: Uint8Array,
  password?: string | null,
): Promise<BackupPayload> {
  let plainBytes = bytes;
  if (isEncryptedBackup(bytes)) {
    if (!password) {
      throw new Error("This backup is encrypted. Enter the backup password.");
    }
    plainBytes = await decryptData(bytes, password);
  }

  const zip = await JSZip.loadAsync(plainBytes);
  const opFile = zip.file("operation_log.json");
  const progFile = zip.file("program_log.json");

  let operations: OperationEntry[] | undefined;
  let programs: ProgramEntry[] | undefined;

  if (opFile) {
    const text = await opFile.async("text");
    const parsed = JSON.parse(text);
    operations = Array.isArray(parsed.entries)
      ? parsed.entries
      : Array.isArray(parsed)
        ? parsed
        : [];
  }

  if (progFile) {
    const text = await progFile.async("text");
    const parsed = JSON.parse(text);
    programs = Array.isArray(parsed.entries)
      ? parsed.entries
      : Array.isArray(parsed)
        ? parsed
        : [];
  }

  if (!operations && !programs) {
    throw new Error("That file is not a recognized Machinist Helper backup.");
  }

  return { operations, programs };
}

function csvCell(raw: string): string {
  const needsQuotes =
    raw.includes(",") ||
    raw.includes('"') ||
    raw.includes("\n") ||
    raw.includes("\r");
  const escaped = raw.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toCsv(entries: OperationEntry[]): string {
  const header = [
    "Machine Cell",
    "Part Number",
    "Shop Order",
    "Operation ID",
    "Quantity Start",
    "Quantity Finish",
    "Next Operation",
    "Notes",
    "Start Setup",
    "End Setup",
    "Start Production",
    "End Production",
    "Setup Hours",
    "Production Hours",
    "Total Hours",
    "Last Saved",
  ];

  const sorted = [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
  const rows = sorted.map((entry) => [
    entry.machineCell || "",
    entry.partNumber || "",
    entry.shopOrder || "",
    entry.operationId || "",
    entry.quantityStart || "",
    entry.quantityFinish || "",
    entry.nextOperation || "",
    entry.notes || "",
    displayForExport(entry.startSetup),
    displayForExport(entry.endSetup),
    displayForExport(entry.startProduction),
    displayForExport(entry.endProduction),
    setupMillis(entry) !== null ? formatElapsed(setupMillis(entry)) : "",
    productionMillis(entry) !== null
      ? formatElapsed(productionMillis(entry))
      : "",
    totalMillis(entry) !== null ? formatElapsed(totalMillis(entry)) : "",
    entry.updatedAt > 0 ? new Date(entry.updatedAt).toLocaleString() : "",
  ]);

  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((r) => r.map(csvCell).join(",")),
  ];
  return lines.join("\n");
}

export function toJson(entries: OperationEntry[]): string {
  const sorted = [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
  const formatted = sorted.map((entry) => ({
    machineCell: entry.machineCell || "",
    partNumber: entry.partNumber || "",
    shopOrder: entry.shopOrder || "",
    operationId: entry.operationId || "",
    quantityStart: entry.quantityStart || "",
    quantityFinish: entry.quantityFinish || "",
    nextOperation: entry.nextOperation || "",
    notes: entry.notes || "",
    startSetup: displayForExport(entry.startSetup) || null,
    endSetup: displayForExport(entry.endSetup) || null,
    startProduction: displayForExport(entry.startProduction) || null,
    endProduction: displayForExport(entry.endProduction) || null,
    setupHours:
      setupMillis(entry) !== null ? formatElapsed(setupMillis(entry)) : null,
    productionHours:
      productionMillis(entry) !== null
        ? formatElapsed(productionMillis(entry))
        : null,
    totalHours:
      totalMillis(entry) !== null ? formatElapsed(totalMillis(entry)) : null,
    lastSaved:
      entry.updatedAt > 0 ? new Date(entry.updatedAt).toLocaleString() : "",
  }));

  return JSON.stringify(
    {
      app: "The Machinist Helper",
      entries: formatted,
    },
    null,
    2,
  );
}

export function downloadFile(
  filename: string,
  mime: string,
  content: string | Blob,
) {
  if (typeof document === "undefined") return;
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
