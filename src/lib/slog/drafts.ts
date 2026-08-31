import type { DayRecord, LogEntry } from "./types";

export type DraftPayload = {
  updatedAt: number;
  day: DayRecord;
  entries: LogEntry[];
};

function key(ns: string, iso: string) {
  return `slog-draft:${ns}:${iso}`;
}

export function readDraft(ns: string, iso: string): DraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(ns, iso));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (!parsed?.day || typeof parsed.updatedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDraft(ns: string, iso: string, payload: Omit<DraftPayload, "updatedAt">) {
  if (typeof window === "undefined") return;
  try {
    const data: DraftPayload = { ...payload, updatedAt: Date.now() };
    localStorage.setItem(key(ns, iso), JSON.stringify(data));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearDraft(ns: string, iso: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key(ns, iso));
  } catch {
    /* ignore */
  }
}

export function preferDraft(server: DayRecord | undefined, draft: DraftPayload | null): DayRecord | undefined {
  if (!draft) return server;
  if (!server) return draft.day;
  const serverJournal = (server.journal ?? "").trim();
  const draftJournal = (draft.day.journal ?? "").trim();
  if (!serverJournal && draftJournal) return { ...server, ...draft.day, id: server.id };
  if (draftJournal.length > serverJournal.length + 8 && Date.now() - draft.updatedAt < 1000 * 60 * 60 * 24) {
    return { ...server, ...draft.day, id: server.id };
  }
  return server;
}
