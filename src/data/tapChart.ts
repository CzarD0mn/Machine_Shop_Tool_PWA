export type TapSeries = "UNC" | "UNF" | "METRIC_COARSE" | "METRIC_FINE";

export interface TapRow {
  size: string;
  series: TapSeries;
  pitchLabel: string;
  majorLabel: string;
  majorInch: number;
  minorInch: number;
  drillLabel: string;
  drillInch: number;
  aliases?: string;
}

function inchToMm(inch: number) {
  return inch * 25.4;
}

function mmToInch(mm: number) {
  return mm / 25.4;
}

/** Basic internal-thread minor Ø: D − 1.082532 × pitch (ASME B1.1 / ISO 68-1). */
function basicInternalMinorInch(majorInch: number, pitchInch: number) {
  return majorInch - 1.082532 * pitchInch;
}

/** Unified National tap drills at ~75% thread. */
const IMPERIAL_RAW: [string, TapSeries, number, number, string, number, string?][] = [
  // ASME B1.1: size 0 is UNF only (80 TPI). Major Ø 0.0600". 75% tap drill 3/64" (0.0469").
  ["#0-80", "UNF", 80, 0.06, '3/64"', 0.0469, "0-80 #0 0 80 UNF"],
  ["#1-64", "UNC", 64, 0.073, "#53", 0.0595],
  ["#1-72", "UNF", 72, 0.073, "#53", 0.0595],
  ["#2-56", "UNC", 56, 0.086, "#50", 0.07],
  ["#2-64", "UNF", 64, 0.086, "#50", 0.07],
  ["#3-48", "UNC", 48, 0.099, "#47", 0.0785],
  ["#3-56", "UNF", 56, 0.099, "#45", 0.082],
  ["#4-40", "UNC", 40, 0.112, "#43", 0.089],
  ["#4-48", "UNF", 48, 0.112, "#42", 0.0935],
  ["#5-40", "UNC", 40, 0.125, "#38", 0.1015],
  ["#5-44", "UNF", 44, 0.125, "#37", 0.104],
  ["#6-32", "UNC", 32, 0.138, "#36", 0.1065],
  ["#6-40", "UNF", 40, 0.138, "#33", 0.113],
  ["#8-32", "UNC", 32, 0.164, "#29", 0.136],
  ["#8-36", "UNF", 36, 0.164, "#29", 0.136],
  ["#10-24", "UNC", 24, 0.19, "#25", 0.1495],
  ["#10-32", "UNF", 32, 0.19, "#21", 0.159],
  ["#12-24", "UNC", 24, 0.216, "#16", 0.177],
  ["#12-28", "UNF", 28, 0.216, "#14", 0.182],
  ['1/4"-20', "UNC", 20, 0.25, "#7", 0.201],
  ['1/4"-28', "UNF", 28, 0.25, "#3", 0.213],
  ['5/16"-18', "UNC", 18, 0.3125, "F", 0.257],
  ['5/16"-24', "UNF", 24, 0.3125, "I", 0.272],
  ['3/8"-16', "UNC", 16, 0.375, '5/16"', 0.3125],
  ['3/8"-24', "UNF", 24, 0.375, "Q", 0.332],
  ['7/16"-14', "UNC", 14, 0.4375, "U", 0.368],
  ['7/16"-20', "UNF", 20, 0.4375, '25/64"', 0.3906],
  ['1/2"-13', "UNC", 13, 0.5, '27/64"', 0.4219],
  ['1/2"-20', "UNF", 20, 0.5, '29/64"', 0.4531],
  ['9/16"-12', "UNC", 12, 0.5625, '31/64"', 0.4844],
  ['9/16"-18', "UNF", 18, 0.5625, '33/64"', 0.5156],
  ['5/8"-11', "UNC", 11, 0.625, '17/32"', 0.5313],
  ['5/8"-18', "UNF", 18, 0.625, '37/64"', 0.5781],
  ['3/4"-10', "UNC", 10, 0.75, '21/32"', 0.6563],
  ['3/4"-16', "UNF", 16, 0.75, '11/16"', 0.6875],
  ['7/8"-9', "UNC", 9, 0.875, '49/64"', 0.7656],
  ['7/8"-14', "UNF", 14, 0.875, '13/16"', 0.8125],
  ['1"-8', "UNC", 8, 1, '7/8"', 0.875],
  ['1"-12', "UNF", 12, 1, '59/64"', 0.9219],
  ['1-1/8"-7', "UNC", 7, 1.125, '63/64"', 0.9844],
  ['1-1/8"-12', "UNF", 12, 1.125, '1-3/64"', 1.0469],
  ['1-1/4"-7', "UNC", 7, 1.25, '1-7/64"', 1.1094],
  ['1-1/4"-12', "UNF", 12, 1.25, '1-11/64"', 1.1719],
  ['1-3/8"-6', "UNC", 6, 1.375, '1-7/32"', 1.2188],
  ['1-3/8"-12', "UNF", 12, 1.375, '1-19/64"', 1.2969],
  ['1-1/2"-6', "UNC", 6, 1.5, '1-11/32"', 1.3438],
  ['1-1/2"-12', "UNF", 12, 1.5, '1-27/64"', 1.4219],
];

