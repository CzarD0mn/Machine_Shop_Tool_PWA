import React, { useMemo, useState } from "react";
import { Units } from "../types";
import { formatInch, formatMm } from "../data/drillChart";
import {
  IMPERIAL_FORM_TAPS,
  IMPERIAL_TAPS,
  METRIC_FORM_TAPS,
  METRIC_TAPS,
  TapRow,
  tapDrillMm,
  tapMinorMm,
  tapSeriesLabel,
} from "../data/tapChart";

type ImperialSeriesFilter = "all" | "UNC" | "UNF";
type MetricSeriesFilter = "all" | "METRIC_COARSE" | "METRIC_FINE";

function matchesQuery(haystack: string, query: string) {
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}

export const TapChartTab: React.FC<{ variant?: "cut" | "form" }> = ({
  variant = "cut",
}) => {
  const [units, setUnits] = useState<Units>(Units.INCH);
  const [imperialSeries, setImperialSeries] =
    useState<ImperialSeriesFilter>("all");
  const [metricSeries, setMetricSeries] = useState<MetricSeriesFilter>("all");
  const [query, setQuery] = useState("");

  const isMetric = units === Units.METRIC;
  const isForm = variant === "form";
  const q = query.trim().toLowerCase();

  const rows = useMemo(() => {
    const source = isMetric
      ? isForm
        ? METRIC_FORM_TAPS
        : METRIC_TAPS
      : isForm
        ? IMPERIAL_FORM_TAPS
        : IMPERIAL_TAPS;
    return source.filter((row) => {
      if (!isMetric && imperialSeries !== "all" && row.series !== imperialSeries) {
        return false;
      }
      if (isMetric && metricSeries !== "all" && row.series !== metricSeries) {
        return false;
      }
      return matchesQuery(
        `${row.size} ${tapSeriesLabel(row.series)} ${row.aliases ?? ""} ${row.pitchLabel} ${row.majorLabel} ${formatInch(row.minorInch)} ${row.drillLabel} ${formatInch(row.drillInch)} ${formatMm(tapDrillMm(row))}`,
        q,
      );
    });
  }, [isMetric, isForm, imperialSeries, metricSeries, q]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#1B2E1C]">
          {isForm ? "Form Tap Chart" : "Cut Tap Chart"}
        </h2>
        <p className="text-xs text-[#4A5B4B]">
          {isForm
            ? "Roll/form taps at ~65% thread. Ductile material only — no chips. "
            : "Cutting taps and matching tap drills at ~75% thread. "}
          {isMetric ? "ISO metric coarse and fine" : "UNC and UNF"}
        </p>
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
                onClick={() => setUnits(u.id)}
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
            Thread series
          </label>
          <div className="flex flex-wrap gap-1.5">
            {isMetric
              ? (
                  [
                    { id: "all" as const, label: "All" },
                    { id: "METRIC_COARSE" as const, label: "Coarse" },
                    { id: "METRIC_FINE" as const, label: "Fine" },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMetricSeries(opt.id)}
                    className={`min-h-11 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      metricSeries === opt.id
                        ? "border-[#2E7D32] bg-[#2E7D32] text-white"
                        : "border-[#D7E6D8] bg-white text-[#4A5B4B] hover:bg-[#E8F5E9]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))
              : (
                  [
                    { id: "all" as const, label: "All" },
                    { id: "UNC" as const, label: "UNC" },
                    { id: "UNF" as const, label: "UNF" },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setImperialSeries(opt.id)}
                    className={`min-h-11 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      imperialSeries === opt.id
                        ? "border-[#2E7D32] bg-[#2E7D32] text-white"
                        : "border-[#D7E6D8] bg-white text-[#4A5B4B] hover:bg-[#E8F5E9]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
          </div>
        </div>

        <div>
          <label
            htmlFor={isForm ? "form-tap-chart-find" : "tap-chart-find"}
            className="mb-1.5 block text-xs font-semibold text-[#1B2E1C]"
          >
            Find size
          </label>
          <input
            id={isForm ? "form-tap-chart-find" : "tap-chart-find"}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isMetric ? "e.g. M6 or 5.5" : 'e.g. 1/4-20 or #1'}
            className="min-h-11 w-full rounded-lg border border-[#B7C9B8] bg-[#F7FBF7] px-3 py-2 text-sm text-[#1B2E1C] focus:border-transparent focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
          />
        </div>
      </div>

      <div className="max-h-[min(36rem,calc(100dvh-16rem))] overflow-auto rounded-xl border border-[#B7C9B8] bg-white shadow-xs">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-[#4A5B4B]">No taps match that search.</p>
        ) : (
          <TapTable rows={rows} isMetric={isMetric} isForm={isForm} />
        )}
      </div>
    </div>
  );
};

function TapTable({
  rows,
  isMetric,
  isForm,
}: {
  rows: TapRow[];
  isMetric: boolean;
  isForm: boolean;
}) {
  return (
    <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
      <caption className="sticky top-0 z-20 bg-[#2E7D32] px-3 py-2 text-left text-[11px] font-bold tracking-wider text-white uppercase">
        {isForm ? "Form tap drills · ~65% thread" : "Cut tap drills · ~75% thread"}{" "}
        · {rows.length} sizes
      </caption>
      <thead className="sticky top-8 z-10 bg-[#E8F5E9] text-[#1B5E20]">
        <tr>
          <th className="px-3 py-2 font-bold">Tap</th>
          <th className="px-3 py-2 font-bold">Series</th>
          <th className="px-3 py-2 font-bold">Major</th>
          <th className="px-3 py-2 font-bold">Minor</th>
          <th className="px-3 py-2 font-bold">Tap drill</th>
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
            <td className="px-3 py-2.5 text-[#4A5B4B]">
              {tapSeriesLabel(row.series)}
            </td>
            <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[#4A5B4B]">
              {isMetric ? row.majorLabel : `${formatInch(row.majorInch)}"`}
            </td>
            <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[#4A5B4B]">
              {isMetric
                ? `${formatMm(tapMinorMm(row))} mm`
                : `${formatInch(row.minorInch)}"`}
            </td>
            <td className="px-3 py-2.5 font-semibold whitespace-nowrap text-[#1B5E20]">
              {row.drillLabel}
            </td>
            <td className="px-3 py-2.5 font-mono text-[#1B2E1C]">
              {isMetric
                ? formatMm(tapDrillMm(row))
                : formatInch(row.drillInch)}
            </td>
            <td className="px-3 py-2.5 font-mono text-[#4A5B4B]">
              {isMetric
                ? formatInch(row.drillInch)
                : formatMm(tapDrillMm(row))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
