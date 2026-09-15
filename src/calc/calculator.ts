import {
  CalcInputs,
  CalcResult,
  Operation,
  ToolMaterial,
  Units,
} from '../types';
import { MATERIALS_BY_ID } from '../data/materials';

export class Calculator {
  static calculate(inputs: CalcInputs): CalcResult {
    const material = MATERIALS_BY_ID[inputs.materialId] || MATERIALS_BY_ID['al_6061'];
    const rawDiam = parseFloat(inputs.diameterText);

    if (isNaN(rawDiam) || rawDiam <= 0) {
      return {
        sfmUsed: 0,
        recommendedSfm: 0,
        rpm: 0,
        feedIpm: 0,
        chipLoad: 0,
        feedPerRev: 0,
        diameterInch: 0,
        flutes: 0,
        notes: ['Enter a tool or workpiece diameter greater than zero.'],
        valid: false,
        error: 'Enter a tool or workpiece diameter greater than zero.',
      };
    }

    const diameterInch = inputs.units === Units.METRIC ? rawDiam / 25.4 : rawDiam;
    if (diameterInch <= 0.0001) {
      return {
        sfmUsed: 0,
        recommendedSfm: 0,
        rpm: 0,
        feedIpm: 0,
        chipLoad: 0,
        feedPerRev: 0,
        diameterInch,
        flutes: 0,
        notes: ['Diameter is too small to calculate.'],
        valid: false,
        error: 'Diameter is too small to calculate.',
      };
    }

    const flutes =
      inputs.operation === Operation.TURNING
        ? 1
        : inputs.operation === Operation.DRILLING
        ? 1
        : Math.max(1, parseInt(inputs.flutesText) || 2);

    const recommendedSfm =
      inputs.tool === ToolMaterial.CARBIDE ? material.carbideSfm : material.hssSfm;

    const rawSfmOverride = parseFloat(inputs.sfmOverride);
    const sfmUsed =
      !isNaN(rawSfmOverride) && rawSfmOverride > 0
        ? inputs.units === Units.METRIC
          ? rawSfmOverride * 3.28084
          : rawSfmOverride
        : recommendedSfm;

    // For milling and drilling, scale chip load by tool diameter relative to 1/4" reference.
    // For turning, feed per revolution (IPR) is determined by insert geometry and remains stable.
    const scale =
      inputs.operation === Operation.TURNING
        ? 1.0
        : Math.sqrt(Math.min(Math.max(diameterInch / 0.25, 0.1), 6.0));

    const baseChip =
      inputs.operation === Operation.MILLING
        ? material.iptAtQuarterInch
        : inputs.operation === Operation.DRILLING
        ? material.drillIprAtQuarterInch
        : material.turnIpr;

    const recommendedChip = baseChip * scale;

    const rawChipOverride = parseFloat(inputs.chipOverride);
    const chipUsed =
      !isNaN(rawChipOverride) && rawChipOverride > 0
        ? inputs.units === Units.METRIC
          ? rawChipOverride / 25.4
          : rawChipOverride
        : recommendedChip;

    const rawRpm = (sfmUsed * 3.82) / diameterInch;
    const rpm = Math.round(Math.min(Math.max(rawRpm, 1), 60000));

    const feedIpm =
      inputs.operation === Operation.MILLING
        ? rpm * flutes * chipUsed
        : rpm * chipUsed;

    const feedPerRev =
      inputs.operation === Operation.MILLING
        ? chipUsed * flutes
        : chipUsed;

    const notes = this.buildNotes(
      inputs,
      material.tip,
      recommendedSfm,
      sfmUsed,
      recommendedChip,
      chipUsed,
      rpm,
      diameterInch
    );

    return {
      sfmUsed,
      recommendedSfm,
      rpm,
      feedIpm,
      chipLoad: chipUsed,
      feedPerRev,
      diameterInch,
      flutes,
      notes,
      valid: true,
    };
  }

  private static buildNotes(
    inputs: CalcInputs,
    materialTip: string,
    recSfm: number,
    sfmUsed: number,
    recChip: number,
    chipUsed: number,
    rpm: number,
    diamInch: number
  ): string[] {
    const list: string[] = [];

    list.push(materialTip);

    if (Math.abs(sfmUsed - recSfm) > 0.5) {
      list.push(
        `Surface speed overridden to ${Math.round(sfmUsed)} SFM (catalog recommended: ${recSfm} SFM).`
      );
    }

    if (Math.abs(chipUsed - recChip) > 0.00005) {
      list.push(
        `Chip load overridden to ${chipUsed.toFixed(4)}" (scaled recommendation: ${recChip.toFixed(4)}").`
      );
    }

    if (inputs.operation === Operation.TURNING) {
      list.push(
        'Turning surface speed varies by diameter. Use constant surface speed (CSS) when facing.'
      );
    }

    if (inputs.operation === Operation.MILLING && diamInch < 0.1875) {
      list.push(
        'Small end mills (< 3/16") deflect easily. Reduce chip load or step down axial depth.'
      );
    }

    if (inputs.operation === Operation.DRILLING && diamInch > 0.5) {
      list.push(
        'Large twist drills: consider a pilot hole or pecking cycle for holes deeper than 3x diameter.'
      );
    }

    if (rpm > 10000) {
      list.push(
        'Calculated spindle speed exceeds 10,000 RPM. Verify holder balance and machine max RPM.'
      );
    }

    if (inputs.tool === ToolMaterial.HSS) {
      list.push(
        'HSS runs cooler when flooded with coolant. Avoid letting chips pack.'
      );
    }

    return list;
  }
}
