import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#37474F] px-3 py-1.5 text-xs font-medium text-white shadow-lg border border-[#546E7A] animate-fade-in">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      <span>Offline Mode — All calculator features, materials, and logs are functional offline.</span>
    </div>
  );
};
