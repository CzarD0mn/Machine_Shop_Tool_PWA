import { TapSeries } from "./tapChart";

export type StiParentMetal = "steel" | "aluminum";

export interface StiRow {
  size: string;
  series: TapSeries;
  stiTap: string;
  steelLabel: string;
  steelInch: number;
  aluminumLabel: string;
  aluminumInch: number;
  aliases?: string;
}

function mmToInch(mm: number) {
  return mm / 25.4;
}

function inchToMm(inch: number) {
  return inch * 25.4;
}

/** Heli-Coil / ASME B18.29.1 suggested STI drills (steel/Mg/plastic and aluminum). */
const IMPERIAL_RAW: [
  string,
  TapSeries,
  string,
  number,
  string,
  number,
  string?,
][] = [
  ["#1-64", "UNC", "#46", 0.081, "#47", 0.0785],
  ["#2-56", "UNC", "#41", 0.096, '3/32"', 0.0938],
  ["#3-48", "UNC", '7/64"', 0.1094, "#36", 0.1065],
  ["#4-40", "UNC", "#31", 0.12, "#31", 0.12, "4-40"],
  ["#5-40", "UNC", "#29", 0.136, "3.4 mm", 0.1339],
  ["#6-32", "UNC", "#25", 0.1495, "#26", 0.147],
  ["#8-32", "UNC", "#16", 0.177, "#17", 0.173],
  ["#10-24", "UNC", "#5", 0.2055, '13/64"', 0.2031],
  ["#12-24", "UNC", "#1", 0.228, "#1", 0.228],
  ['1/4"-20', "UNC", "H", 0.266, "H", 0.266, "1/4-20"],
  ['5/16"-18', "UNC", "Q", 0.332, "Q", 0.332, "5/16-18"],
  ['3/8"-16', "UNC", "X", 0.397, "X", 0.397, "3/8-16"],
  ['7/16"-14', "UNC", '29/64"', 0.4531, '29/64"', 0.4531],
  ['1/2"-13', "UNC", '17/32"', 0.5312, '33/64"', 0.5156, "1/2-13"],
  ['9/16"-12', "UNC", '19/32"', 0.5938, '37/64"', 0.5781],
  ['5/8"-11', "UNC", '21/32"', 0.6562, '21/32"', 0.6562],
  ['3/4"-10', "UNC", '25/32"', 0.7812, '25/32"', 0.7812],
  ['7/8"-9', "UNC", '29/32"', 0.9062, '29/32"', 0.9062],
  ['1"-8', "UNC", '1-1/32"', 1.0312, '1-1/32"', 1.0312],
  ["#2-64", "UNF", "2.35 mm", 0.0925, "2.35 mm", 0.0925],
  ["#3-56", "UNF", "#36", 0.1065, "#37", 0.104],
  ["#4-48", "UNF", "#31", 0.12, "3.0 mm", 0.1181],
  ["#6-40", "UNF", "#25", 0.1495, "#26", 0.147],
  ["#8-36", "UNF", "#16", 0.177, "#17", 0.173],
  ["#10-32", "UNF", '13/64"', 0.2031, "#7", 0.201],
  ['1/4"-28', "UNF", "6.7 mm", 0.2638, "G", 0.261],
  ['5/16"-24', "UNF", '21/64"', 0.3281, '21/64"', 0.3281],
  ['3/8"-24', "UNF", '25/64"', 0.3906, '25/64"', 0.3906],
  ['7/16"-20', "UNF", '29/64"', 0.4531, '29/64"', 0.4531],
  ['1/2"-20', "UNF", '33/64"', 0.5156, '33/64"', 0.5156],
  ['9/16"-18', "UNF", '37/64"', 0.5781, '37/64"', 0.5781],
  ['5/8"-18', "UNF", '41/64"', 0.6406, '41/64"', 0.6406],
  ['3/4"-16', "UNF", '49/64"', 0.7656, '49/64"', 0.7656],
  ['7/8"-14', "UNF", '57/64"', 0.8906, '57/64"', 0.8906],
  ['1"-12', "UNF", '1-1/32"', 1.0312, '1-1/64"', 1.0156],
];

