import React from "react";
import { AppTab } from "../types";
import { ClipboardList, Code, Settings, Wrench } from "lucide-react";

interface BottomBarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  opCount?: number;
  programCount?: number;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  currentTab,
  onSelectTab,
  opCount = 0,
  programCount = 0,
}) => {
  const tabs = [
    {
      id: AppTab.LOG,
      label: "Op Log",
      icon: ClipboardList,
      badge: opCount > 0 ? opCount : undefined,
    },
    {
      id: AppTab.PROGRAMS,
      label: "Programs",
      icon: Code,
      badge: programCount > 0 ? programCount : undefined,
    },
    {
      id: AppTab.FEEDS,
      label: "Tools",
      icon: Wrench,
    },
    {
      id: AppTab.SETTINGS,
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#B7C9B8] bg-[#F7FBF7] px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:pt-2">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex min-h-11 flex-col items-center justify-center rounded-xl px-2 py-1.5 transition-all duration-150 ${
                isActive
                  ? "bg-[#E8F5E9] font-semibold text-[#2E7D32] shadow-xs"
                  : "text-[#4A5B4B] hover:bg-[#E8F5E9]/50 hover:text-[#1B2E1C]"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`}
                />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-3 min-w-4 rounded-full bg-[#2E7D32] px-1.5 text-center text-[10px] leading-tight font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 max-w-[70px] truncate text-[11px] tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
