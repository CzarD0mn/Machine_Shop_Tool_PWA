import React from 'react';
import { AppTab } from '../types';
import { Calculator, ClipboardList, Code, Settings } from 'lucide-react';

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
      label: 'Op Log',
      icon: ClipboardList,
      badge: opCount > 0 ? opCount : undefined,
    },
    {
      id: AppTab.PROGRAMS,
      label: 'Programs',
      icon: Code,
      badge: programCount > 0 ? programCount : undefined,
    },
    {
      id: AppTab.FEEDS,
      label: 'Calc',
      icon: Calculator,
    },
    {
      id: AppTab.SETTINGS,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#F7FBF7] border-t border-[#B7C9B8] px-2 py-1 sm:py-2">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-150 relative ${
                isActive
                  ? 'bg-[#E8F5E9] text-[#2E7D32] font-semibold shadow-xs'
                  : 'text-[#4A5B4B] hover:text-[#1B2E1C] hover:bg-[#E8F5E9]/50'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-3 text-[10px] font-bold px-1.5 py-0.2 bg-[#2E7D32] text-white rounded-full leading-tight min-w-[16px] text-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight truncate max-w-[70px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
