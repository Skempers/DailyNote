import { loadLifeMap, loadYear } from "@/lib/slog/api";
import type { DayDraft } from "./editor";
import { LogWorkspace } from "./workspace";
import { remoteSearch, useLiveLog } from "@/lib/slog/use-live-log";
import { localSearch } from "@/lib/slog/use-demo-log";
import type { LogEntry, LogImage, LogSnapshot } from "@/lib/slog/types";

export function LiveLogWorkspace({
  sheetKey,
  onSheetChange,
}: {
  sheetKey: string;
  onSheetChange: (key: string) => void;
}) {
  const live = useLiveLog(sheetKey);
  return (
    <LogWorkspace
      sheetKey={sheetKey}
      onSheetChange={onSheetChange}
      adapter={{
        snap: live.snap,
        pending: live.isPending,
        draftNs: "live",
        patchSnap: live.patchSnap,
        saveDay: async (d: DayDraft) => {
          const savedDay = await live.saveDay(d.day);
          const savedEntries: LogEntry[] = [];
          for (const e of d.entries) {
            savedEntries.push(await live.saveEntry(e));
          }
          const savedTodos = await live.saveTodos({ date: savedDay.date, todos: d.todos ?? [] });
          live.patchSnap((s: LogSnapshot) => ({
            ...s,
            days: { ...s.days, [savedDay.date]: savedDay },
            entries: { ...s.entries, [savedDay.date]: savedEntries },
            todos: { ...(s.todos ?? {}), [savedDay.date]: savedTodos },
          }));
        },
        deleteEntry: async (id) => {
          await live.deleteEntry(id);
        },
        saveImage: async (img: LogImage) => {
          const saved = await live.saveImage(img);
          live.patchSnap((s) => {
            const list = [...(s.images?.[img.date] ?? [])];
            const idx = list.findIndex((x) => x.id === img.id || x.id === saved.id);
            if (idx >= 0) list[idx] = saved;
            else list.push(saved);
            return { ...s, images: { ...(s.images ?? {}), [img.date]: list } };
          });
          return saved;
        },
        deleteImage: async (id) => {
          await live.deleteImage(id);
        },
        loadDayImages: live.loadDayImages,
        loadYear: (year) => loadYear({ data: year }),
        loadLife: () => loadLifeMap(),
        saveNote: async (n) => {
          const saved = await live.saveNote(n);
          live.patchSnap((s) => {
            const idx = s.notes.findIndex((x) => x.id === n.id || x.id === saved.id);
            const notes = [...s.notes];
            if (idx >= 0) notes[idx] = saved;
            else notes.push(saved);
            return { ...s, notes };
          });
        },
        deleteNote: async (id) => {
          await live.deleteNote(id);
        },
        saveSpan: async (s) => {
          const saved = await live.saveSpan(s);
          live.patchSnap((prev) => ({ ...prev, spans: [...prev.spans.filter((x) => x.id !== saved.id), saved] }));
        },
        search: async (q) => {
          if (!q.trim()) return [];
          try {
            return await remoteSearch(q);
          } catch {
            return live.snap ? localSearch(live.snap, q) : [];
          }
        },
      }}
    />
  );
}
