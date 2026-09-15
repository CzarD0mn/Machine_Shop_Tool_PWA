import React from 'react';
import { AppTab } from '../types';
import { Wrench } from 'lucide-react';

interface HeaderProps {
  currentTab: AppTab;
}

export const Header: React.FC<HeaderProps> = ({ currentTab }) => {
  const subtitle = React.useMemo(() => {
    switch (currentTab) {
      case AppTab.FEEDS:
        return 'Speeds, feeds, and shop notes';
      case AppTab.LOG:
        return 'Track setup and production by job';
      case AppTab.PROGRAMS:
        return 'Find CNC programs by machine or part';
      case AppTab.SETTINGS:
        return 'Backup, export, and preferences';
      default:
        return 'Speeds, feeds, and shop notes';
    }
  }, [currentTab]);

  return (
    <header className="w-full bg-[#E8F5E9] border-b border-[#B7C9B8] px-4 py-3 sm:px-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2E7D32] flex items-center justify-center text-white shadow-xs">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#1B2E1C] tracking-tight leading-tight">
              The Machinist Helper
            </h1>
            <p className="text-xs sm:text-sm text-[#4A5B4B] font-medium">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