/** ISO metric tap drills at ~75% thread (shop chart: drill ≈ major − pitch). */
const METRIC_RAW: [string, TapSeries, number, number, number][] = [
  ["M1.6 × 0.35", "METRIC_COARSE", 0.35, 1.6, 1.25],
  ["M2 × 0.4", "METRIC_COARSE", 0.4, 2.0, 1.6],
  ["M2.2 × 0.45", "METRIC_COARSE", 0.45, 2.2, 1.75],
  ["M2.5 × 0.45", "METRIC_COARSE", 0.45, 2.5, 2.05],
  ["M3 × 0.5", "METRIC_COARSE", 0.5, 3.0, 2.5],
  ["M3.5 × 0.6", "METRIC_COARSE", 0.6, 3.5, 2.9],
  ["M4 × 0.7", "METRIC_COARSE", 0.7, 4.0, 3.3],
  ["M4.5 × 0.75", "METRIC_COARSE", 0.75, 4.5, 3.7],
  ["M5 × 0.8", "METRIC_COARSE", 0.8, 5.0, 4.2],
  ["M6 × 1", "METRIC_COARSE", 1.0, 6.0, 5.0],
  ["M7 × 1", "METRIC_COARSE", 1.0, 7.0, 6.0],
  ["M8 × 1.25", "METRIC_COARSE", 1.25, 8.0, 6.8],
  ["M10 × 1.5", "METRIC_COARSE", 1.5, 10.0, 8.5],
  ["M12 × 1.75", "METRIC_COARSE", 1.75, 12.0, 10.2],
  ["M14 × 2", "METRIC_COARSE", 2.0, 14.0, 12.0],
  ["M16 × 2", "METRIC_COARSE", 2.0, 16.0, 14.0],
  ["M18 × 2.5", "METRIC_COARSE", 2.5, 18.0, 15.5],
  ["M20 × 2.5", "METRIC_COARSE", 2.5, 20.0, 17.5],
  ["M22 × 2.5", "METRIC_COARSE", 2.5, 22.0, 19.5],
  ["M24 × 3", "METRIC_COARSE", 3.0, 24.0, 21.0],
  ["M27 × 3", "METRIC_COARSE", 3.0, 27.0, 24.0],
  ["M30 × 3.5", "METRIC_COARSE", 3.5, 30.0, 26.5],
  ["M4 × 0.5", "METRIC_FINE", 0.5, 4.0, 3.5],
  ["M5 × 0.5", "METRIC_FINE", 0.5, 5.0, 4.5],
  ["M6 × 0.75", "METRIC_FINE", 0.75, 6.0, 5.25],
  ["M8 × 0.75", "METRIC_FINE", 0.75, 8.0, 7.25],
  ["M8 × 1", "METRIC_FINE", 1.0, 8.0, 7.0],
  ["M10 × 0.75", "METRIC_FINE", 0.75, 10.0, 9.25],
  ["M10 × 1", "METRIC_FINE", 1.0, 10.0, 9.0],
  ["M10 × 1.25", "METRIC_FINE", 1.25, 10.0, 8.8],
  ["M12 × 1", "METRIC_FINE", 1.0, 12.0, 11.0],
  ["M12 × 1.25", "METRIC_FINE", 1.25, 12.0, 10.8],
  ["M12 × 1.5", "METRIC_FINE", 1.5, 12.0, 10.5],
  ["M14 × 1.5", "METRIC_FINE", 1.5, 14.0, 12.5],
  ["M16 × 1.5", "METRIC_FINE", 1.5, 16.0, 14.5],
  ["M18 × 1.5", "METRIC_FINE", 1.5, 18.0, 16.5],
  ["M18 × 2", "METRIC_FINE", 2.0, 18.0, 16.0],
  ["M20 × 1.5", "METRIC_FINE", 1.5, 20.0, 18.5],
  ["M20 × 2", "METRIC_FINE", 2.0, 20.0, 18.0],
  ["M22 × 1.5", "METRIC_FINE", 1.5, 22.0, 20.5],
  ["M24 × 2", "METRIC_FINE", 2.0, 24.0, 22.0],
  ["M27 × 2", "METRIC_FINE", 2.0, 27.0, 25.0],
  ["M30 × 2", "METRIC_FINE", 2.0, 30.0, 28.0],
];

