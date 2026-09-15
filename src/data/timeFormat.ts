import { ClockStamp, OperationEntry, PartTimeAverage } from '../types';

export function nowStamp(): ClockStamp {
  const now = new Date();
  const epochMillis = now.getTime();

  let zoneId = 'UTC';
  try {
    zoneId = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (_) {
    // fallback
  }

  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
  const mins = String(absMinutes % 60).padStart(2, '0');
  const zoneOffset = `${sign}${hours}:${mins}`;

  return {
    epochMillis,
    zoneId,
    zoneOffset,
  };
}

export function displayStamp(stamp: ClockStamp | null): string {
  if (!stamp) return '—';
  const d = new Date(stamp.epochMillis);
  const optionsDate: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const optionsTime: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };
  const dateStr = d.toLocaleDateString(undefined, optionsDate);
  const timeStr = d.toLocaleTimeString(undefined, optionsTime);

  let timeZoneShort = '';
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZoneName: 'short',
    }).formatToParts(d);
    timeZoneShort = parts.find((p) => p.type === 'timeZoneName')?.value || '';
  } catch (_) {
    timeZoneShort = '';
  }

  const tzPart = timeZoneShort ? `  ${timeZoneShort}` : '';
  const offsetPart = stamp.zoneOffset ? `  ${stamp.zoneOffset}` : '';
  const idPart = stamp.zoneId ? `  ${stamp.zoneId}` : '';

  return `${dateStr}  ${timeStr}${tzPart}${offsetPart}${idPart}`;
}

export function displayForExport(stamp: ClockStamp | null): string {
  if (!stamp) return '';
  const d = new Date(stamp.epochMillis);
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return `${dateStr}  ${timeStr}`;
}

export function formatElapsed(millis: number | null): string {
  if (millis === null || isNaN(millis)) return '—';
  const hours = Math.max(0, millis) / 3600000.0;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded.toFixed(1)} hr`;
}

export function spanMillis(
  start: ClockStamp | null,
  end: ClockStamp | null
): number | null {
  if (!start || !end) return null;
  if (end.epochMillis < start.epochMillis) return null;
  return end.epochMillis - start.epochMillis;
}

export function setupMillis(entry: OperationEntry): number | null {
  return spanMillis(entry.startSetup, entry.endSetup);
}

export function productionMillis(entry: OperationEntry): number | null {
  return spanMillis(entry.startProduction, entry.endProduction);
}

export function totalMillis(entry: OperationEntry): number | null {
  const s = setupMillis(entry);
  const p = productionMillis(entry);
  if (s === null && p === null) return null;
  return (s || 0) + (p || 0);
}

export function formatLastRanDate(epochMillis: number | null): string {
  if (!epochMillis || epochMillis <= 0) return 'No run history';
  const d = new Date(epochMillis);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function averagePartTimes(
  entries: OperationEntry[],
  query: string
): PartTimeAverage[] {
  const cleanQuery = query.trim().toLowerCase();
  const byPart = new Map<string, OperationEntry[]>();

  for (const entry of entries) {
    const part = entry.partNumber.trim();
    if (!part) continue;
    const key = part.toUpperCase();
    if (!byPart.has(key)) {
      byPart.set(key, []);
    }
    byPart.get(key)!.push(entry);
  }

  const results: PartTimeAverage[] = [];

  for (const [key, partEntries] of byPart.entries()) {
    const displayPart = partEntries[0]?.partNumber || key;
    if (cleanQuery && !displayPart.toLowerCase().includes(cleanQuery)) {
      continue;
    }

    const uniqueOrders = new Set(
      partEntries.map((e) => e.shopOrder.trim()).filter(Boolean)
    );
    const shopOrderCount = uniqueOrders.size || partEntries.length;

    let setupSum = 0;
    let setupCount = 0;
    let prodSum = 0;
    let prodCount = 0;
    let totalSum = 0;
    let totalCount = 0;
    let latestRanMillis: number | null = null;
    let latestZoneId: string | null = null;

    for (const entry of partEntries) {
      const s = setupMillis(entry);
      if (s !== null) {
        setupSum += s;
        setupCount++;
      }
      const p = productionMillis(entry);
      if (p !== null) {
        prodSum += p;
        prodCount++;
      }
      const t = totalMillis(entry);
      if (t !== null) {
        totalSum += t;
        totalCount++;
      }

      const stamps = [
        entry.endProduction,
        entry.startProduction,
        entry.endSetup,
        entry.startSetup,
      ].filter(Boolean) as ClockStamp[];

      for (const st of stamps) {
        if (!latestRanMillis || st.epochMillis > latestRanMillis) {
          latestRanMillis = st.epochMillis;
          latestZoneId = st.zoneId;
        }
      }

      if (!latestRanMillis && entry.updatedAt > 0) {
        if (!latestRanMillis || entry.updatedAt > latestRanMillis) {
          latestRanMillis = entry.updatedAt;
        }
      }
    }

    results.push({
      partNumber: displayPart,
      shopOrderCount,
      setupMillis: setupCount > 0 ? setupSum / setupCount : null,
      productionMillis: prodCount > 0 ? prodSum / prodCount : null,
      totalMillis: totalCount > 0 ? totalSum / totalCount : null,
      lastRanMillis: latestRanMillis,
      lastRanZoneId: latestZoneId,
    });
  }

  return results.sort((a, b) => (b.lastRanMillis || 0) - (a.lastRanMillis || 0));
}
