import React from "react";
import { AppTab } from "../types";
import { Wrench } from "lucide-react";
import { ConnectionBadge } from "./ConnectionBadge";

interface HeaderProps {
  currentTab: AppTab;
}

export const Header: React.FC<HeaderProps> = ({ currentTab }) => {
  const subtitle = React.useMemo(() => {
    switch (currentTab) {
      case AppTab.FEEDS:
        return "Speeds, feeds, and shop notes";
      case AppTab.LOG:
        return "Track setup and production by job";
      case AppTab.PROGRAMS:
        return "Find CNC programs by machine or part";
      case AppTab.SETTINGS:
        return "Offline cache, backup, and preferences";
      default:
        return "Speeds, feeds, and shop notes";
    }
  }, [currentTab]);

  return (
    <header className="w-full border-b border-[#B7C9B8] bg-[#E8F5E9] px-4 py-3 transition-colors duration-200 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2E7D32] text-white shadow-xs">
            <Wrench className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg leading-tight font-bold tracking-tight text-[#1B2E1C] sm:text-xl">
              The Machinist Helper
            </h1>
            <p className="truncate text-xs font-medium text-[#4A5B4B] sm:text-sm">
              {subtitle}
            </p>
          </div>
        </div>
        <ConnectionBadge />
      </div>
    </header>
  );
};
