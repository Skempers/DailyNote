import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ensureSeeded,
  importDemoSheet,
  loadDayImages,
  loadSheet,
  removeEntry,
  removeImage,
  removeNote,
  searchLog,
  upsertDay,
  upsertEntry,
  upsertImage,
  upsertNote,
  upsertSpan,
} from "./api";
import type { DayRecord, LogEntry, LogImage, LogNote, LogSnapshot, LogSpan, SearchHit } from "./types";

export function useLiveLog(sheetKey: string) {
  const qc = useQueryClient();
  const qk = ["slog", sheetKey] as const;

  const query = useQuery({
    queryKey: qk,
    queryFn: async () => {
      await ensureSeeded({ data: sheetKey });
      return loadSheet({ data: sheetKey });
    },
  });

  const patchSnap = (mut: (s: LogSnapshot) => LogSnapshot) => {
    qc.setQueryData<LogSnapshot>(qk, (old) => (old ? mut(old) : old));
  };

  const saveDayMut = useMutation({ mutationFn: (d: DayRecord) => upsertDay({ data: d }) });
  const saveEntryMut = useMutation({ mutationFn: (e: LogEntry) => upsertEntry({ data: e }) });
  const delEntryMut = useMutation({ mutationFn: (id: string) => removeEntry({ data: id }) });
  const saveImageMut = useMutation({ mutationFn: (img: LogImage) => upsertImage({ data: img }) });
  const delImageMut = useMutation({ mutationFn: (id: string) => removeImage({ data: id }) });
  const saveNoteMut = useMutation({ mutationFn: (n: LogNote) => upsertNote({ data: n }) });
  const delNoteMut = useMutation({ mutationFn: (id: string) => removeNote({ data: id }) });
  const saveSpanMut = useMutation({ mutationFn: (s: LogSpan) => upsertSpan({ data: s }) });
  const importMut = useMutation({
    mutationFn: () => importDemoSheet(),
    onSuccess: (snap) => {
      qc.setQueryData(["slog", "2024-H2"], snap);
      qc.invalidateQueries({ queryKey: ["slog"] });
    },
  });

  const fetchDayImages = useCallback((date: string) => loadDayImages({ data: date }), []);

  return {
    snap: query.data as LogSnapshot | undefined,
    isPending: query.isPending,
    patchSnap,
    saveDay: saveDayMut.mutateAsync,
    saveEntry: saveEntryMut.mutateAsync,
    deleteEntry: delEntryMut.mutateAsync,
    saveImage: saveImageMut.mutateAsync,
    deleteImage: delImageMut.mutateAsync,
    loadDayImages: fetchDayImages,
    saveNote: saveNoteMut.mutateAsync,
    deleteNote: delNoteMut.mutateAsync,
    saveSpan: saveSpanMut.mutateAsync,
    importDemo: importMut.mutateAsync,
    importing: importMut.isPending,
  };
}

export async function remoteSearch(q: string): Promise<SearchHit[]> {
  return searchLog({ data: q });
}