export const IMPERIAL_TAPS: TapRow[] = IMPERIAL_RAW.map(
  ([size, series, tpi, majorInch, drillLabel, drillInch, aliases]) => ({
    size,
    series,
    pitchLabel: `${tpi} TPI`,
    majorLabel: `${majorInch.toFixed(4)}"`,
    majorInch,
    minorInch: basicInternalMinorInch(majorInch, 1 / tpi),
    drillLabel,
    drillInch,
    aliases,
  }),
);

export const METRIC_TAPS: TapRow[] = METRIC_RAW.map(
  ([size, series, pitchMm, majorMm, drillMm]) => ({
    size,
    series,
    pitchLabel: `${pitchMm.toFixed(pitchMm % 1 === 0 ? 0 : 2).replace(/0$/, "")} mm`,
    majorLabel: `${majorMm.toFixed(majorMm % 1 === 0 ? 0 : 1)} mm`,
    majorInch: mmToInch(majorMm),
    minorInch: basicInternalMinorInch(mmToInch(majorMm), mmToInch(pitchMm)),
    drillLabel: `${drillMm.toFixed(drillMm % 1 === 0 ? 0 : 2).replace(/0$/, "")} mm`,
    drillInch: mmToInch(drillMm),
  }),
);

/** Roll/form tap drills at ~65% thread (Haas / Balax shop charts). */
const IMPERIAL_FORM_RAW: [string, TapSeries, number, number, string, number, string?][] = [
  ["#0-80", "UNF", 80, 0.06, "#54", 0.055, "0-80 #0"],
  ["#1-64", "UNC", 64, 0.073, "1.65 mm", 0.065],
  ["#1-72", "UNF", 72, 0.073, "1.70 mm", 0.0669],
  ["#2-56", "UNC", 56, 0.086, '5/64"', 0.0781],
  ["#2-64", "UNF", 64, 0.086, "2.0 mm", 0.0787],
  ["#3-48", "UNC", 48, 0.099, "#40", 0.098],
  ["#3-56", "UNF", 56, 0.099, "2.3 mm", 0.0906],
  ["#4-40", "UNC", 40, 0.112, "#39", 0.0995],
  ["#4-48", "UNF", 48, 0.112, "2.6 mm", 0.1024],
  ["#5-40", "UNC", 40, 0.125, "2.9 mm", 0.1142],
  ["#5-44", "UNF", 44, 0.125, "2.9 mm", 0.1142],
  ["#6-32", "UNC", 32, 0.138, "3.1 mm", 0.122],
  ["#6-40", "UNF", 40, 0.138, "3.2 mm", 0.126],
  ["#8-32", "UNC", 32, 0.164, "3.8 mm", 0.1496],
  ["#8-36", "UNF", 36, 0.164, "3.8 mm", 0.1496],
  ["#10-24", "UNC", 24, 0.19, "4.3 mm", 0.1693],
  ["#10-32", "UNF", 32, 0.19, "4.4 mm", 0.1732],
  ["#12-24", "UNC", 24, 0.216, "5 mm", 0.1969],
  ["#12-28", "UNF", 28, 0.216, "5.1 mm", 0.2008],
  ['1/4"-20', "UNC", 20, 0.25, "#1", 0.228, "1/4-20"],
  ['1/4"-28', "UNF", 28, 0.25, "A", 0.234],
  ['5/16"-18', "UNC", 18, 0.3125, "7.3 mm", 0.2874],
  ['5/16"-24', "UNF", 24, 0.3125, "7.4 mm", 0.2913],
  ['3/8"-16', "UNC", 16, 0.375, "8.8 mm", 0.3465],
  ['3/8"-24', "UNF", 24, 0.375, "9 mm", 0.3543],
  ['7/16"-14', "UNC", 14, 0.4375, "10.3 mm", 0.4055],
  ['7/16"-20', "UNF", 20, 0.4375, "10.5 mm", 0.4134],
  ['1/2"-13', "UNC", 13, 0.5, "11.8 mm", 0.4646],
  ['1/2"-20', "UNF", 20, 0.5, "12.1 mm", 0.4764],
  ['9/16"-12', "UNC", 12, 0.5625, "13.3 mm", 0.5236],
  ['9/16"-18', "UNF", 18, 0.5625, "13.6 mm", 0.5354],
  ['5/8"-11', "UNC", 11, 0.625, "14.8 mm", 0.5827],
  ['5/8"-18', "UNF", 18, 0.625, "15.2 mm", 0.5984],
  ['3/4"-10', "UNC", 10, 0.75, "17.9 mm", 0.7047],
  ['3/4"-16', "UNF", 16, 0.75, "18.3 mm", 0.7205],
  ['7/8"-9', "UNC", 9, 0.875, "21.0 mm", 0.8268],
  ['7/8"-14', "UNF", 14, 0.875, "21.4 mm", 0.8425],
  ['1"-8', "UNC", 8, 1, "24.0 mm", 0.9449],
  ['1"-12', "UNF", 12, 1, "24.4 mm", 0.9606],
  ['1-1/8"-7', "UNC", 7, 1.125, '1-1/16"', 1.0625],
  ['1-1/8"-12', "UNF", 12, 1.125, '1-3/32"', 1.0938],
  ['1-1/4"-7', "UNC", 7, 1.25, '1-3/16"', 1.1875],
  ['1-1/4"-12', "UNF", 12, 1.25, '1-7/32"', 1.2188],
  ['1-3/8"-6', "UNC", 6, 1.375, "33.05 mm", 1.3012],
  ['1-3/8"-12', "UNF", 12, 1.375, '1-11/32"', 1.3438],
  ['1-1/2"-6', "UNC", 6, 1.5, '1-27/64"', 1.4219],
  ['1-1/2"-12', "UNF", 12, 1.5, '1-15/32"', 1.4688],
];

