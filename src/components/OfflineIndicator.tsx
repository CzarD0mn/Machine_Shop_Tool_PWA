import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import {
  getNetworkState,
  startNetworkMonitor,
  subscribeNetwork,
} from "../lib/network";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(
    () => getNetworkState() === "offline",
  );

  useEffect(() => {
    startNetworkMonitor();
    return subscribeNetwork((next) => setOffline(next === "offline"));
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-[4.75rem] left-4 z-50 mr-4 flex max-w-sm items-start gap-2 rounded-lg border border-[#546E7A] bg-[#37474F] px-3 py-2 text-xs font-medium text-white shadow-lg">
      <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
      <span>
        Offline mode — speeds & feeds, logs, and backups stay on this device.
        Network push resumes by itself when signal returns.
      </span>
    </div>
  );
}
