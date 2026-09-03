import { useCallback, useMemo, useState } from "react";
import { buildDemoSnapshot, emptySnapshot } from "./demo-data";
import { toISODate } from "./calendar";
import type { LogSnapshot, SearchHit } from "./types";

function cloneSnap(s: LogSnapshot): LogSnapshot {
  return {
    ...s,
    settings: { ...s.settings },
    days: { ...s.days },
    entries: Object.fromEntries(Object.entries(s.entries).map(([k, v]) => [k, [...v]])),
    images: Object.fromEntries(Object.entries(s.images ?? {}).map(([k, v]) => [k, [...v]])),
    todos: Object.fromEntries(Object.entries(s.todos ?? {}).map(([k, v]) => [k, [...v]])),
    notes: [...s.notes],
    spans: [...s.spans],
  };
}

export function useDemoLog(sheetKey: string) {
  const [bySheet, setBySheet] = useState<Record<string, LogSnapshot>>(() => ({
    "2024-H2": buildDemoSnapshot(),
  }));

  const snap = useMemo(() => {
    if (bySheet[sheetKey]) return bySheet[sheetKey];
    return emptySnapshot(sheetKey, toISODate(new Date()));
  }, [bySheet, sheetKey]);

  const setSnap = useCallback(
    (updater: (prev: LogSnapshot) => LogSnapshot) => {
      setBySheet((prev) => {
        const current = prev[sheetKey] ?? emptySnapshot(sheetKey, toISODate(new Date()));
        return { ...prev, [sheetKey]: updater(cloneSnap(current)) };
      });
    },
    [sheetKey],
  );

  return {
    snap,
    isPending: false,
    setSnap,
    importDemo: () => {
      setBySheet((p) => ({ ...p, "2024-H2": buildDemoSnapshot() }));
    },
  };
}

export function localSearch(snap: LogSnapshot, q: string): SearchHit[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: SearchHit[] = [];
  for (const list of Object.values(snap.entries)) {
    for (const e of list) {
      if (e.body.toLowerCase().includes(needle)) {
        hits.push({ id: e.id, date: e.date, kind: "entry", title: e.body, snippet: e.kind });
      }
    }
  }
  for (const n of snap.notes) {
    if ((n.title + n.body).toLowerCase().includes(needle)) {
      hits.push({
        id: n.id,
        date: n.weekStart ?? snap.sheetKey,
        kind: "note",
        title: n.title || n.body.slice(0, 24),
        snippet: n.body.slice(0, 80),
      });
    }
  }
  for (const d of Object.values(snap.days)) {
    if (`${d.location} ${d.headerNote} ${d.journal}`.toLowerCase().includes(needle)) {
      hits.push({
        id: d.id,
        date: d.date,
        kind: "day",
        title: d.headerNote || d.location || d.journal.slice(0, 24),
        snippet: [d.location, d.headerNote, d.journal.slice(0, 60)].filter(Boolean).join(" · "),
      });
    }
  }
  for (const s of snap.spans) {
    if (s.label.toLowerCase().includes(needle)) {
      hits.push({ id: s.id, date: s.startDate, kind: "span", title: s.label, snippet: "时段" });
    }
  }
  return hits.slice(0, 30);
}

export function defaultSelected(snap: LogSnapshot | undefined) {
  if (!snap) return toISODate(new Date());
  const today = toISODate(new Date());
  if (snap.days[today] || snap.entries[today] || (snap.images?.[today]?.length ?? 0)) return today;
  const dates = Object.keys(snap.days).sort();
  return dates[Math.floor(dates.length / 2)] ?? today;
}
