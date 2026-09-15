import React, { useMemo, useState } from "react";
import { Units } from "../types";
import {
  ANSI_CENTER_DRILLS,
  CenterDrill,
  DIN_CENTER_DRILLS,
  DrillSeries,
  formatInch,
  formatMm,
  IMPERIAL_TWIST,
  METRIC_TWIST,
  seriesLabel,
  TwistDrill,
} from "../data/drillChart";

type ChartSection = "all" | "twist" | "center";
type ImperialSeriesFilter = "all" | DrillSeries;

function matchesQuery(haystack: string, query: string) {
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}

export const DrillChartTab: React.FC = () => {
  const [units, setUnits] = useState<Units>(Units.INCH);
  const [section, setSection] = useState<ChartSection>("all");
  const [seriesFilter, setSeriesFilter] = useState<ImperialSeriesFilter>("all");
  const [query, setQuery] = useState("");

  const isMetric = units === Units.METRIC;
  const q = query.trim().toLowerCase();

  const twist = useMemo(() => {
    const source = isMetric ? METRIC_TWIST : IMPERIAL_TWIST;
    return source.filter((row) => {
      if (!isMetric && seriesFilter !== "all" && row.series !== seriesFilter) {
        return false;
      }
      return matchesQuery(
        `${row.size} ${seriesLabel(row.series)} ${formatInch(row.inch)} ${formatMm(row.mm)}`,
        q,
      );
    });
  }, [isMetric, seriesFilter, q]);

  const centers = useMemo(() => {
    const source = isMetric ? DIN_CENTER_DRILLS : ANSI_CENTER_DRILLS;
    return source.filter((row) =>
      matchesQuery(
        `${row.size} ${row.bodyLabel} ${row.pilotLabel} ${row.oalLabel} ${row.angle} ${row.standard}`,
        q,
      ),
    );
  }, [isMetric, q]);

  const showTwist = section !== "center";
  const showCenter = section !== "twist";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1B2E1C]">Drill Chart</h2>
          <p className="text-xs text-[#4A5B4B]">
            Twist drills and 60° center drills. {isMetric ? "DIN 333 Form A" : "ANSI B94.11M"}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-[#B7C9B8] bg-white p-4 shadow-xs sm:p-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#1B2E1C]">
            Measurement Units
          </label>
          <div className="flex gap-2">
            {[
              { id: Units.INCH, label: "Imperial (in)" },
              { id: Units.METRIC, label: "Metric (mm)" },
            ].map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setUnits(u.id);
                  setSeriesFilter("all");
                }}
                className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  units === u.id
                    ? "border-[#2E7D32] bg-[#E8F5E9] text-[#1B5E20] shadow-xs"
                    : "border-[#D7E6D8] bg-white text-[#4A5B4B] hover:bg-[#F7FBF7]"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#1B2E1C]">
            Show
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "all" as const, label: "All" },
                { id: "twist" as const, label: "Twist drills" },
                { id: "center" as const, label: "Center drills" },
              ]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSection(opt.id)}
                className={`min-h-11 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  section === opt.id
                    ? "border-[#2E7D32] bg-[#2E7D32] text-white"
                    : "border-[#D7E6D8] bg-white text-[#4A5B4B] hover:bg-[#E8F5E9]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {!isMetric && showTwist && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#1B2E1C]">
              Imperial series
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all" as const, label: "All series" },
                  { id: "fractional" as const, label: "Fractional" },
                  { id: "number" as const, label: "Number" },
                  { id: "letter" as const, label: "Letter" },
                ]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSeriesFilter(opt.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                    seriesFilter === opt.id
                      ? "border-[#2E7D32] bg-[#E8F5E9] text-[#1B5E20]"
                      : "border-[#D7E6D8] bg-white text-[#4A5B4B] hover:bg-[#F7FBF7]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="drill-chart-find" className="mb-1.5 block text-xs font-semibold text-[#1B2E1C]">
            Find size
          </label>
          <input
            id="drill-chart-find"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isMetric ? "e.g. 6.8 or 3.15" : 'e.g. #7, F, or 1/4"'}
            className="min-h-11 w-full rounded-lg border border-[#B7C9B8] bg-[#F7FBF7] px-3 py-2 text-sm text-[#1B2E1C] focus:border-transparent focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
          />
        </div>
      </div>

      <div className="max-h-[min(36rem,calc(100dvh-16rem))] overflow-auto rounded-xl border border-[#B7C9B8] bg-white shadow-xs">
        {showTwist && (
          <TwistTable rows={twist} isMetric={isMetric} />
        )}
        {showCenter && (
          <CenterTable rows={centers} isMetric={isMetric} />
        )}
        {showTwist && twist.length === 0 && showCenter && centers.length === 0 && (
          <p className="p-4 text-sm text-[#4A5B4B]">No sizes match that search.</p>
        )}
        {showTwist && !showCenter && twist.length === 0 && (
          <p className="p-4 text-sm text-[#4A5B4B]">No twist drills match that search.</p>
        )}
        {showCenter && !showTwist && centers.length === 0 && (
          <p className="p-4 text-sm text-[#4A5B4B]">No center drills match that search.</p>
        )}
      </div>
    </div>
  );
};

function TwistTable({ rows, isMetric }: { rows: TwistDrill[]; isMetric: boolean }) {
  if (rows.length === 0) return null;
  return (
    <table className="w-full min-w-[22rem] border-collapse text-left text-xs">
      <caption className="sticky top-0 z-20 bg-[#2E7D32] px-3 py-2 text-left text-[11px] font-bold tracking-wider text-white uppercase">
        Twist drills · {rows.length} sizes
      </caption>
      <thead className="sticky top-8 z-10 bg-[#E8F5E9] text-[#1B5E20]">
        <tr>
          <th className="px-3 py-2 font-bold">Size</th>
          <th className="px-3 py-2 font-bold">Series</th>
          <th className="px-3 py-2 font-bold">{isMetric ? "mm" : "Decimal in"}</th>
          <th className="px-3 py-2 font-bold">{isMetric ? "Decimal in" : "mm"}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={`${row.series}-${row.size}`}
            className="odd:bg-white even:bg-[#F7FBF7]"
          >
            <td className="px-3 py-2.5 font-semibold whitespace-nowrap text-[#1B2E1C]">
              {row.size}
            </td>
            <td className="px-3 py-2.5 text-[#4A5B4B]">{seriesLabel(row.series)}</td>
            <td className="px-3 py-2.5 font-mono text-[#1B2E1C]">
              {isMetric ? formatMm(row.mm) : formatInch(row.inch)}
            </td>
            <td className="px-3 py-2.5 font-mono text-[#4A5B4B]">
              {isMetric ? formatInch(row.inch) : formatMm(row.mm)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CenterTable({ rows, isMetric }: { rows: CenterDrill[]; isMetric: boolean }) {
  if (rows.length === 0) return null;
  return (
    <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
      <caption className="sticky top-0 z-20 bg-[#1B5E20] px-3 py-2 text-left text-[11px] font-bold tracking-wider text-white uppercase">
        Center drills · {isMetric ? "DIN 333 Form A" : "ANSI B94.11M plain"} · 60°
      </caption>
      <thead className="sticky top-8 z-10 bg-[#E8F5E9] text-[#1B5E20]">
        <tr>
          <th className="px-3 py-2 font-bold">Size</th>
          <th className="px-3 py-2 font-bold">Pilot / drill</th>
          <th className="px-3 py-2 font-bold">Body</th>
          <th className="px-3 py-2 font-bold">Drill length</th>
          <th className="px-3 py-2 font-bold">Overall</th>
          <th className="px-3 py-2 font-bold">Angle</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.standard}-${row.size}`} className="odd:bg-white even:bg-[#F7FBF7]">
            <td className="px-3 py-2.5 font-semibold whitespace-nowrap text-[#1B2E1C]">
              {isMetric ? row.size : `#${row.size}`}
            </td>
            <td className="px-3 py-2.5 whitespace-nowrap text-[#1B2E1C]">
              {isMetric ? row.pilotLabel : `${row.pilotLabel} (${formatMm(row.pilotInch * 25.4)} mm)`}
            </td>
            <td className="px-3 py-2.5 whitespace-nowrap text-[#1B2E1C]">
              {isMetric ? row.bodyLabel : `${row.bodyLabel} (${formatMm(row.bodyInch * 25.4)} mm)`}
            </td>
            <td className="px-3 py-2.5 whitespace-nowrap text-[#4A5B4B]">
              {row.drillLengthLabel}
            </td>
            <td className="px-3 py-2.5 whitespace-nowrap text-[#4A5B4B]">
              {row.oalLabel}
            </td>
            <td className="px-3 py-2.5 text-[#4A5B4B]">{row.angle}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
