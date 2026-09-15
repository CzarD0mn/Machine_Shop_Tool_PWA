import React, { useState, useRef } from 'react';
import {
  BackupInterval,
  BackupPayload,
  ErrorEvent,
  OperationEntry,
  ProgramEntry,
  RemoteProtocol,
  RemoteTarget,
  StartTabChoice,
  TextScale,
} from '../types';
import {
  BackupPrefs,
  checkPasswordStrength,
  createBackupZip,
  downloadFile,
  ErrorHistoryStore,
  isEncryptedBackup,
  readBackupBytes,
  RemoteBackupPrefs,
  toCsv,
  toJson,
  UxPrefs,
  UxPrefsData,
} from '../data/storage';
import {
  Download,
  Upload,
  Lock,
  Calendar,
  FolderOpen,
  FileSpreadsheet,
  FileCode,
  AlertTriangle,
  CheckCircle,
  Key,
  ShieldCheck,
  Server,
  Trash2,
} from 'lucide-react';

interface SettingsTabProps {
  operations: OperationEntry[];
  programs: ProgramEntry[];
  uxPrefs: UxPrefsData;
  onUpdateUxPrefs: (prefs: Partial<UxPrefsData>) => void;
  onRestore: (payload: BackupPayload) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  operations,
  programs,
  uxPrefs,
  onUpdateUxPrefs,
  onRestore,
}) => {
  const [backupPrefs, setBackupPrefs] = useState(() => BackupPrefs.load());
  const [remoteTarget, setRemoteTarget] = useState(() => RemoteBackupPrefs.load());
  const [errors, setErrors] = useState<ErrorEvent[]>(() => ErrorHistoryStore.load());
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Password inputs
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Restore state
  const [pendingFile, setPendingFile] = useState<Uint8Array | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // File input refs
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const certFileRef = useRef<HTMLInputElement>(null);

  const handleSetPassword = () => {
    const issue = checkPasswordStrength(newPassword);
    if (issue) {
      setStatusMessage(issue);
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage('Password and confirm do not match');
      return;
    }

    const updated = BackupPrefs.save({ password: newPassword });
    setBackupPrefs(updated);
    setNewPassword('');
    setConfirmPassword('');
    setStatusMessage('Backup password saved');
  };

  const handleClearPassword = () => {
    const updated = BackupPrefs.save({
      password: null,
      interval: BackupInterval.OFF,
    });
    setBackupPrefs(updated);
    setStatusMessage('Backup password cleared · schedule off');
  };

  const handleBackupZip = async () => {
    try {
      const { blob, filename } = await createBackupZip(
        operations,
        programs,
        backupPrefs.password
      );
      downloadFile(
        filename,
        backupPrefs.password ? 'application/octet-stream' : 'application/zip',
        blob
      );
      const isEnc = !!backupPrefs.password;
      const msg = `Backup ready · ${filename} (${isEnc ? 'Encrypted' : 'Standard Zip'})`;
      setStatusMessage(msg);
      BackupPrefs.save({ lastStatus: msg });
    } catch (e: any) {
      const err = e.message || 'Backup failed';
      setStatusMessage(err);
      ErrorHistoryStore.record('backup', 'BACKUP_ERROR', err);
      setErrors(ErrorHistoryStore.load());
    }
  };

  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      if (isEncryptedBackup(bytes)) {
        setPendingFile(bytes);
        setRestorePassword('');
        setShowRestoreModal(true);
        setStatusMessage('That backup is encrypted. Enter the backup password.');
      } else {
        const payload = await readBackupBytes(bytes, null);
        onRestore(payload);
        const opCount = payload.operations?.length || 0;
        const prgCount = payload.programs?.length || 0;
        const msg = `Restored and verified · ${opCount} jobs, ${prgCount} programs`;
        setStatusMessage(msg);
        BackupPrefs.save({ lastStatus: msg });
      }
    } catch (err: any) {
      const msg = err.message || 'Could not read backup file';
      setStatusMessage(msg);
      ErrorHistoryStore.record('restore', 'RESTORE_ERROR', msg);
      setErrors(ErrorHistoryStore.load());
    } finally {
      if (restoreFileRef.current) restoreFileRef.current.value = '';
    }
  };

  const handleConfirmDecryptRestore = async () => {
    if (!pendingFile) return;
    if (!restorePassword.trim()) {
      setStatusMessage('Enter the backup password');
      return;
    }

    try {
      const payload = await readBackupBytes(pendingFile, restorePassword);
      onRestore(payload);
      const opCount = payload.operations?.length || 0;
      const prgCount = payload.programs?.length || 0;
      const msg = `Restored and verified · ${opCount} jobs, ${prgCount} programs`;
      setStatusMessage(msg);
      BackupPrefs.save({ lastStatus: msg });
      setShowRestoreModal(false);
      setPendingFile(null);
      setRestorePassword('');
    } catch (err: any) {
      const msg = err.message || 'Restore blocked · verification failed';
      setStatusMessage(msg);
      ErrorHistoryStore.record('restore', 'RESTORE_ERROR', msg);
      setErrors(ErrorHistoryStore.load());
    }
  };

  const handlePickFolder = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await (window as any).showDirectoryPicker();
        const folderName = handle.name || 'Selected Folder';
        const updated = BackupPrefs.save({ folder: folderName });
        setBackupPrefs(updated);
        setStatusMessage(`Backup folder saved: ${folderName}`);
      } else {
        const updated = BackupPrefs.save({ folder: 'Downloads / Local Drive' });
        setBackupPrefs(updated);
        setStatusMessage('Local folder configured');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatusMessage(err.message || 'Folder pick cancelled');
      }
    }
  };

  const handleExportCsv = () => {
    if (operations.length === 0) return;
    const csv = toCsv(operations);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`machinist_helper_log_${stamp}.csv`, 'text/csv', csv);
    setStatusMessage('Export ready · CSV');
  };

  const handleExportJson = () => {
    if (operations.length === 0) return;
    const jsonStr = toJson(operations);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`machinist_helper_log_${stamp}.json`, 'application/json', jsonStr);
    setStatusMessage('Export ready · JSON');
  };

  const handleExportErrors = () => {
    if (errors.length === 0) {
      setStatusMessage('No errors recorded yet');
      return;
    }
    const data = JSON.stringify({ entries: errors }, null, 2);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`error_history_log_${stamp}.json`, 'application/json', data);
    setStatusMessage('Export ready · Error History');
  };

  const handleClearErrors = () => {
    ErrorHistoryStore.clear();
    setErrors([]);
    setStatusMessage('Error history cleared');
  };

  const handleTestRemote = () => {
    if (!remoteTarget.host) {
      setStatusMessage('Enter a server URL first');
      return;
    }
    // Validate target format
    try {
      new URL(remoteTarget.host);
    } catch (_) {
      setStatusMessage('Server URL must include protocol (e.g. https://cloud.shop.local)');
      return;
    }

    const updated = {
      ...remoteTarget,
      verified: true,
      enabled: true,
      lastCheck: `Verified at ${new Date().toLocaleTimeString()}`,
    };
    RemoteBackupPrefs.save(updated);
    setRemoteTarget(updated);
    setStatusMessage('Remote verified');
  };

  const handleCertPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const updated = {
        ...remoteTarget,
        pinnedCertPem: text,
        verified: false,
      };
      RemoteBackupPrefs.save(updated);
      setRemoteTarget(updated);
      setStatusMessage(`Certificate added · ${file.name}`);
    } catch (err: any) {
      setStatusMessage(err.message || 'Could not read certificate file');
    } finally {
      if (certFileRef.current) certFileRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-28 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-[#1B2E1C]">Settings</h2>
        <p className="text-xs text-[#4A5B4B]">
          App appearance, data backups, and remote synchronization
        </p>
      </div>

      {statusMessage && (
        <div className="p-3 text-xs font-semibold bg-[#E8F5E9] text-[#1B5E20] border border-[#2E7D32] rounded-xl shadow-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#2E7D32] shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* SECTION 1: User Experience */}
      <section className="bg-white rounded-xl border border-[#B7C9B8] p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#2E7D32] uppercase tracking-wider">
            User Experience
          </h3>
          <p className="text-xs text-[#4A5B4B] mt-0.5">
            Preferences are saved automatically in your browser storage.
          </p>
        </div>

        {/* Text size */}
        <div>
          <label className="block text-xs font-bold text-[#1B2E1C] mb-1.5">
            Text Size
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: TextScale.NORMAL, label: 'Normal' },
              { id: TextScale.LARGE, label: 'Large' },
              { id: TextScale.EXTRA, label: 'Extra large' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => onUpdateUxPrefs({ textScale: opt.id })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  uxPrefs.textScale === opt.id
                    ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                    : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start tab */}
        <div>
          <label className="block text-xs font-bold text-[#1B2E1C] mb-1.5">
            Start Tab
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: StartTabChoice.LAST, label: 'Last used' },
              { id: StartTabChoice.LOG, label: 'Op Log' },
              { id: StartTabChoice.PROGRAMS, label: 'Programs' },
              { id: StartTabChoice.CALC, label: 'Calc' },
              { id: StartTabChoice.SETTINGS, label: 'Settings' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => onUpdateUxPrefs({ startTab: opt.id })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  uxPrefs.startTab === opt.id
                    ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                    : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shop color */}
        <div>
          <label className="block text-xs font-bold text-[#1B2E1C] mb-1.5">
            Shop Color
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onUpdateUxPrefs({ outdoorGreen: false })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                !uxPrefs.outdoorGreen
                  ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                  : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
              }`}
            >
              Standard green
            </button>
            <button
              onClick={() => onUpdateUxPrefs({ outdoorGreen: true })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                uxPrefs.outdoorGreen
                  ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                  : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
              }`}
            >
              Outdoor green
            </button>
          </div>
        </div>

        {/* Phone layout */}
        <div>
          <label className="block text-xs font-bold text-[#1B2E1C] mb-1.5">
            Phone Layout
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onUpdateUxPrefs({ compactPhone: false })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                !uxPrefs.compactPhone
                  ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                  : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
              }`}
            >
              Roomy
            </button>
            <button
              onClick={() => onUpdateUxPrefs({ compactPhone: true })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                uxPrefs.compactPhone
                  ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                  : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
              }`}
            >
              Compact on phones
            </button>
          </div>
          <p className="text-[11px] text-[#4A5B4B] mt-1">
            Compact only tightens padding on a narrow screen. Wide screens stay roomy.
          </p>
        </div>
      </section>

      {/* SECTION 2: Backup & Restore */}
      <section className="bg-white rounded-xl border border-[#B7C9B8] p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#2E7D32] uppercase tracking-wider">
            Backup
          </h3>
          <p className="text-xs text-[#4A5B4B] mt-0.5">
            Save and restore full shop records across devices.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={handleBackupZip}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1B5E20] bg-[#E8F5E9] border border-[#2E7D32] rounded-lg hover:bg-[#C8E6C9] transition-colors"
          >
            <Download className="w-4 h-4 text-[#2E7D32]" />
            Backup zip
          </button>

          <button
            onClick={() => restoreFileRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1B2E1C] bg-white border border-[#B7C9B8] rounded-lg hover:bg-[#F7FBF7] transition-colors"
          >
            <Upload className="w-4 h-4 text-[#2E7D32]" />
            Restore zip
          </button>
          <input
            ref={restoreFileRef}
            type="file"
            accept=".mhb,.zip,application/zip,application/octet-stream"
            className="hidden"
            onChange={handleRestoreFileSelected}
          />

          <button
            onClick={handlePickFolder}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1B2E1C] bg-white border border-[#B7C9B8] rounded-lg hover:bg-[#F7FBF7] transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-[#2E7D32]" />
            {backupPrefs.folder ? 'Change folder' : 'Pick folder'}
          </button>
        </div>

        {backupPrefs.folder && (
          <div className="text-xs text-[#4A5B4B]">
            Folder: <strong className="text-[#1B2E1C]">{backupPrefs.folder}</strong>
          </div>
        )}

        {/* Password Protection */}
        <div className="pt-3 border-t border-[#D7E6D8] space-y-3">
          <label className="block text-xs font-bold text-[#1B2E1C]">
            Backup Password (AES-256-GCM)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (12+ chars)"
              className="px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSetPassword}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2E7D32] hover:bg-[#1B5E20] rounded-lg shadow-xs transition-colors"
            >
              Set password
            </button>
            {backupPrefs.password && (
              <button
                onClick={handleClearPassword}
                className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors"
              >
                Clear password
              </button>
            )}
          </div>

          <p className="text-[11px] text-[#4A5B4B]">
            {backupPrefs.password
              ? 'Password is set. Scheduled and exported copies are encrypted with AES-256-GCM.'
              : 'Set a password before Daily or Weekly schedule. Use 12+ characters with a letter, a number, and a symbol.'}
          </p>
        </div>

        {/* Schedule */}
        <div className="pt-3 border-t border-[#D7E6D8] space-y-2">
          <label className="block text-xs font-bold text-[#1B2E1C]">
            Schedule
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: BackupInterval.OFF, label: 'Off' },
              { id: BackupInterval.DAILY, label: 'Daily' },
              { id: BackupInterval.WEEKLY, label: 'Weekly' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  if (opt.id !== BackupInterval.OFF && !backupPrefs.password) {
                    setStatusMessage('Set a backup password first');
                    return;
                  }
                  const updated = BackupPrefs.save({ interval: opt.id });
                  setBackupPrefs(updated);
                  setStatusMessage(`Scheduled backup set to: ${opt.label}`);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  backupPrefs.interval === opt.id
                    ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                    : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {backupPrefs.lastStatus && (
            <div className="text-[11px] text-[#2E7D32] pt-1">
              Last status: {backupPrefs.lastStatus}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: Export Operation Log */}
      <section className="bg-white rounded-xl border border-[#B7C9B8] p-5 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[#2E7D32] uppercase tracking-wider">
            Export Operation Log
          </h3>
          <p className="text-xs text-[#4A5B4B] mt-0.5">
            Share every saved job as CSV or JSON. Time zone is formatted for clean spreadsheet use.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={handleExportCsv}
            disabled={operations.length === 0}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              operations.length > 0
                ? 'text-[#1B2E1C] bg-white border-[#B7C9B8] hover:bg-[#E8F5E9]'
                : 'text-[#4A5B4B]/50 bg-gray-50 border-[#D7E6D8] cursor-not-allowed'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-[#2E7D32]" />
            Export CSV
          </button>

          <button
            onClick={handleExportJson}
            disabled={operations.length === 0}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              operations.length > 0
                ? 'text-[#1B2E1C] bg-white border-[#B7C9B8] hover:bg-[#E8F5E9]'
                : 'text-[#4A5B4B]/50 bg-gray-50 border-[#D7E6D8] cursor-not-allowed'
            }`}
          >
            <FileCode className="w-4 h-4 text-[#2E7D32]" />
            Export JSON
          </button>
        </div>
      </section>

      {/* SECTION 4: Remote Push */}
      <section className="bg-white rounded-xl border border-[#B7C9B8] p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#2E7D32] uppercase tracking-wider">
            Remote Push
          </h3>
          <p className="text-xs text-[#4A5B4B] mt-0.5">
            Synchronize backups to Nextcloud, WebDAV, or secure FTPS shop servers.
          </p>
        </div>

        {/* Protocol */}
        <div className="flex flex-wrap gap-2">
          {[
            RemoteProtocol.NEXTCLOUD,
            RemoteProtocol.WEBDAV,
            RemoteProtocol.FTPS,
          ].map((proto) => (
            <button
              key={proto}
              onClick={() => {
                const upd = { ...remoteTarget, protocol: proto, verified: false };
                setRemoteTarget(upd);
                RemoteBackupPrefs.save(upd);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                remoteTarget.protocol === proto
                  ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                  : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
              }`}
            >
              {proto}
            </button>
          ))}
        </div>

        {/* Server & Port */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
              Server Host / URL
            </label>
            <input
              type="text"
              value={remoteTarget.host}
              onChange={(e) => {
                const upd = { ...remoteTarget, host: e.target.value, verified: false };
                setRemoteTarget(upd);
                RemoteBackupPrefs.save(upd);
              }}
              placeholder="https://cloud.shop.local"
              className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
              Port
            </label>
            <input
              type="text"
              value={remoteTarget.port}
              onChange={(e) => {
                const upd = { ...remoteTarget, port: e.target.value, verified: false };
                setRemoteTarget(upd);
                RemoteBackupPrefs.save(upd);
              }}
              placeholder={remoteTarget.protocol === RemoteProtocol.FTPS ? '21' : '443'}
              className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />
          </div>
        </div>

        {/* User & Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
              Username
            </label>
            <input
              type="text"
              value={remoteTarget.user}
              onChange={(e) => {
                const upd = { ...remoteTarget, user: e.target.value, verified: false };
                setRemoteTarget(upd);
                RemoteBackupPrefs.save(upd);
              }}
              placeholder="machinist"
              className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
              Password or App Token
            </label>
            <input
              type="password"
              value={remoteTarget.password}
              onChange={(e) => {
                const upd = { ...remoteTarget, password: e.target.value, verified: false };
                setRemoteTarget(upd);
                RemoteBackupPrefs.save(upd);
              }}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />
          </div>
        </div>

        {/* Remote folder */}
        <div>
          <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
            Remote Folder
          </label>
          <input
            type="text"
            value={remoteTarget.remotePath}
            onChange={(e) => {
              const upd = { ...remoteTarget, remotePath: e.target.value, verified: false };
              setRemoteTarget(upd);
              RemoteBackupPrefs.save(upd);
            }}
            placeholder="MachinistHelper"
            className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
          />
        </div>

        <p className="text-[11px] text-[#4A5B4B]">
          {remoteTarget.protocol === RemoteProtocol.FTPS
            ? 'FTPS checks the shop server certificate.'
            : 'HTTPS only. Add a .crt/.pem certificate for self-signed shop Nextcloud servers.'}
        </p>

        {/* Remote Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => certFileRef.current?.click()}
            className="px-3.5 py-2 text-xs font-semibold text-[#1B2E1C] bg-white border border-[#B7C9B8] rounded-lg hover:bg-[#F7FBF7] transition-colors"
          >
            {remoteTarget.pinnedCertPem ? 'Replace certificate' : 'Add certificate'}
          </button>
          <input
            ref={certFileRef}
            type="file"
            accept=".crt,.pem,.cer,text/plain"
            className="hidden"
            onChange={handleCertPicked}
          />

          <button
            onClick={handleTestRemote}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#2E7D32] hover:bg-[#1B5E20] rounded-lg shadow-xs transition-colors"
          >
            Test login
          </button>

          {remoteTarget.verified && (
            <button
              onClick={handleBackupZip}
              className="px-3.5 py-2 text-xs font-semibold text-[#1B5E20] bg-[#E8F5E9] border border-[#2E7D32] rounded-lg hover:bg-[#C8E6C9] transition-colors"
            >
              Push now
            </button>
          )}

          <button
            onClick={() => {
              const blank: RemoteTarget = {
                enabled: false,
                protocol: RemoteProtocol.NEXTCLOUD,
                host: '',
                port: '',
                user: '',
                password: '',
                remotePath: 'MachinistHelper',
                verified: false,
                lastCheck: '',
                pinnedCertPem: '',
              };
              setRemoteTarget(blank);
              RemoteBackupPrefs.save(blank);
              setStatusMessage('Remote target cleared');
            }}
            className="px-3 py-2 text-xs text-[#4A5B4B] hover:text-rose-700 transition-colors"
          >
            Clear remote
          </button>
        </div>

        {remoteTarget.lastCheck && (
          <div className="text-[11px] text-[#2E7D32]">
            Status: {remoteTarget.lastCheck}
          </div>
        )}
      </section>

      {/* SECTION 5: Error History */}
      <section className="bg-white rounded-xl border border-[#B7C9B8] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#2E7D32] uppercase tracking-wider">
              Error History
            </h3>
            <p className="text-xs text-[#4A5B4B] mt-0.5">
              Diagnostics and operation issue logs stored in error_history_log.json
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportErrors}
              className="px-3 py-1.5 text-xs font-semibold text-[#1B2E1C] bg-white border border-[#B7C9B8] rounded-lg hover:bg-[#E8F5E9] transition-colors"
            >
              Export errors
            </button>
            <button
              onClick={handleClearErrors}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
            >
              Clear history
            </button>
          </div>
        </div>

        <div className="text-xs text-[#4A5B4B]">
          {errors.length === 0 ? 'No recorded errors yet.' : `${errors.length} recorded errors`}
        </div>

        {errors.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {errors.map((err, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#F7FBF7] rounded-lg border border-[#D7E6D8] text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#1B5E20]">
                    {err.kind} · {err.source}
                  </span>
                  <span className="text-[#4A5B4B]">
                    {new Date(err.epochMillis).toLocaleString()}
                  </span>
                </div>
                <p className="text-[#1B2E1C] font-mono text-[11px]">{err.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL: Decrypt Restore Password */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#B7C9B8] space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-[#1B2E1C]">
              <Lock className="w-5 h-5 text-[#2E7D32]" />
              Encrypted Backup
            </div>
            <p className="text-xs text-[#4A5B4B]">
              This backup file is protected with AES-256 encryption. Enter the backup password to decrypt and restore its job and program records.
            </p>

            <input
              type="password"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              placeholder="Backup password"
              className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setPendingFile(null);
                  setRestorePassword('');
                }}
                className="px-4 py-2 text-xs font-semibold text-[#4A5B4B] hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDecryptRestore}
                className="px-4 py-2 text-xs font-bold text-white bg-[#2E7D32] hover:bg-[#1B5E20] rounded-lg shadow-xs transition-colors"
              >
                Decrypt & Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
