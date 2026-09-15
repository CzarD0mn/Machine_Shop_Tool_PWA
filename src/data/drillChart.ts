export type DrillSeries = "number" | "letter" | "fractional" | "metric";

export interface TwistDrill {
  size: string;
  series: DrillSeries;
  inch: number;
  mm: number;
}

export interface CenterDrill {
  size: string;
  bodyInch: number;
  bodyLabel: string;
  pilotInch: number;
  pilotLabel: string;
  drillLengthInch: number;
  drillLengthLabel: string;
  oalInch: number;
  oalLabel: string;
  angle: string;
  standard: "ANSI" | "DIN";
}

const NUMBER_INCH: [number, number][] = [
  [80, 0.0135], [79, 0.0145], [78, 0.016], [77, 0.018], [76, 0.02],
  [75, 0.021], [74, 0.0225], [73, 0.024], [72, 0.025], [71, 0.026],
  [70, 0.028], [69, 0.0292], [68, 0.031], [67, 0.032], [66, 0.033],
  [65, 0.035], [64, 0.036], [63, 0.037], [62, 0.038], [61, 0.039],
  [60, 0.04], [59, 0.041], [58, 0.042], [57, 0.043], [56, 0.0465],
  [55, 0.052], [54, 0.055], [53, 0.0595], [52, 0.0635], [51, 0.067],
  [50, 0.07], [49, 0.073], [48, 0.076], [47, 0.0785], [46, 0.081],
  [45, 0.082], [44, 0.086], [43, 0.089], [42, 0.0935], [41, 0.096],
  [40, 0.098], [39, 0.0995], [38, 0.1015], [37, 0.104], [36, 0.1065],
  [35, 0.11], [34, 0.111], [33, 0.113], [32, 0.116], [31, 0.12],
  [30, 0.1285], [29, 0.136], [28, 0.1405], [27, 0.144], [26, 0.147],
  [25, 0.1495], [24, 0.152], [23, 0.154], [22, 0.157], [21, 0.159],
  [20, 0.161], [19, 0.166], [18, 0.1695], [17, 0.173], [16, 0.177],
  [15, 0.18], [14, 0.182], [13, 0.185], [12, 0.189], [11, 0.191],
  [10, 0.1935], [9, 0.196], [8, 0.199], [7, 0.201], [6, 0.204],
  [5, 0.2055], [4, 0.209], [3, 0.213], [2, 0.221], [1, 0.228],
];

const LETTER_INCH: [string, number][] = [
  ["A", 0.234], ["B", 0.238], ["C", 0.242], ["D", 0.246], ["E", 0.25],
  ["F", 0.257], ["G", 0.261], ["H", 0.266], ["I", 0.272], ["J", 0.277],
  ["K", 0.281], ["L", 0.29], ["M", 0.295], ["N", 0.302], ["O", 0.316],
  ["P", 0.323], ["Q", 0.332], ["R", 0.339], ["S", 0.348], ["T", 0.358],
  ["U", 0.368], ["V", 0.377], ["W", 0.386], ["X", 0.397], ["Y", 0.404],
  ["Z", 0.413],
];

const METRIC_MM = [
  0.5, 0.6, 0.7, 0.8, 0.9,
  1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
  2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9,
  3.0, 3.2, 3.3, 3.5, 3.8,
  4.0, 4.2, 4.5, 4.8,
  5.0, 5.2, 5.5,
  6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0,
  10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 15.0,
  16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0,
];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function fractionLabel(n: number, d: number): string {
  const g = gcd(n, d);
  const num = n / g;
  const den = d / g;
  return den === 1 ? "1" : `${num}/${den}`;
}

function inchToMm(inch: number) {
  return inch * 25.4;
}

function mmToInch(mm: number) {
  return mm / 25.4;
}

export const IMPERIAL_TWIST: TwistDrill[] = [
  ...NUMBER_INCH.map(([n, inch]) => ({
    size: `#${n}`,
    series: "number" as const,
    inch,
    mm: inchToMm(inch),
  })),
  ...LETTER_INCH.map(([letter, inch]) => ({
    size: letter,
    series: "letter" as const,
    inch,
    mm: inchToMm(inch),
  })),
  ...Array.from({ length: 64 }, (_, i) => {
    const n = i + 1;
    const inch = n / 64;
    return {
      size: `${fractionLabel(n, 64)}"`,
      series: "fractional" as const,
      inch,
      mm: inchToMm(inch),
    };
  }),
].sort((a, b) => a.inch - b.inch);

