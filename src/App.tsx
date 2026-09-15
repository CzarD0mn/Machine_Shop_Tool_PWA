import React, { useState, useEffect } from 'react';
import { AppTab, BackupPayload, OperationEntry, ProgramEntry, StartTabChoice, TextScale } from './types';
import { Header } from './components/Header';
import { BottomBar } from './components/BottomBar';
import { ToolsTab } from './components/ToolsTab';
import { OpLogTab } from './components/OpLogTab';
import { ProgramsTab } from './components/ProgramsTab';
import { SettingsTab } from './components/SettingsTab';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PwaRuntime } from './components/PwaRuntime';
import {
  OperationLogStore,
  ProgramLogStore,
  UxPrefs,
  UxPrefsData,
} from './data/storage';
import { scheduleRemoteBackupEnqueue } from './lib/remote-sync';
import { bootNativeAndroid } from './lib/native';

// Initial sample jobs so shop machinists can immediately see real-world workflow
const SAMPLE_OPERATIONS: OperationEntry[] = [
  {
    id: 'op_sample_1',
    machineCell: 'Haas VF-2',
    partNumber: 'P-8492-A',
    shopOrder: 'WO-99182',
    operationId: 'OP 10 Mill Top',
    quantityStart: '50',
    quantityFinish: '48',
    nextOperation: 'OP 20 Turn OD',
    notes: '0.005" finish pass on boss; deburr chamfers with 45° carbide.',
    startSetup: {
      epochMillis: Date.now() - 5400000,
      zoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
      zoneOffset: '-07:00',
    },
    endSetup: {
      epochMillis: Date.now() - 3600000,
      zoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
      zoneOffset: '-07:00',
    },
    startProduction: {
      epochMillis: Date.now() - 3500000,
      zoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
      zoneOffset: '-07:00',
    },
    endProduction: {
      epochMillis: Date.now() - 600000,
      zoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
      zoneOffset: '-07:00',
    },
    updatedAt: Date.now() - 600000,
  },
];

const SAMPLE_PROGRAMS: ProgramEntry[] = [
  {
    id: 'prg_sample_1',
    part: 'P-8492-A',
    program: 'O1042_OP1',
    partRevision: 'Rev B',
    programRevision: 'v2.1',
    machine: 'Haas VF-2',
    updatedAt: Date.now() - 600000,
  },
];

export function App() {
  const [uxPrefs, setUxPrefs] = useState<UxPrefsData>(() => UxPrefs.load());

  const [operations, setOperations] = useState<OperationEntry[]>(() => {
    const loaded = OperationLogStore.load();
    if (loaded.length === 0) {
      OperationLogStore.saveAll(SAMPLE_OPERATIONS);
      return SAMPLE_OPERATIONS;
    }
    return loaded;
  });

  const [programs, setPrograms] = useState<ProgramEntry[]>(() => {
    const loaded = ProgramLogStore.load();
    if (loaded.length === 0) {
      ProgramLogStore.saveAll(SAMPLE_PROGRAMS);
      return SAMPLE_PROGRAMS;
    }
    return loaded;
  });

  // Determine initial tab based on startTab preference
  const [currentTab, setCurrentTab] = useState<AppTab>(() => {
    const start = uxPrefs.startTab;
    if (start === StartTabChoice.LOG) return AppTab.LOG;
    if (start === StartTabChoice.PROGRAMS) return AppTab.PROGRAMS;
    if (start === StartTabChoice.CALC) return AppTab.FEEDS;
    if (start === StartTabChoice.SETTINGS) return AppTab.SETTINGS;
    // Otherwise fallback to lastTab or FEEDS
    const last = uxPrefs.lastTab as AppTab;
    if (Object.values(AppTab).includes(last)) return last;
    return AppTab.FEEDS;
  });

  useEffect(() => {
    void bootNativeAndroid();
  }, []);

  // Apply theme classes to body
  useEffect(() => {
    document.body.classList.toggle('outdoor-green', uxPrefs.outdoorGreen);
    document.body.classList.toggle(
      'text-scale-large',
      uxPrefs.textScale === TextScale.LARGE
    );
    document.body.classList.toggle(
      'text-scale-extra',
      uxPrefs.textScale === TextScale.EXTRA
    );
  }, [uxPrefs]);

  const handleSelectTab = (tab: AppTab) => {
    setCurrentTab(tab);
    UxPrefs.save({ lastTab: tab });
  };

  const handleSaveOperations = (newOps: OperationEntry[]) => {
    setOperations(newOps);
    OperationLogStore.saveAll(newOps);
    scheduleRemoteBackupEnqueue();
  };

  const handleSavePrograms = (newProgs: ProgramEntry[]) => {
    setPrograms(newProgs);
    ProgramLogStore.saveAll(newProgs);
    scheduleRemoteBackupEnqueue();
  };

  const handleUpdateUxPrefs = (patch: Partial<UxPrefsData>) => {
    const updated = UxPrefs.save(patch);
    setUxPrefs(updated);
  };

  const handleRestore = (payload: BackupPayload) => {
    if (payload.operations) {
      setOperations(payload.operations);
      OperationLogStore.saveAll(payload.operations);
    }
    if (payload.programs) {
      setPrograms(payload.programs);
      ProgramLogStore.saveAll(payload.programs);
    }
  };

  return (
    <div
      className={`flex min-h-dvh flex-col bg-[#F7FBF7] pb-[calc(4.5rem+env(safe-area-inset-bottom))] ${
        uxPrefs.compactPhone ? "px-0" : ""
      }`}
    >
      <Header currentTab={currentTab} />
      <PwaRuntime />

      <main className="flex-1 overflow-x-hidden">
        {currentTab === AppTab.FEEDS && <ToolsTab />}
        {currentTab === AppTab.LOG && (
          <OpLogTab
            entries={operations}
            onSaveEntries={handleSaveOperations}
          />
        )}
        {currentTab === AppTab.PROGRAMS && (
          <ProgramsTab
            programs={programs}
            operations={operations}
            onSavePrograms={handleSavePrograms}
          />
        )}
        {currentTab === AppTab.SETTINGS && (
          <SettingsTab
            operations={operations}
            programs={programs}
            uxPrefs={uxPrefs}
            onUpdateUxPrefs={handleUpdateUxPrefs}
            onRestore={handleRestore}
          />
        )}
      </main>

      <OfflineIndicator />

      <BottomBar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        opCount={operations.length}
        programCount={programs.length}
      />
    </div>
  );
}

export default App;
