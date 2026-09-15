import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ShopTool } from "../types";
import { UxPrefs } from "../data/storage";
import { CalcTab } from "./CalcTab";
import { DrillChartTab } from "./DrillChartTab";
import { TapChartTab } from "./TapChartTab";
import { StiChartTab } from "./StiChartTab";

const SHOP_TOOLS: { id: ShopTool; label: string; detail: string }[] = [
  {
    id: ShopTool.SPEEDS_FEEDS,
    label: "Speeds & Feeds",
    detail: "Spindle RPM and table feed for mill, drill, and turn",
  },
  {
    id: ShopTool.DRILL_CHART,
    label: "Drill Chart",
    detail: "Imperial and metric twist drills plus 60° center drill dimensions",
  },
  {
    id: ShopTool.TAP_CHART,
    label: "Cut Tap Chart",
    detail: "Imperial and metric cutting taps with matching tap drill sizes",
  },
  {
    id: ShopTool.FORM_TAP_CHART,
    label: "Form Tap Chart",
    detail: "Roll/form taps with larger ~65% thread drills — ductile material only",
  },
  {
    id: ShopTool.STI_CHART,
    label: "Helicoil Tap Chart",
    detail: "Insert tap drills for Heli-Coil and other screw-thread inserts",
  },
];

export const ToolsTab: React.FC = () => {
  const [tool, setTool] = useState<ShopTool>(() => {
    const saved = UxPrefs.load().lastShopTool;
    return Object.values(ShopTool).includes(saved)
      ? saved
      : ShopTool.SPEEDS_FEEDS;
  });

  const selected = useMemo(
    () => SHOP_TOOLS.find((item) => item.id === tool) ?? SHOP_TOOLS[0],
    [tool],
  );

  const handleChange = (next: ShopTool) => {
    setTool(next);
    UxPrefs.save({ lastShopTool: next });
  };

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 sm:p-6">
      <div className="mb-5 rounded-xl border border-[#B7C9B8] bg-white p-4 shadow-xs sm:p-5">
        <label
          htmlFor="shop-tool-select"
          className="block text-xs font-bold tracking-wider text-[#2E7D32] uppercase"
        >
          Shop tool
        </label>
        <div className="relative mt-2">
          <select
            id="shop-tool-select"
            value={tool}
            onChange={(e) => handleChange(e.target.value as ShopTool)}
            className="min-h-11 w-full appearance-none rounded-lg border border-[#B7C9B8] bg-[#F7FBF7] py-2.5 pr-10 pl-3 text-sm font-semibold text-[#1B2E1C] focus:border-transparent focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
          >
            {SHOP_TOOLS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#2E7D32]" />
        </div>
        <p className="mt-2 text-xs text-[#4A5B4B]">{selected.detail}</p>
      </div>

      {tool === ShopTool.SPEEDS_FEEDS && <CalcTab embedded />}
      {tool === ShopTool.DRILL_CHART && <DrillChartTab />}
      {tool === ShopTool.TAP_CHART && <TapChartTab />}
      {tool === ShopTool.FORM_TAP_CHART && <TapChartTab variant="form" />}
      {tool === ShopTool.STI_CHART && <StiChartTab />}
    </div>
  );
};
