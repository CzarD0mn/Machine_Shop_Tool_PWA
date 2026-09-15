import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import {
  getNetworkState,
  NetworkState,
  startNetworkMonitor,
  subscribeNetwork,
} from "../lib/network";

export function ConnectionBadge() {
  const [state, setState] = useState<NetworkState>(() =>
    typeof navigator !== "undefined" && navigator.onLine === false
      ? "offline"
      : getNetworkState(),
  );

  useEffect(() => {
    startNetworkMonitor();
    return subscribeNetwork((next) => setState(next));
  }, []);

  const online = state === "online";
  const checking = state === "checking";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        online
          ? "border-[#C8E6C9] bg-white text-[#1B5E20]"
          : checking
            ? "border-[#C8E6C9] bg-[#E8F5E9] text-[#1B5E20]"
            : "border-amber-300 bg-amber-50 text-amber-900"
      }`}
    >
      {online || checking ? (
        <Wifi className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}
      {online ? "Online" : checking ? "Reconnecting" : "Offline"}
    </span>
  );
}
