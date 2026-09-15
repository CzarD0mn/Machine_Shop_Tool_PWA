import React, { useState, useMemo } from 'react';
import {
  CalcInputs,
  Operation,
  ToolMaterial,
  Units,
} from '../types';
import { MATERIALS, MATERIAL_GROUPS, MATERIALS_BY_ID } from '../data/materials';
import { Calculator } from '../calc/calculator';
import { AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';

export const CalcTab: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [inputs, setInputs] = useState<CalcInputs>({
    units: Units.INCH,
    materialId: 'al_6061',
    tool: ToolMaterial.CARBIDE,
    operation: Operation.MILLING,
    diameterText: '0.5',
    flutesText: '3',
    sfmOverride: '',
    chipOverride: '',
  });

  const [selectedGroup, setSelectedGroup] = useState<string>('Aluminum');

  const selectedMaterial = useMemo(
    () => MATERIALS_BY_ID[inputs.materialId] || MATERIALS[0],
    [inputs.materialId]
  );

  const result = useMemo(() => Calculator.calculate(inputs), [inputs]);

  const updateInput = (key: keyof CalcInputs, val: any) => {
    setInputs((prev) => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setInputs({
      units: Units.INCH,
      materialId: 'al_6061',
      tool: ToolMaterial.CARBIDE,
      operation: Operation.MILLING,
      diameterText: '0.5',
      flutesText: '3',
      sfmOverride: '',
      chipOverride: '',
    });
    setSelectedGroup('Aluminum');
  };

  // Unit-aware displayed values
  const isMetric = inputs.units === Units.METRIC;

  const displayFeed = useMemo(() => {
    if (!result.valid) return '—';
    const val = isMetric ? result.feedIpm * 25.4 : result.feedIpm;
    return `${Math.round(val * 10) / 10} ${isMetric ? 'mm/min' : 'IPM'}`;
  }, [result, isMetric]);

  const displaySurfaceSpeed = useMemo(() => {
    if (!result.valid) return '—';
    const val = isMetric ? result.sfmUsed / 3.28084 : result.sfmUsed;
    return `${Math.round(val)} ${isMetric ? 'm/min' : 'SFM'}`;
  }, [result, isMetric]);

  const displayChipLoad = useMemo(() => {
    if (!result.valid) return '—';
    const val = isMetric ? result.chipLoad * 25.4 : result.chipLoad;
    return `${val.toFixed(4)} ${isMetric ? 'mm' : 'in'}`;
  }, [result, isMetric]);

  const displayFpr = useMemo(() => {
    if (!result.valid) return '—';
    const val = isMetric ? result.feedPerRev * 25.4 : result.feedPerRev;
    return `${val.toFixed(4)} ${isMetric ? 'mm/rev' : 'in/rev'}`;
  }, [result, isMetric]);

  const materialsInGroup = useMemo(
    () => MATERIALS.filter((m) => m.group === selectedGroup),
    [selectedGroup]
  );

  return (
    <div className={embedded ? "" : "mx-auto max-w-7xl p-4 pb-24 sm:p-6"}>
      {/* Top action bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B2E1C]">Speeds & Feeds</h2>
          <p className="text-xs text-[#4A5B4B]">
            Calculate spindle speed and table feed for shop operations
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2E7D32] bg-white border border-[#B7C9B8] rounded-lg hover:bg-[#E8F5E9] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Setup Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Cut Setup */}
          <div className="bg-white rounded-xl border border-[#B7C9B8] p-4 sm:p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-[#2E7D32] uppercase tracking-wider">
              1. Set Up The Cut
            </h3>

            {/* Units */}
            <div>
              <label className="block text-xs font-semibold text-[#1B2E1C] mb-1.5">
                Measurement Units
              </label>
              <div className="flex gap-2">
                {[
                  { id: Units.INCH, label: 'Inch (in / SFM)' },
                  { id: Units.METRIC, label: 'Metric (mm / m·min)' },
                ].map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      if (inputs.units !== u.id) {
                        // convert diameter
                        const raw = parseFloat(inputs.diameterText);
                        let newDiam = inputs.diameterText;
                        if (!isNaN(raw)) {
                          if (u.id === Units.METRIC) {
                            newDiam = (raw * 25.4).toFixed(1);
                          } else {
                            newDiam = (raw / 25.4).toFixed(3);
                          }
                        }
                        setInputs((prev) => ({
                          ...prev,
                          units: u.id,
                          diameterText: newDiam,
                          sfmOverride: '',
                          chipOverride: '',
                        }));
                      }
                    }}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                      inputs.units === u.id
                        ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32] shadow-xs'
                        : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Operation */}
            <div>
              <label className="block text-xs font-semibold text-[#1B2E1C] mb-1.5">
                Machining Operation
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: Operation.MILLING, label: 'Milling' },
                  { id: Operation.DRILLING, label: 'Drilling' },
                  { id: Operation.TURNING, label: 'Turning' },
                ].map((op) => (
                  <button
                    key={op.id}
                    onClick={() => updateInput('operation', op.id)}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                      inputs.operation === op.id
                        ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32] shadow-xs'
                        : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tool Material */}
            <div>
              <label className="block text-xs font-semibold text-[#1B2E1C] mb-1.5">
                Cutter Material
              </label>
              <div className="flex gap-2">
                {[
                  { id: ToolMaterial.CARBIDE, label: 'Carbide' },
                  { id: ToolMaterial.HSS, label: 'High Speed Steel (HSS)' },
                ].map((tm) => (
                  <button
                    key={tm.id}
                    onClick={() => updateInput('tool', tm.id)}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                      inputs.tool === tm.id
                        ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#2E7D32] shadow-xs'
                        : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#F7FBF7]'
                    }`}
                  >
                    {tm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Material Group & Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#1B2E1C] mb-1.5">
                Workpiece Material
              </label>
              {/* Group Chips */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {MATERIAL_GROUPS.map((grp) => (
                  <button
                    key={grp}
                    onClick={() => {
                      setSelectedGroup(grp);
                      const firstInGroup = MATERIALS.find((m) => m.group === grp);
                      if (firstInGroup) updateInput('materialId', firstInGroup.id);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                      selectedGroup === grp
                        ? 'bg-[#2E7D32] text-white border-[#2E7D32]'
                        : 'bg-white text-[#4A5B4B] border-[#D7E6D8] hover:bg-[#E8F5E9]'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>

              {/* Materials in chosen group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {materialsInGroup.map((mat) => {
                  const isSelected = inputs.materialId === mat.id;
                  const recSfm =
                    inputs.tool === ToolMaterial.CARBIDE
                      ? mat.carbideSfm
                      : mat.hssSfm;
                  return (
                    <button
                      key={mat.id}
                      onClick={() => updateInput('materialId', mat.id)}
                      className={`p-2.5 text-left rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-[#E8F5E9] border-[#2E7D32] text-[#1B2E1C] shadow-xs'
                          : 'bg-[#F7FBF7] border-[#D7E6D8] text-[#4A5B4B] hover:bg-white'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{mat.name}</div>
                      <div className="text-[11px] text-[#4A5B4B] mt-0.5">
                        {recSfm} SFM ({Math.round(recSfm / 3.28084)} m/min)
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: Tool Size & Parameters */}
          <div className="bg-white rounded-xl border border-[#B7C9B8] p-4 sm:p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-[#2E7D32] uppercase tracking-wider">
              2. Tool & Geometry
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                  Diameter ({isMetric ? 'mm' : 'inches'})
                </label>
                <input
                  type="number"
                  step="any"
                  value={inputs.diameterText}
                  onChange={(e) => updateInput('diameterText', e.target.value)}
                  placeholder={isMetric ? '12.0' : '0.500'}
                  className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent bg-[#F7FBF7]"
                />
                <span className="text-[10px] text-[#4A5B4B] mt-1 block">
                  Tool diameter for milling/drilling, stock diameter for turning
                </span>
              </div>

              {inputs.operation === Operation.MILLING && (
                <div>
                  <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                    Flutes (number of teeth)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={inputs.flutesText}
                    onChange={(e) => updateInput('flutesText', e.target.value)}
                    placeholder="3"
                    className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent bg-[#F7FBF7]"
                  />
                  <span className="text-[10px] text-[#4A5B4B] mt-1 block">
                    End mill cutting teeth (typically 2 to 6)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Optional Overrides */}
          <div className="bg-white rounded-xl border border-[#B7C9B8] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#2E7D32] uppercase tracking-wider">
                3. Optional Overrides
              </h3>
              {(inputs.sfmOverride || inputs.chipOverride) && (
                <button
                  onClick={() => {
                    setInputs((prev) => ({
                      ...prev,
                      sfmOverride: '',
                      chipOverride: '',
                    }));
                  }}
                  className="text-xs text-[#2E7D32] font-semibold hover:underline"
                >
                  Clear overrides
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                  Surface Speed ({isMetric ? 'm/min' : 'SFM'})
                </label>
                <input
                  type="number"
                  step="any"
                  value={inputs.sfmOverride}
                  onChange={(e) => updateInput('sfmOverride', e.target.value)}
                  placeholder={`Catalog: ${
                    isMetric
                      ? Math.round(
                          (inputs.tool === ToolMaterial.CARBIDE
                            ? selectedMaterial.carbideSfm
                            : selectedMaterial.hssSfm) / 3.28084
                        )
                      : inputs.tool === ToolMaterial.CARBIDE
                      ? selectedMaterial.carbideSfm
                      : selectedMaterial.hssSfm
                  }`}
                  className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent bg-[#F7FBF7]"
                />
                <span className="text-[10px] text-[#4A5B4B] mt-1 block">
                  Leave blank to use catalog recommendation
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1B2E1C] mb-1">
                  {inputs.operation === Operation.MILLING
                    ? `Chip Load / Tooth (${isMetric ? 'mm' : 'IPT'})`
                    : `Feed / Revolution (${isMetric ? 'mm' : 'IPR'})`}
                </label>
                <input
                  type="number"
                  step="any"
                  value={inputs.chipOverride}
                  onChange={(e) => updateInput('chipOverride', e.target.value)}
                  placeholder="Scaled default"
                  className="w-full px-3 py-2 text-sm border border-[#B7C9B8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent bg-[#F7FBF7]"
                />
                <span className="text-[10px] text-[#4A5B4B] mt-1 block">
                  Leave blank for auto-scaled chip load
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Calculated Output & Shop Notes */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-4">
          {/* Results Box */}
          <div className="bg-[#E8F5E9] rounded-xl border-2 border-[#2E7D32] p-5 sm:p-6 shadow-sm">
            <span className="text-xs font-bold tracking-wider uppercase text-[#1B5E20]">
              Calculated Spindle Speed
            </span>

            <div className="my-2 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-[#1B5E20] tracking-tight">
                {result.valid ? result.rpm.toLocaleString() : '—'}
              </span>
              <span className="text-lg font-bold text-[#2E7D32]">RPM</span>
            </div>

            {result.error ? (
              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{result.error}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#B7C9B8]">
                <div className="bg-white/80 rounded-lg p-2.5 border border-[#C8E6C9]">
                  <div className="text-[11px] font-semibold text-[#4A5B4B]">
                    Feed Rate
                  </div>
                  <div className="text-base sm:text-lg font-bold text-[#1B2E1C]">
                    {displayFeed}
                  </div>
                </div>

                <div className="bg-white/80 rounded-lg p-2.5 border border-[#C8E6C9]">
                  <div className="text-[11px] font-semibold text-[#4A5B4B]">
                    Surface Speed
                  </div>
                  <div className="text-base sm:text-lg font-bold text-[#1B2E1C]">
                    {displaySurfaceSpeed}
                  </div>
                </div>

                <div className="bg-white/80 rounded-lg p-2.5 border border-[#C8E6C9]">
                  <div className="text-[11px] font-semibold text-[#4A5B4B]">
                    {inputs.operation === Operation.MILLING
                      ? 'Chip Load / Tooth'
                      : 'Feed Per Rev'}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-[#1B2E1C]">
                    {displayChipLoad}
                  </div>
                </div>

                <div className="bg-white/80 rounded-lg p-2.5 border border-[#C8E6C9]">
                  <div className="text-[11px] font-semibold text-[#4A5B4B]">
                    Feed Per Rev (Total)
                  </div>
                  <div className="text-base sm:text-lg font-bold text-[#1B2E1C]">
                    {displayFpr}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Shop Notes & Tips Card */}
          <div className="bg-white rounded-xl border border-[#B7C9B8] p-5 shadow-xs">
            <h4 className="text-xs font-bold text-[#2E7D32] uppercase tracking-wider mb-3">
              Shop Notes & Machining Tips
            </h4>

            {result.notes.length > 0 ? (
              <ul className="space-y-2.5">
                {result.notes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-[#1B2E1C] leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E7D32] mt-0.5" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#4A5B4B]">
                Enter cutting parameters to view tooling advice.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
