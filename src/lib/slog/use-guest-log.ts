import { useCallback, useMemo, useState } from "react";
import { buildDemoSnapshot, emptySnapshot } from "./demo-data";
import { toISODate } from "./calendar";
import type { LogSnapshot } from "./types";

const KEY = "slog-guest-sheets";

function cloneSnap(s: LogSnapshot): LogSnapshot {
  return {
    ...s,
    settings: { ...s.settings },
    days: { ...s.days },
    entries: Object.fromEntries(Object.entries(s.entries).map(([k, v]) => [k, [...v]])),
    images: Object.fromEntries(Object.entries(s.images ?? {}).map(([k, v]) => [k, [...v]])),
    notes: [...s.notes],
    spans: [...s.spans],
  };
}

function loadAll(): Record<string, LogSnapshot> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LogSnapshot>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, LogSnapshot>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // quota — keep in memory only
  }
}

export function useGuestLog(sheetKey: string) {
  const [bySheet, setBySheet] = useState<Record<string, LogSnapshot>>(() => loadAll());

  const snap = useMemo(() => {
    if (bySheet[sheetKey]) return bySheet[sheetKey];
    return emptySnapshot(sheetKey, toISODate(new Date()));
  }, [bySheet, sheetKey]);

  const setSnap = useCallback(
    (updater: (prev: LogSnapshot) => LogSnapshot) => {
      setBySheet((prev) => {
        const current = prev[sheetKey] ?? emptySnapshot(sheetKey, toISODate(new Date()));
        const next = { ...prev, [sheetKey]: updater(cloneSnap(current)) };
        saveAll(next);
        return next;
      });
    },
    [sheetKey],
  );

  return {
    snap,
    isPending: false,
    setSnap,
    importDemo: () => {
      setBySheet((p) => {
        const next = { ...p, "2024-H2": buildDemoSnapshot() };
        saveAll(next);
        return next;
      });
    },
  };
}
