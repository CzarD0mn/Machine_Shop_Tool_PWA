type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    StatusBar?: {
      setBackgroundColor?: (opts: { color: string }) => Promise<void>;
      setStyle?: (opts: { style: string }) => Promise<void>;
    };
    SplashScreen?: { hide?: () => Promise<void> };
    App?: {
      addListener?: (
        event: string,
        cb: () => void,
      ) => Promise<{ remove: () => void }> | { remove: () => void };
    };
  };
};

function getCapacitor(): CapacitorBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
}

export function isNativeAndroid(): boolean {
  const cap = getCapacitor();
  if (cap?.isNativePlatform?.()) {
    return cap.getPlatform?.() === "android" || cap.isNativePlatform();
  }
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return ua.includes("Capacitor") || /; wv\)/.test(ua);
}

export async function bootNativeAndroid() {
  const plugins = getCapacitor()?.Plugins;
  if (!plugins) return;
  try {
    await plugins.StatusBar?.setBackgroundColor?.({ color: "#1B5E20" });
    await plugins.StatusBar?.setStyle?.({ style: "DARK" });
  } catch {
    /* running on web */
  }
  try {
    await plugins.SplashScreen?.hide?.();
  } catch {
    /* running on web */
  }
}