const METRIC_RAW: [string, TapSeries, number, number][] = [
  ["M2 × 0.4", "METRIC_COARSE", 2.1, 2.1],
  ["M2.2 × 0.45", "METRIC_COARSE", 2.35, 2.3],
  ["M2.5 × 0.45", "METRIC_COARSE", 2.65, 2.55],
  ["M3 × 0.5", "METRIC_COARSE", 3.2, 3.15],
  ["M3.5 × 0.6", "METRIC_COARSE", 3.7, 3.7],
  ["M4 × 0.7", "METRIC_COARSE", 4.25, 4.2],
  ["M5 × 0.8", "METRIC_COARSE", 5.3, 5.2],
  ["M6 × 1", "METRIC_COARSE", 6.3, 6.25],
  ["M7 × 1", "METRIC_COARSE", 7.3, 7.25],
  ["M8 × 1.25", "METRIC_COARSE", 8.4, 8.3],
  ["M10 × 1.5", "METRIC_COARSE", 10.5, 10.5],
  ["M12 × 1.75", "METRIC_COARSE", 12.5, 12.5],
  ["M14 × 2", "METRIC_COARSE", 14.5, 14.5],
  ["M16 × 2", "METRIC_COARSE", 16.5, 16.5],
  ["M18 × 2.5", "METRIC_COARSE", 18.75, 18.75],
  ["M20 × 2.5", "METRIC_COARSE", 20.75, 20.75],
  ["M22 × 2.5", "METRIC_COARSE", 22.75, 22.75],
  ["M24 × 3", "METRIC_COARSE", 24.75, 24.75],
  ["M8 × 1", "METRIC_FINE", 8.3, 8.25],
  ["M10 × 1", "METRIC_FINE", 10.25, 10.25],
  ["M10 × 1.25", "METRIC_FINE", 10.25, 10.25],
  ["M12 × 1.25", "METRIC_FINE", 12.25, 12.25],
  ["M12 × 1.5", "METRIC_FINE", 12.5, 12.25],
  ["M14 × 1.5", "METRIC_FINE", 14.5, 14.25],
  ["M16 × 1.5", "METRIC_FINE", 16.5, 16.25],
  ["M18 × 1.5", "METRIC_FINE", 18.5, 18.25],
  ["M18 × 2", "METRIC_FINE", 18.5, 18.5],
  ["M20 × 1.5", "METRIC_FINE", 20.5, 20.25],
  ["M20 × 2", "METRIC_FINE", 20.5, 20.5],
];

function metricLabel(mm: number) {
  const text = mm.toFixed(mm % 1 === 0 ? 0 : 2).replace(/0$/, "");
  return `${text} mm`;
}

export const IMPERIAL_STI: StiRow[] = IMPERIAL_RAW.map(
  ([size, series, steelLabel, steelInch, aluminumLabel, aluminumInch, aliases]) => ({
    size,
    series,
    stiTap: `${size} STI`,
    steelLabel,
    steelInch,
    aluminumLabel,
    aluminumInch,
    aliases,
  }),
);

export const METRIC_STI: StiRow[] = METRIC_RAW.map(
  ([size, series, steelMm, aluminumMm]) => ({
    size,
    series,
    stiTap: `${size} STI`,
    steelLabel: metricLabel(steelMm),
    steelInch: mmToInch(steelMm),
    aluminumLabel: metricLabel(aluminumMm),
    aluminumInch: mmToInch(aluminumMm),
  }),
);

export function stiDrill(row: StiRow, metal: StiParentMetal) {
  if (metal === "aluminum") {
    return { label: row.aluminumLabel, inch: row.aluminumInch };
  }
  return { label: row.steelLabel, inch: row.steelInch };
}

export function stiDrillMm(inch: number) {
  return inchToMm(inch);
}
