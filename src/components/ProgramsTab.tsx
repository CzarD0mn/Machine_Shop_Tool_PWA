import React, { useState, useMemo } from 'react';
import { OperationEntry, ProgramEntry } from '../types';
import {
  averagePartTimes,
  formatElapsed,
  formatLastRanDate,
} from '../data/timeFormat';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Cpu,
  Clock,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

interface ProgramsTabProps {
  programs: ProgramEntry[];
  operations: OperationEntry[];
  onSavePrograms: (programs: ProgramEntry[]) => void;
}

type ProgramMode = 'SEARCH' | 'NEW' | 'UPDATE';

export const ProgramsTab: React.FC<ProgramsTabProps> = ({
  programs,
  operations,
  onSavePrograms,
}) => {
  const [mode, setMode] = useState<ProgramMode>('SEARCH');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    part: '',
    program: '',
    partRevision: '',
    programRevision: '',
    machine: '',
  });

  const [formStatus, setFormStatus] = useState<string>('');

  // Compute part time averages from operations log
  const partAverages = useMemo(() => {
    return averagePartTimes(operations, searchQuery);
  }, [operations, searchQuery]);

  // Correlate last ran date for any part number
  const lastRanForPart = useMemo(() => {
    const map = new Map<string, number>();
    for (const avg of partAverages) {
      if (avg.lastRanMillis) {
        map.set(avg.partNumber.trim().toUpperCase(), avg.lastRanMillis);
      }
    }
    return map;
  }, [partAverages]);

  // Filtered program records
  const filteredPrograms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter(
      (p) =>
        p.part.toLowerCase().includes(q) ||
        p.program.toLowerCase().includes(q) ||
        p.machine.toLowerCase().includes(q) ||
        p.partRevision.toLowerCase().includes(q) ||
        p.programRevision.toLowerCase().includes(q)
    );
  }, [programs, searchQuery]);

  const handleStartNew = () => {
    setFormData({
      part: '',
      program: '',
      partRevision: '',
      programRevision: '',
      machine: '',
    });
    setFormStatus('');
    setMode('NEW');
  };

  const handleStartUpdate = (prog: ProgramEntry) => {
    setSelectedProgramId(prog.id);
    setFormData({
      part: prog.part,
      program: prog.program,
      partRevision: prog.partRevision,
      programRevision: prog.programRevision,
      machine: prog.machine,
    });
    setFormStatus('');
    setMode('UPDATE');
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.part.trim() && !formData.program.trim()) {
      setFormStatus('Enter at least a part number or program name');
      return;
    }

    const newProg: ProgramEntry = {
      id: 'prg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      part: formData.part.trim(),
      program: formData.program.trim(),
      partRevision: formData.partRevision.trim(),
      programRevision: formData.programRevision.trim(),
      machine: formData.machine.trim(),
      updatedAt: Date.now(),
    };

    const updated = [newProg, ...programs];
    onSavePrograms(updated);
    setMode('SEARCH');
    setFormData({
      part: '',
      program: '',
      partRevision: '',
      programRevision: '',
      machine: '',
    });
  };

  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramId) return;

    const updated = programs.map((p) =>
      p.id === selectedProgramId
        ? {
            ...p,
            part: formData.part.trim(),
            program: formData.program.trim(),
            partRevision: formData.partRevision.trim(),
            programRevision: formData.programRevision.trim(),
            machine: formData.machine.trim(),
            updatedAt: Date.now(),
          }
        : p
    );

    onSavePrograms(updated);
    setMode('SEARCH');
    setSelectedProgramId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this program record?')) {
      const updated = programs.filter((p) => p.id !== id);
      onSavePrograms(updated);
      setMode('SEARCH');
      setSelectedProgramId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24 space-y-6">
      {/* Action header with mode chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B2E1C]">Program Log</h2>
          <p className="text-xs text-[#4A5B4B]">
            Map CNC part programs to machine cells with historical run times
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('SEARCH')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              mode === 'SEARCH'
                ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>

          <button
            onClick={handleStartNew}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              mode === 'NEW'
                ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>

          {selectedProgramId && (
            <button
              onClick={() => setMode('UPDATE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                mode === 'UPDATE'
                  ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32]'
                  : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              Update
            </button>
          )}
        </div>
      </div>

      {/* FORM VIEW (New or Update) */}
      {(mode === 'NEW' || mode === 'UPDATE') && (
        <form
          onSubmit={mode === 'NEW' ? handleSaveNew : handleSaveUpdate}
          className="bg-white rounded-xl border border-[#B7C9B8] p-5 sm:p-6 shadow-xs space-y-4 max-w-2xl"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#D7E6D8]">
            <h3 className="text-base font-bold text-[#1B2E1C]">
              {mode === 'NEW' ? 'New Program Record' : 'Update Program Record'}
            </h3>
            <button
              type="button"
              onClick={() => setMode('SEARCH')}
              className="text-xs text-[#4A5B4B] hover:text-[#1B2E1C]"
            >
              Cancel
            </button>
          </div>

          {formStatus && (
            <div className="p-2 text-xs text-rose-700 bg-rose-50 rounded-lg border border-rose-200">
              {formStatus}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                Part Number
              </label>
              <input
                type="text"
                value={formData.part}
                onChange={(e) => setFormData({ ...formData, part: e.target.value })}
                placeholder="e.g. P-8041"
                className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                Program Name / Number
              </label>
              <input
                type="text"
                value={formData.program}
                onChange={(e) =>
                  setFormData({ ...formData, program: e.target.value })
                }
                placeholder="e.g. O1042_OP1"
                className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                Part Revision
              </label>
              <input
                type="text"
                value={formData.partRevision}
                onChange={(e) =>
                  setFormData({ ...formData, partRevision: e.target.value })
                }
                placeholder="e.g. Rev C"
                className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                Program Revision
              </label>
              <input
                type="text"
                value={formData.programRevision}
                onChange={(e) =>
                  setFormData({ ...formData, programRevision: e.target.value })
                }
                placeholder="e.g. v2.1"
                className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                Machine Cell / Spindle
              </label>
              <input
                type="text"
                value={formData.machine}
                onChange={(e) =>
                  setFormData({ ...formData, machine: e.target.value })
                }
                placeholder="e.g. Haas VF-2, Mazak Integrex, Cell 3"
                className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg bg-[#F7FBF7] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#D7E6D8]">
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#2E7D32] hover:bg-[#1B5E20] rounded-lg shadow-xs transition-colors"
              >
                {mode === 'NEW' ? 'Save Program' : 'Update Program'}
              </button>
              <button
                type="button"
                onClick={() => setMode('SEARCH')}
                className="px-3 py-2 text-xs font-semibold text-[#4A5B4B] bg-[#F7FBF7] hover:bg-[#E8F5E9] border border-[#D7E6D8] rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>

            {mode === 'UPDATE' && selectedProgramId && (
              <button
                type="button"
                onClick={() => handleDelete(selectedProgramId)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>
        </form>
      )}

      {/* SEARCH / BROWSE VIEW */}
      {mode === 'SEARCH' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative max-w-lg">
            <Search className="w-4 h-4 text-[#4A5B4B] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search machine, part, or program…"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#B7C9B8] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />
          </div>

          {/* Section 1: Part Time Averages from Op Log */}
          {partAverages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#2E7D32] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Historical Part Time Averages (from Op Log)
                </h3>
                <span className="text-xs text-[#4A5B4B]">
                  Aggregated from timestamps
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {partAverages.map((avg) => (
                  <div
                    key={avg.partNumber}
                    className="bg-[#E8F5E9]/50 border border-[#C8E6C9] rounded-xl p-3.5 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-[#1B2E1C]">
                          {avg.partNumber}
                        </div>
                        <div className="text-[11px] text-[#4A5B4B]">
                          {avg.shopOrderCount}{' '}
                          {avg.shopOrderCount === 1 ? 'shop order' : 'shop orders'}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#1B5E20] bg-white px-2 py-0.5 rounded-full border border-[#C8E6C9]">
                        Last: {formatLastRanDate(avg.lastRanMillis)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#C8E6C9]/60 text-center text-xs">
                      <div>
                        <div className="text-[10px] text-[#4A5B4B]">Avg Setup</div>
                        <div className="font-bold text-[#1B2E1C]">
                          {formatElapsed(avg.setupMillis)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#4A5B4B]">Avg Prod</div>
                        <div className="font-bold text-[#1B2E1C]">
                          {formatElapsed(avg.productionMillis)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#4A5B4B]">Avg Total</div>
                        <div className="font-bold text-[#1B5E20]">
                          {formatElapsed(avg.totalMillis)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Program Catalog Matches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#2E7D32] uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                Program Catalog ({filteredPrograms.length})
              </h3>
            </div>

            {filteredPrograms.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-[#D7E6D8]">
                <p className="text-sm font-semibold text-[#1B2E1C]">
                  No program records found
                </p>
                <p className="text-xs text-[#4A5B4B] mt-1">
                  Add programs to associate CNC filenames with machine centers and part numbers.
                </p>
                <button
                  onClick={handleStartNew}
                  className="mt-4 px-4 py-2 text-xs font-bold text-white bg-[#2E7D32] rounded-lg hover:bg-[#1B5E20]"
                >
                  Add Program
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPrograms.map((prog) => {
                  const partKey = prog.part.trim().toUpperCase();
                  const lastRan = lastRanForPart.get(partKey);

                  return (
                    <div
                      key={prog.id}
                      onClick={() => handleStartUpdate(prog)}
                      className="bg-white border border-[#D7E6D8] hover:border-[#2E7D32] rounded-xl p-4 cursor-pointer transition-all hover:shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-[#1B2E1C] truncate">
                            {prog.part || '—'}
                          </div>
                          {prog.partRevision && (
                            <div className="text-[11px] text-[#4A5B4B]">
                              Part Rev: <strong>{prog.partRevision}</strong>
                            </div>
                          )}
                        </div>

                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-[#E8F5E9] text-[#1B5E20] rounded-md shrink-0">
                          {prog.program || 'No prog'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs text-[#4A5B4B] pt-1">
                        <div>
                          Machine: <strong className="text-[#1B2E1C]">{prog.machine || '—'}</strong>
                        </div>
                        {prog.programRevision && (
                          <div>
                            Prog Rev: <strong className="text-[#1B2E1C]">{prog.programRevision}</strong>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-[#4A5B4B] pt-1 border-t border-[#F0F5F0] flex items-center justify-between">
                        <span>
                          {lastRan
                            ? `Last ran ${formatLastRanDate(lastRan)}`
                            : 'No recorded job run'}
                        </span>
                        <span className="text-[#2E7D32] font-semibold flex items-center gap-1">
                          <Edit className="w-3 h-3" />
                          Edit
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