export const METRIC_TWIST: TwistDrill[] = METRIC_MM.map((mm) => ({
  size: `${mm.toFixed(mm % 1 === 0 ? 0 : 1)} mm`,
  series: "metric" as const,
  inch: mmToInch(mm),
  mm,
}));

/** ANSI B94.11M-1993 plain combined drill & countersink, 60°. */
export const ANSI_CENTER_DRILLS: CenterDrill[] = [
  { size: "00", bodyInch: 3 / 32, bodyLabel: '3/32"', pilotInch: 0.025, pilotLabel: '0.025"', drillLengthInch: 0.03, drillLengthLabel: '0.030"', oalInch: 1.125, oalLabel: '1-1/8"', angle: "60°", standard: "ANSI" },
  { size: "0", bodyInch: 3 / 32, bodyLabel: '3/32"', pilotInch: 1 / 32, pilotLabel: '1/32"', drillLengthInch: 0.038, drillLengthLabel: '0.038"', oalInch: 1.125, oalLabel: '1-1/8"', angle: "60°", standard: "ANSI" },
  { size: "1", bodyInch: 1 / 8, bodyLabel: '1/8"', pilotInch: 3 / 64, pilotLabel: '3/64"', drillLengthInch: 3 / 64, drillLengthLabel: '3/64"', oalInch: 1.25, oalLabel: '1-1/4"', angle: "60°", standard: "ANSI" },
  { size: "2", bodyInch: 3 / 16, bodyLabel: '3/16"', pilotInch: 5 / 64, pilotLabel: '5/64"', drillLengthInch: 5 / 64, drillLengthLabel: '5/64"', oalInch: 1.875, oalLabel: '1-7/8"', angle: "60°", standard: "ANSI" },
  { size: "3", bodyInch: 1 / 4, bodyLabel: '1/4"', pilotInch: 7 / 64, pilotLabel: '7/64"', drillLengthInch: 7 / 64, drillLengthLabel: '7/64"', oalInch: 2, oalLabel: '2"', angle: "60°", standard: "ANSI" },
  { size: "4", bodyInch: 5 / 16, bodyLabel: '5/16"', pilotInch: 1 / 8, pilotLabel: '1/8"', drillLengthInch: 1 / 8, drillLengthLabel: '1/8"', oalInch: 2.125, oalLabel: '2-1/8"', angle: "60°", standard: "ANSI" },
  { size: "5", bodyInch: 7 / 16, bodyLabel: '7/16"', pilotInch: 3 / 16, pilotLabel: '3/16"', drillLengthInch: 3 / 16, drillLengthLabel: '3/16"', oalInch: 2.75, oalLabel: '2-3/4"', angle: "60°", standard: "ANSI" },
  { size: "6", bodyInch: 1 / 2, bodyLabel: '1/2"', pilotInch: 7 / 32, pilotLabel: '7/32"', drillLengthInch: 7 / 32, drillLengthLabel: '7/32"', oalInch: 3, oalLabel: '3"', angle: "60°", standard: "ANSI" },
  { size: "7", bodyInch: 5 / 8, bodyLabel: '5/8"', pilotInch: 1 / 4, pilotLabel: '1/4"', drillLengthInch: 1 / 4, drillLengthLabel: '1/4"', oalInch: 3.25, oalLabel: '3-1/4"', angle: "60°", standard: "ANSI" },
  { size: "8", bodyInch: 3 / 4, bodyLabel: '3/4"', pilotInch: 5 / 16, pilotLabel: '5/16"', drillLengthInch: 5 / 16, drillLengthLabel: '5/16"', oalInch: 3.5, oalLabel: '3-1/2"', angle: "60°", standard: "ANSI" },
];

