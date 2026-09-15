import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ClockStamp, OperationEntry } from '../types';
import {
  displayStamp,
  formatElapsed,
  nowStamp,
  productionMillis,
  setupMillis,
  totalMillis,
} from '../data/timeFormat';
import {
  Clock,
  Plus,
  Search,
  Trash2,
  ChevronLeft,
  Calendar,
  Check,
} from 'lucide-react';

interface OpLogTabProps {
  entries: OperationEntry[];
  onSaveEntries: (entries: OperationEntry[]) => void;
}

export const OpLogTab: React.FC<OpLogTabProps> = ({
  entries,
  onSaveEntries,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    entries.length > 0 ? entries[0].id : null
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const debounceTimerRef = useRef<number | null>(null);

  // Active entry being edited
  const activeEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) || null,
    [entries, selectedId]
  );

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.partNumber.toLowerCase().includes(q) ||
        e.operationId.toLowerCase().includes(q) ||
        e.machineCell.toLowerCase().includes(q) ||
        e.shopOrder.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const handleNewTicket = () => {
    const newEntry: OperationEntry = {
      id: 'op_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      machineCell: '',
      partNumber: '',
      shopOrder: '',
      operationId: '',
      quantityStart: '',
      quantityFinish: '',
      nextOperation: '',
      notes: '',
      startSetup: null,
      endSetup: null,
      startProduction: null,
      endProduction: null,
      updatedAt: Date.now(),
    };
    const updated = [newEntry, ...entries];
    onSaveEntries(updated);
    setSelectedId(newEntry.id);
  };

  const handleDeleteTicket = (id: string) => {
    if (window.confirm('Delete this operation ticket?')) {
      const updated = entries.filter((e) => e.id !== id);
      onSaveEntries(updated);
      if (selectedId === id) {
        setSelectedId(updated.length > 0 ? updated[0].id : null);
      }
    }
  };

  const updateActiveEntry = (patch: Partial<OperationEntry>) => {
    if (!activeEntry) return;
    const now = Date.now();
    const updated = entries.map((e) =>
      e.id === activeEntry.id ? { ...e, ...patch, updatedAt: now } : e
    );

    onSaveEntries(updated);

    // Trigger visual debounced indicator
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSaveStatus('Saving…');
    debounceTimerRef.current = window.setTimeout(() => {
      const timeStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setSaveStatus(`Saved · ${timeStr}`);
    }, 400);
  };

  // Stamp setters
  const setStamp = (key: 'startSetup' | 'endSetup' | 'startProduction' | 'endProduction') => {
    updateActiveEntry({ [key]: nowStamp() });
  };

  const clearStamp = (key: 'startSetup' | 'endSetup' | 'startProduction' | 'endProduction') => {
    updateActiveEntry({ [key]: null });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Job List */}
        <div
          className={`lg:col-span-5 space-y-4 ${
            activeEntry ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#1B2E1C]">Operation Log</h2>
              <p className="text-xs text-[#4A5B4B]">
                {entries.length} {entries.length === 1 ? 'ticket' : 'tickets'} recorded
              </p>
            </div>
            <button
              onClick={handleNewTicket}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#2E7D32] hover:bg-[#1B5E20] rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              New ticket
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#4A5B4B] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search part, machine, shop order…"
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#B7C9B8] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />
          </div>

          {/* List items */}
          <div className="space-y-2.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-[#D7E6D8]">
                <p className="text-sm font-semibold text-[#1B2E1C]">
                  No tickets found
                </p>
                <p className="text-xs text-[#4A5B4B] mt-1">
                  {entries.length === 0
                    ? 'Create your first operation ticket to track setup and run times.'
                    : 'No tickets match your search query.'}
                </p>
                {entries.length === 0 && (
                  <button
                    onClick={handleNewTicket}
                    className="mt-4 px-4 py-2 text-xs font-bold text-white bg-[#2E7D32] rounded-lg hover:bg-[#1B5E20]"
                  >
                    Create Ticket
                  </button>
                )}
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isSelected = activeEntry?.id === entry.id;
                const tot = totalMillis(entry);
                const title =
                  entry.partNumber.trim() || entry.operationId.trim()
                    ? `${entry.partNumber || '—'} · ${entry.operationId || 'OP'}`
                    : 'Untitled Ticket';

                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedId(entry.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#E8F5E9] border-[#2E7D32] shadow-xs'
                        : 'bg-white border-[#D7E6D8] hover:border-[#B7C9B8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#1B2E1C] truncate">
                        {title}
                      </h3>
                      {tot !== null && (
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-[#C8E6C9] text-[#1B5E20] rounded-full shrink-0">
                          {formatElapsed(tot)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#4A5B4B] mt-2">
                      {entry.machineCell && (
                        <span>
                          Machine: <strong className="text-[#1B2E1C]">{entry.machineCell}</strong>
                        </span>
                      )}
                      {entry.shopOrder && (
                        <span>
                          Order: <strong className="text-[#1B2E1C]">{entry.shopOrder}</strong>
                        </span>
                      )}
                    </div>

                    {entry.notes && (
                      <p className="text-[11px] text-[#4A5B4B] mt-2 line-clamp-1 italic">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Ticket Editor */}
        <div
          className={`lg:col-span-7 ${
            !activeEntry ? 'hidden lg:block' : 'block'
          }`}
        >
          {activeEntry ? (
            <div className="bg-white rounded-xl border border-[#B7C9B8] p-4 sm:p-6 shadow-xs space-y-6">
              {/* Header inside editor */}
              <div className="flex items-center justify-between pb-4 border-b border-[#D7E6D8]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden p-1.5 rounded-lg border border-[#B7C9B8] hover:bg-[#E8F5E9]"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#2E7D32]" />
                  </button>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#1B2E1C]">
                      {activeEntry.partNumber.trim() || activeEntry.operationId.trim()
                        ? `${activeEntry.partNumber || '—'} · ${activeEntry.operationId || 'OP'}`
                        : 'Operation Ticket'}
                    </h3>
                    <span className="text-[11px] text-[#2E7D32] font-medium">
                      {saveStatus || 'Ready'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteTicket(activeEntry.id)}
                  className="flex items-center gap-1 text-xs text-rose-700 hover:text-rose-900 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                    Machine Cell
                  </label>
                  <input
                    type="text"
                    value={activeEntry.machineCell}
                    onChange={(e) => updateActiveEntry({ machineCell: e.target.value })}
                    placeholder="e.g. VF-2 Haas Mill"
                    className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                    Part Number
                  </label>
                  <input
                    type="text"
                    value={activeEntry.partNumber}
                    onChange={(e) => updateActiveEntry({ partNumber: e.target.value })}
                    placeholder="e.g. P-8402"
                    className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                    Shop Order (Job #)
                  </label>
                  <input
                    type="text"
                    value={activeEntry.shopOrder}
                    onChange={(e) => updateActiveEntry({ shopOrder: e.target.value })}
                    placeholder="e.g. SO-1002"
                    className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                    Operation ID
                  </label>
                  <input
                    type="text"
                    value={activeEntry.operationId}
                    onChange={(e) => updateActiveEntry({ operationId: e.target.value })}
                    placeholder="e.g. OP 10 Mill Top"
                    className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                    Quantity Start
                  </label>
                  <input
                    type="text"
                    value={activeEntry.quantityStart}
                    onChange={(e) => updateActiveEntry({ quantityStart: e.target.value })}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                    Quantity Finish
                  </label>
                  <input
                    type="text"
                    value={activeEntry.quantityFinish}
                    onChange={(e) => updateActiveEntry({ quantityFinish: e.target.value })}
                    placeholder="e.g. 98"
                    className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                    Next Operation
                  </label>
                  <input
                    type="text"
                    value={activeEntry.nextOperation}
                    onChange={(e) => updateActiveEntry({ nextOperation: e.target.value })}
                    placeholder="e.g. OP 20 Turning, Deburr, or Anodize"
                    className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                    Shop Notes & Offsets
                  </label>
                  <textarea
                    rows={3}
                    value={activeEntry.notes}
                    onChange={(e) => updateActiveEntry({ notes: e.target.value })}
                    placeholder="Fixture details, offset notes, tool stickout, inspection points…"
                    className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                  />
                </div>
              </div>

              {/* Time Tracking Section */}
              <div className="pt-4 border-t border-[#D7E6D8] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#2E7D32] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Time Clock & Labor Hours
                  </h4>
                  <span className="text-xs text-[#4A5B4B]">
                    Multi-day spans counted in full
                  </span>
                </div>

                {/* 4 Stamps Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Start Setup */}
                  <div className="bg-[#F7FBF7] p-3 rounded-lg border border-[#D7E6D8]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#1B2E1C]">Start Setup</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setStamp('startSetup')}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-[#2E7D32] text-white rounded hover:bg-[#1B5E20]"
                        >
                          Stamp now
                        </button>
                        {activeEntry.startSetup && (
                          <button
                            onClick={() => clearStamp('startSetup')}
                            className="px-1.5 py-0.5 text-[11px] text-[#4A5B4B] hover:text-rose-700"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-[#4A5B4B] font-mono break-words">
                      {displayStamp(activeEntry.startSetup)}
                    </div>
                  </div>

                  {/* End Setup */}
                  <div className="bg-[#F7FBF7] p-3 rounded-lg border border-[#D7E6D8]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#1B2E1C]">End Setup</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setStamp('endSetup')}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-[#2E7D32] text-white rounded hover:bg-[#1B5E20]"
                        >
                          Stamp now
                        </button>
                        {activeEntry.endSetup && (
                          <button
                            onClick={() => clearStamp('endSetup')}
                            className="px-1.5 py-0.5 text-[11px] text-[#4A5B4B] hover:text-rose-700"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-[#4A5B4B] font-mono break-words">
                      {displayStamp(activeEntry.endSetup)}
                    </div>
                  </div>

                  {/* Start Production */}
                  <div className="bg-[#F7FBF7] p-3 rounded-lg border border-[#D7E6D8]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#1B2E1C]">Start Production</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setStamp('startProduction')}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-[#2E7D32] text-white rounded hover:bg-[#1B5E20]"
                        >
                          Stamp now
                        </button>
                        {activeEntry.startProduction && (
                          <button
                            onClick={() => clearStamp('startProduction')}
                            className="px-1.5 py-0.5 text-[11px] text-[#4A5B4B] hover:text-rose-700"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-[#4A5B4B] font-mono break-words">
                      {displayStamp(activeEntry.startProduction)}
                    </div>
                  </div>

                  {/* End Production */}
                  <div className="bg-[#F7FBF7] p-3 rounded-lg border border-[#D7E6D8]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#1B2E1C]">End Production</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setStamp('endProduction')}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-[#2E7D32] text-white rounded hover:bg-[#1B5E20]"
                        >
                          Stamp now
                        </button>
                        {activeEntry.endProduction && (
                          <button
                            onClick={() => clearStamp('endProduction')}
                            className="px-1.5 py-0.5 text-[11px] text-[#4A5B4B] hover:text-rose-700"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-[#4A5B4B] font-mono break-words">
                      {displayStamp(activeEntry.endProduction)}
                    </div>
                  </div>
                </div>

                {/* Total Calculations summary banner */}
                <div className="bg-[#E8F5E9] p-4 rounded-xl border border-[#2E7D32]/40 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[11px] font-semibold text-[#4A5B4B]">
                      Setup Hours
                    </div>
                    <div className="text-sm sm:text-base font-bold text-[#1B5E20]">
                      {formatElapsed(setupMillis(activeEntry))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#4A5B4B]">
                      Production Hours
                    </div>
                    <div className="text-sm sm:text-base font-bold text-[#1B5E20]">
                      {formatElapsed(productionMillis(activeEntry))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#4A5B4B]">
                      Operation Total
                    </div>
                    <div className="text-sm sm:text-base font-bold text-[#1B5E20]">
                      {formatElapsed(totalMillis(activeEntry))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-[#B7C9B8] p-6 text-center text-[#4A5B4B]">
              <Calendar className="w-8 h-8 text-[#B7C9B8] mb-2" />
              <p className="text-sm font-semibold">Select an operation ticket</p>
              <p className="text-xs mt-1">Or click &quot;New ticket&quot; to begin tracking a new job.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