const METRIC_FORM_RAW: [string, TapSeries, number, number, number][] = [
  ["M1.6 × 0.35", "METRIC_COARSE", 0.35, 1.6, 1.45],
  ["M2 × 0.4", "METRIC_COARSE", 0.4, 2.0, 1.8],
  ["M2.2 × 0.45", "METRIC_COARSE", 0.45, 2.2, 2.0],
  ["M2.5 × 0.45", "METRIC_COARSE", 0.45, 2.5, 2.3],
  ["M3 × 0.5", "METRIC_COARSE", 0.5, 3.0, 2.8],
  ["M3.5 × 0.6", "METRIC_COARSE", 0.6, 3.5, 3.2],
  ["M4 × 0.7", "METRIC_COARSE", 0.7, 4.0, 3.7],
  ["M4.5 × 0.75", "METRIC_COARSE", 0.75, 4.5, 4.2],
  ["M5 × 0.8", "METRIC_COARSE", 0.8, 5.0, 4.6],
  ["M6 × 1", "METRIC_COARSE", 1.0, 6.0, 5.5],
  ["M7 × 1", "METRIC_COARSE", 1.0, 7.0, 6.5],
  ["M8 × 1.25", "METRIC_COARSE", 1.25, 8.0, 7.4],
  ["M10 × 1.5", "METRIC_COARSE", 1.5, 10.0, 9.3],
  ["M12 × 1.75", "METRIC_COARSE", 1.75, 12.0, 11.2],
  ["M14 × 2", "METRIC_COARSE", 2.0, 14.0, 13.1],
  ["M16 × 2", "METRIC_COARSE", 2.0, 16.0, 15.1],
  ["M18 × 2.5", "METRIC_COARSE", 2.5, 18.0, 16.9],
  ["M20 × 2.5", "METRIC_COARSE", 2.5, 20.0, 18.9],
  ["M22 × 2.5", "METRIC_COARSE", 2.5, 22.0, 20.9],
  ["M24 × 3", "METRIC_COARSE", 3.0, 24.0, 22.6],
  ["M27 × 3", "METRIC_COARSE", 3.0, 27.0, 25.7],
  ["M30 × 3.5", "METRIC_COARSE", 3.5, 30.0, 28.5],
  ["M4 × 0.5", "METRIC_FINE", 0.5, 4.0, 3.8],
  ["M5 × 0.5", "METRIC_FINE", 0.5, 5.0, 4.8],
  ["M6 × 0.75", "METRIC_FINE", 0.75, 6.0, 5.6],
  ["M8 × 0.75", "METRIC_FINE", 0.75, 8.0, 7.7],
  ["M8 × 1", "METRIC_FINE", 1.0, 8.0, 7.5],
  ["M10 × 0.75", "METRIC_FINE", 0.75, 10.0, 9.7],
  ["M10 × 1", "METRIC_FINE", 1.0, 10.0, 9.5],
  ["M10 × 1.25", "METRIC_FINE", 1.25, 10.0, 9.4],
  ["M12 × 1", "METRIC_FINE", 1.0, 12.0, 11.6],
  ["M12 × 1.25", "METRIC_FINE", 1.25, 12.0, 11.4],
  ["M12 × 1.5", "METRIC_FINE", 1.5, 12.0, 11.3],
  ["M14 × 1.5", "METRIC_FINE", 1.5, 14.0, 13.3],
  ["M16 × 1.5", "METRIC_FINE", 1.5, 16.0, 15.3],
  ["M18 × 1.5", "METRIC_FINE", 1.5, 18.0, 17.3],
  ["M18 × 2", "METRIC_FINE", 2.0, 18.0, 17.1],
  ["M20 × 1.5", "METRIC_FINE", 1.5, 20.0, 19.3],
  ["M20 × 2", "METRIC_FINE", 2.0, 20.0, 19.1],
  ["M22 × 1.5", "METRIC_FINE", 1.5, 22.0, 21.3],
  ["M24 × 2", "METRIC_FINE", 2.0, 24.0, 23.1],
  ["M27 × 2", "METRIC_FINE", 2.0, 27.0, 26.1],
  ["M30 × 2", "METRIC_FINE", 2.0, 30.0, 29.1],
];