/** DIN 333 Form A combined centre drills, 60°. Size is pilot (d1) × body (d2). */
export const DIN_CENTER_DRILLS: CenterDrill[] = [
  { size: "0.8 × 3.15", bodyInch: mmToInch(3.15), bodyLabel: "3.15 mm", pilotInch: mmToInch(0.8), pilotLabel: "0.80 mm", drillLengthInch: mmToInch(1.5), drillLengthLabel: "1.5 mm", oalInch: mmToInch(20), oalLabel: "20 mm", angle: "60°", standard: "DIN" },
  { size: "1.0 × 3.15", bodyInch: mmToInch(3.15), bodyLabel: "3.15 mm", pilotInch: mmToInch(1.0), pilotLabel: "1.00 mm", drillLengthInch: mmToInch(1.9), drillLengthLabel: "1.9 mm", oalInch: mmToInch(31.5), oalLabel: "31.5 mm", angle: "60°", standard: "DIN" },
  { size: "1.25 × 3.15", bodyInch: mmToInch(3.15), bodyLabel: "3.15 mm", pilotInch: mmToInch(1.25), pilotLabel: "1.25 mm", drillLengthInch: mmToInch(2.2), drillLengthLabel: "2.2 mm", oalInch: mmToInch(31.5), oalLabel: "31.5 mm", angle: "60°", standard: "DIN" },
  { size: "1.6 × 4.0", bodyInch: mmToInch(4.0), bodyLabel: "4.00 mm", pilotInch: mmToInch(1.6), pilotLabel: "1.60 mm", drillLengthInch: mmToInch(2.8), drillLengthLabel: "2.8 mm", oalInch: mmToInch(35.5), oalLabel: "35.5 mm", angle: "60°", standard: "DIN" },
  { size: "2.0 × 5.0", bodyInch: mmToInch(5.0), bodyLabel: "5.00 mm", pilotInch: mmToInch(2.0), pilotLabel: "2.00 mm", drillLengthInch: mmToInch(3.3), drillLengthLabel: "3.3 mm", oalInch: mmToInch(40), oalLabel: "40 mm", angle: "60°", standard: "DIN" },
  { size: "2.5 × 6.3", bodyInch: mmToInch(6.3), bodyLabel: "6.30 mm", pilotInch: mmToInch(2.5), pilotLabel: "2.50 mm", drillLengthInch: mmToInch(4.1), drillLengthLabel: "4.1 mm", oalInch: mmToInch(45), oalLabel: "45 mm", angle: "60°", standard: "DIN" },
  { size: "3.15 × 8.0", bodyInch: mmToInch(8.0), bodyLabel: "8.00 mm", pilotInch: mmToInch(3.15), pilotLabel: "3.15 mm", drillLengthInch: mmToInch(5.0), drillLengthLabel: "5.0 mm", oalInch: mmToInch(50), oalLabel: "50 mm", angle: "60°", standard: "DIN" },
  { size: "4.0 × 10.0", bodyInch: mmToInch(10.0), bodyLabel: "10.00 mm", pilotInch: mmToInch(4.0), pilotLabel: "4.00 mm", drillLengthInch: mmToInch(6.3), drillLengthLabel: "6.3 mm", oalInch: mmToInch(56), oalLabel: "56 mm", angle: "60°", standard: "DIN" },
  { size: "5.0 × 12.5", bodyInch: mmToInch(12.5), bodyLabel: "12.50 mm", pilotInch: mmToInch(5.0), pilotLabel: "5.00 mm", drillLengthInch: mmToInch(7.5), drillLengthLabel: "7.5 mm", oalInch: mmToInch(63), oalLabel: "63 mm", angle: "60°", standard: "DIN" },
  { size: "6.3 × 16.0", bodyInch: mmToInch(16.0), bodyLabel: "16.00 mm", pilotInch: mmToInch(6.3), pilotLabel: "6.30 mm", drillLengthInch: mmToInch(9.0), drillLengthLabel: "9.0 mm", oalInch: mmToInch(71), oalLabel: "71 mm", angle: "60°", standard: "DIN" },
  { size: "8.0 × 20.0", bodyInch: mmToInch(20.0), bodyLabel: "20.00 mm", pilotInch: mmToInch(8.0), pilotLabel: "8.00 mm", drillLengthInch: mmToInch(11.2), drillLengthLabel: "11.2 mm", oalInch: mmToInch(80), oalLabel: "80 mm", angle: "60°", standard: "DIN" },
  { size: "10.0 × 25.0", bodyInch: mmToInch(25.0), bodyLabel: "25.00 mm", pilotInch: mmToInch(10.0), pilotLabel: "10.00 mm", drillLengthInch: mmToInch(14.0), drillLengthLabel: "14.0 mm", oalInch: mmToInch(100), oalLabel: "100 mm", angle: "60°", standard: "DIN" },
];

export function formatInch(n: number) {
  return n.toFixed(4);
}

export function formatMm(n: number) {
  return n.toFixed(3);
}

export function seriesLabel(series: DrillSeries) {
  if (series === "number") return "Number";
  if (series === "letter") return "Letter";
  if (series === "fractional") return "Fractional";
  return "Metric";
}