function mapImperial(raw: typeof IMPERIAL_RAW): TapRow[] {
  return raw.map(
    ([size, series, tpi, majorInch, drillLabel, drillInch, aliases]) => ({
      size,
      series,
      pitchLabel: `${tpi} TPI`,
      majorLabel: `${majorInch.toFixed(4)}"`,
      majorInch,
      minorInch: basicInternalMinorInch(majorInch, 1 / tpi),
      drillLabel,
      drillInch,
      aliases,
    }),
  );
}

export const IMPERIAL_FORM_TAPS: TapRow[] = mapImperial(IMPERIAL_FORM_RAW);

export const METRIC_FORM_TAPS: TapRow[] = METRIC_FORM_RAW.map(
  ([size, series, pitchMm, majorMm, drillMm]) => ({
    size,
    series,
    pitchLabel: `${pitchMm.toFixed(pitchMm % 1 === 0 ? 0 : 2).replace(/0$/, "")} mm`,
    majorLabel: `${majorMm.toFixed(majorMm % 1 === 0 ? 0 : 1)} mm`,
    majorInch: mmToInch(majorMm),
    minorInch: basicInternalMinorInch(mmToInch(majorMm), mmToInch(pitchMm)),
    drillLabel: `${drillMm.toFixed(drillMm % 1 === 0 ? 0 : 2).replace(/0$/, "")} mm`,
    drillInch: mmToInch(drillMm),
  }),
);

export function tapSeriesLabel(series: TapSeries) {
  if (series === "UNC") return "UNC";
  if (series === "UNF") return "UNF";
  if (series === "METRIC_COARSE") return "Coarse";
  return "Fine";
}

export function tapDrillMm(row: TapRow) {
  return inchToMm(row.drillInch);
}

export function tapMajorMm(row: TapRow) {
  return inchToMm(row.majorInch);
}

export function tapMinorMm(row: TapRow) {
  return inchToMm(row.minorInch);
}
