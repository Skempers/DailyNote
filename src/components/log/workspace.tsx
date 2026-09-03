import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  MapPin,
  Palette,
  Search,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Group as ResizableGroup,
  Panel as ResizablePanel,
  Separator as ResizeHandle,
} from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adjacentSheet,
  anchorDate,
  clampMonthToSheet,
  clampWeekToSheet,
  currentSheetKey,
  formatWeekRange,
  inSheet,
  monthStartsInSheet,
  nearbySheets,
  parseSheetKey,
  sheetLabel,
  shiftWeek,
  toISODate,
  weekOf,
} from "@/lib/slog/calendar";
import { compressImageFile, IMAGE_LIMITS } from "@/lib/slog/compress-image";
import { clearDraft, writeDraft } from "@/lib/slog/drafts";
import { LAYER_MODES, SPAN_PALETTE, VIEW_MODES } from "@/lib/slog/types";
import type { LayerMode, LogImage, LogNote, LogSnapshot, LogSpan, SearchHit, ViewMode } from "@/lib/slog/types";
import { localSearch, useDemoLog } from "@/lib/slog/use-demo-log";
import type { DayDraft, SaveState } from "./editor";
import { DayEditor } from "./editor";
import { LegendDialog } from "./legend-dialog";
import { MonthBoard, SemesterCanvas, WeekBoard } from "./canvas";
import { OverviewDialog } from "./overview";
import { SearchPalette } from "./search-palette";
import { cn } from "@/lib/utils";
import { LayerProvider } from "./layer-mode";

export type LogAdapter = {
  snap?: LogSnapshot;
  pending?: boolean;
  saveDay?: (d: DayDraft) => Promise<void> | void;
  deleteEntry?: (id: string) => Promise<void> | void;
  saveImage?: (img: LogImage) => Promise<LogImage | void> | LogImage | void;
  deleteImage?: (id: string) => Promise<void> | void;
  saveNote?: (n: LogNote) => Promise<void> | void;
  deleteNote?: (id: string) => Promise<void> | void;
  saveSpan?: (s: LogSpan) => Promise<void> | void;
  search?: (q: string) => Promise<SearchHit[]> | SearchHit[];
  loadDayImages?: (date: string) => Promise<LogImage[]>;
  patchSnap?: (mut: (s: LogSnapshot) => LogSnapshot) => void;
  draftNs?: string;
  guest?: boolean;
};

function readView(): ViewMode {
  if (typeof window === "undefined") return "half";
  const v = window.localStorage.getItem("slog-view-mode");
  return v === "week" || v === "month" || v === "half" ? v : "half";
}

function readLayer(): LayerMode {
  if (typeof window === "undefined") return "log";
  const v = window.localStorage.getItem("slog-layer-mode");
  return v === "todo" || v === "both" || v === "log" ? v : "log";
}

export function LogWorkspace({
  sheetKey,
  onSheetChange,
  adapter,
}: {
  sheetKey: string;
  onSheetChange: (key: string) => void;
  adapter?: LogAdapter;
}) {
  const demo = useDemoLog(sheetKey);
  const snap = adapter?.snap ?? demo.snap;
  const pending = Boolean(adapter?.pending);
  const draftNs = adapter?.draftNs ?? "demo";

  const [selected, setSelected] = useState<string | null>(null);
  const [writeMode, setWriteMode] = useState<"dock" | "focus">("focus");
  const [searchOpen, setSearchOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState<Partial<LogNote> | null>(null);
  const [sheetPickOpen, setSheetPickOpen] = useState(false);
  const [spanOpen, setSpanOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("half");
  const [layer, setLayer] = useState<LayerMode>("log");
  const [mobileMonth, setMobileMonth] = useState(() =>
    clampMonthToSheet(sheetKey, new Date().getMonth() + 1),
  );
  const [weekMonday, setWeekMonday] = useState(() => clampWeekToSheet(sheetKey, toISODate(new Date())));
  const [overviewOpen, setOverviewOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<string | null>(toISODate(new Date()));
  const [xl, setXl] = useState(false);
  const [bpReady, setBpReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pendingDraft = useRef<DayDraft | null>(null);
  const timerRef = useRef<number | null>(null);

  const [viewReady, setViewReady] = useState(false);

  useEffect(() => {
    setView(readView());
    setLayer(readLayer());
    pendingScroll.current = anchorDate(sheetKey, selected, Object.keys(snap?.days ?? {}));
    setViewReady(true);
  }, []);

  useEffect(() => {
    const xlMq = window.matchMedia("(min-width: 1280px)");
    const apply = () => setXl(xlMq.matches);
    apply();
    setBpReady(true);
    xlMq.addEventListener("change", apply);
    return () => xlMq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const anchor = anchorDate(sheetKey, selected, Object.keys(snap?.days ?? {}));
    setMobileMonth(clampMonthToSheet(sheetKey, Number(anchor.slice(5, 7))));
    setWeekMonday(clampWeekToSheet(sheetKey, anchor));
    pendingScroll.current = anchor;
  }, [sheetKey]);

  useEffect(() => {
    const iso = pendingScroll.current;
    if (!iso || pending || !viewReady) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const el = canvasRef.current?.querySelector(`[data-date="${iso}"]`);
        el?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        pendingScroll.current = null;
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [view, weekMonday, mobileMonth, sheetKey, pending, viewReady]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !e.metaKey && !e.ctrlKey)) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (e.key === "/" && (tag === "INPUT" || tag === "TEXTAREA")) return;
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!selected || !adapter?.loadDayImages || !adapter.patchSnap) return;
    const list = snap?.images?.[selected] ?? [];
    if (!list.length || list.every((i) => Boolean(i.dataUrl))) return;
    let cancelled = false;
    const date = selected;
    void adapter
      .loadDayImages(date)
      .then((full) => {
        if (cancelled || !full.length) return;
        adapter.patchSnap?.((s) => {
          const current = s.images?.[date] ?? [];
          const byId = new Map(full.map((i) => [i.id, i]));
          const merged = current.map((c) => {
            const f = byId.get(c.id);
            return f ? { ...c, dataUrl: f.dataUrl || c.dataUrl, thumbUrl: c.thumbUrl || f.thumbUrl } : c;
          });
          for (const f of full) {
            if (!merged.some((c) => c.id === f.id)) merged.push(f);
          }
          return { ...s, images: { ...(s.images ?? {}), [date]: merged } };
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, snap?.images, adapter?.loadDayImages, adapter?.patchSnap]);

  const applyOptimistic = useCallback(
    (draft: DayDraft) => {
      const mut = (s: LogSnapshot): LogSnapshot => {
        const prevImgs = s.images?.[draft.day.date] ?? [];
        const merged = draft.images.map((img) => {
          const prev = prevImgs.find((p) => p.id === img.id);
          return {
            ...img,
            dataUrl: img.dataUrl || prev?.dataUrl || "",
            thumbUrl: img.thumbUrl || prev?.thumbUrl,
          };
        });
        return {
          ...s,
          days: { ...s.days, [draft.day.date]: draft.day },
          entries: { ...s.entries, [draft.day.date]: draft.entries },
          images: { ...(s.images ?? {}), [draft.day.date]: merged },
          todos: { ...(s.todos ?? {}), [draft.day.date]: draft.todos ?? [] },
        };
      };
      if (adapter?.patchSnap) adapter.patchSnap(mut);
      else demo.setSnap(mut);
    },
    [adapter, demo],
  );

  const flush = useCallback(async () => {
    const draft = pendingDraft.current;
    if (!draft) return;
    pendingDraft.current = null;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!adapter?.guest) {
      writeDraft(draftNs, draft.day.date, { day: draft.day, entries: draft.entries });
    }
    applyOptimistic(draft);
    if (!adapter?.saveDay) {
      setSaveState("saved");
      return;
    }
    setSaveState("saving");
    try {
      await adapter.saveDay(draft);
      if (!adapter.guest) clearDraft(draftNs, draft.day.date);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [adapter, applyOptimistic, draftNs]);

  const queueSave = useCallback(
    (draft: DayDraft, immediate = false) => {
      pendingDraft.current = draft;
      applyOptimistic(draft);
      if (!adapter?.guest) {
        writeDraft(draftNs, draft.day.date, { day: draft.day, entries: draft.entries });
      }
      setSaveState("local");
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (immediate) void flush();
      else timerRef.current = window.setTimeout(() => void flush(), 1100);
    },
    [adapter, applyOptimistic, draftNs, flush],
  );

  useEffect(() => {
    const tick = () => {
      if (pendingDraft.current) void flush();
    };
    const id = window.setInterval(tick, 8000);
    const onHide = () => {
      if (document.visibilityState === "hidden") tick();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", tick);
    window.addEventListener("beforeunload", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", tick);
      window.removeEventListener("beforeunload", tick);
      tick();
    };
  }, [flush]);

  function changeView(next: ViewMode) {
    const anchor = anchorDate(sheetKey, selected, Object.keys(snap?.days ?? {}));
    setView(next);
    setWeekMonday(clampWeekToSheet(sheetKey, anchor));
    setMobileMonth(clampMonthToSheet(sheetKey, Number(anchor.slice(5, 7))));
    pendingScroll.current = anchor;
    try {
      localStorage.setItem("slog-view-mode", next);
    } catch {
      /* ignore */
    }
  }

  function pickDay(iso: string) {
    void flush();
    setSelected(iso);
    setMobileMonth(clampMonthToSheet(sheetKey, Number(iso.slice(5, 7))));
    setWeekMonday(weekOf(iso).mondayIso);
    pendingScroll.current = iso;
    window.requestAnimationFrame(() => {
      canvasRef.current?.querySelector(`[data-date="${iso}"]`)?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    });
  }

  async function handleDeleteEntry(id: string) {
    if (adapter?.deleteEntry) await adapter.deleteEntry(id);
  }

  async function handleAddImages(files: FileList | File[]) {
    if (!selected || !snap) return;
    const current = snap.images?.[selected] ?? [];
    const room = IMAGE_LIMITS.maxPerDay - current.length;
    if (room <= 0) throw new Error(`一天最多 ${IMAGE_LIMITS.maxPerDay} 张`);
    const added: LogImage[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      const packed = await compressImageFile(file);
      const img: LogImage = {
        id: crypto.randomUUID(),
        date: selected,
        dataUrl: packed.dataUrl,
        thumbUrl: packed.thumbUrl,
        caption: "",
        sortOrder: current.length + added.length,
      };
      if (adapter?.saveImage) {
        const saved = (await adapter.saveImage(img)) ?? img;
        added.push(saved);
      } else {
        added.push(img);
      }
    }
    const next = [...current, ...added];
    const mut = (s: LogSnapshot): LogSnapshot => ({
      ...s,
      images: { ...(s.images ?? {}), [selected]: next },
    });
    if (adapter?.patchSnap) adapter.patchSnap(mut);
    else demo.setSnap(mut);
  }

  async function handleDeleteImage(id: string) {
    if (!selected || !snap) return;
    if (adapter?.deleteImage) await adapter.deleteImage(id);
    const next = (snap.images?.[selected] ?? []).filter((i) => i.id !== id);
    const mut = (s: LogSnapshot): LogSnapshot => ({
      ...s,
      images: { ...(s.images ?? {}), [selected]: next },
    });
    if (adapter?.patchSnap) adapter.patchSnap(mut);
    else demo.setSnap(mut);
  }

  async function handleSaveNote(n: LogNote) {
    if (adapter?.saveNote) {
      await adapter.saveNote(n);
      return;
    }
    const mut = (s: LogSnapshot): LogSnapshot => {
      const idx = s.notes.findIndex((x) => x.id === n.id);
      const notes = [...s.notes];
      if (idx >= 0) notes[idx] = n;
      else notes.push(n);
      return { ...s, notes };
    };
    if (adapter?.patchSnap) adapter.patchSnap(mut);
    else demo.setSnap(mut);
  }

  async function handleDeleteNote(id: string) {
    if (adapter?.deleteNote) await adapter.deleteNote(id);
    const mut = (s: LogSnapshot): LogSnapshot => ({
      ...s,
      notes: s.notes.filter((x) => x.id !== id),
    });
    if (adapter?.patchSnap) adapter.patchSnap(mut);
    else demo.setSnap(mut);
  }

  async function handleSaveSpan(sp: LogSpan) {
    if (adapter?.saveSpan) {
      await adapter.saveSpan(sp);
      return;
    }
    demo.setSnap((s) => ({ ...s, spans: [...s.spans, sp] }));
  }

  function goToday() {
    const today = toISODate(new Date());
    const key = currentSheetKey();
    if (key !== sheetKey) onSheetChange(key);
    pickDay(today);
  }

  const onQuery = useCallback(
    async (q: string) => {
      if (adapter?.search) {
        try {
          return await adapter.search(q);
        } catch {
          return snap ? localSearch(snap, q) : [];
        }
      }
      return localSearch(demo.snap, q);
    },
    [adapter, demo.snap, snap],
  );

  function pickHit(hit: SearchHit) {
    if (hit.date.length === 10) pickDay(hit.date);
  }

  const { year, half } = parseSheetKey(sheetKey);
  const months = half === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];

  function stepWeek(dir: -1 | 1) {
    const next = shiftWeek(weekMonday, dir);
    const sunday = toISODate(weekOf(next).days[6]!);
    if (!inSheet(next, sheetKey) && !inSheet(sunday, sheetKey)) {
      onSheetChange(adjacentSheet(sheetKey, dir));
    }
    setWeekMonday(next);
  }

  const docked = writeMode === "dock" && Boolean(selected);
  const showSplit = bpReady && xl && docked;
  const showNote = bpReady && !xl && Boolean(selected);
  const showFocus = bpReady && xl && writeMode === "focus" && Boolean(selected);

  useEffect(() => {
    if (!showFocus) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        void flush();
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onEsc);
    };
  }, [showFocus, flush]);

  if (pending || !snap) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const editor = selected ? (
    <DayEditor
      key={`${selected}-${writeMode}`}
      iso={selected}
      snap={snap}
      favoriteLabel={snap.settings.favoriteLabel}
      layout={xl ? writeMode : "note"}
      saveState={saveState}
      draftNs={draftNs}
      ephemeral={Boolean(adapter?.guest)}
      onClose={() => {
        void flush();
        setSelected(null);
      }}
      onSave={(d, opts) => queueSave(d, opts?.immediate)}
      onDeleteEntry={(id) => void handleDeleteEntry(id)}
      onAddImages={handleAddImages}
      onDeleteImage={(id) => void handleDeleteImage(id)}
      onExpand={() => setWriteMode("focus")}
      onDock={() => setWriteMode("dock")}
    />
  ) : null;

  const canvas = (
    <div ref={canvasRef} className="min-h-0 flex-1 overflow-auto p-3 md:p-5">
      {view === "half" ? (
        <div className="mb-3 flex gap-1 overflow-x-auto">
          {monthStartsInSheet(sheetKey).map((m) => (
            <button
              key={m.month}
              type="button"
              onClick={() => {
                changeView("month");
                setMobileMonth(m.month);
              }}
              className="rounded-sm px-2 py-1 text-[11px] font-medium"
              style={{
                background: `var(--color-month-${m.month})`,
                color: `var(--color-month-${m.month}-fg)`,
              }}
            >
              {m.month}月
            </button>
          ))}
        </div>
      ) : null}

      {view === "month" ? (
        <div className="mb-3 flex gap-1 overflow-x-auto">
          {months.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMobileMonth(m)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm",
                mobileMonth === m ? "bg-foreground text-background" : "bg-muted",
              )}
            >
              {m}月
            </button>
          ))}
        </div>
      ) : null}

      {view === "week" ? (
        <div className="mb-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="上一周" onClick={() => stepWeek(-1)}>
            <ChevronLeft />
          </Button>
          <p className="font-display text-lg font-medium">{formatWeekRange(weekMonday)}</p>
          <Button variant="ghost" size="icon" aria-label="下一周" onClick={() => stepWeek(1)}>
            <ChevronRight />
          </Button>
        </div>
      ) : null}

      {view === "half" ? (
        <SemesterCanvas
          snap={snap}
          selected={selected}
          onSelect={pickDay}
          onAddWeekNote={(monday) =>
            setNoteOpen({
              id: crypto.randomUUID(),
              sheetKey,
              weekStart: monday,
              kind: "plan",
              title: "",
              body: "",
              tone: null,
              emphasized: false,
              sortOrder: 0,
            })
          }
          onEditNote={(n) => setNoteOpen(n)}
          onAddSheetNote={() =>
            setNoteOpen({
              id: crypto.randomUUID(),
              sheetKey,
              weekStart: null,
              kind: "quote",
              title: "",
              body: "",
              tone: "first",
              emphasized: true,
              sortOrder: 0,
            })
          }
          density="half"
        />
      ) : null}

      {view === "month" ? (
        <MonthBoard
          snap={snap}
          year={year}
          month={mobileMonth}
          selected={selected}
          onSelect={pickDay}
        />
      ) : null}

      {view === "week" ? (
        <WeekBoard
          snap={snap}
          mondayIso={weekMonday}
          selected={selected}
          onSelect={pickDay}
          onAddWeekNote={(monday) =>
            setNoteOpen({
              id: crypto.randomUUID(),
              sheetKey,
              weekStart: monday,
              kind: "plan",
              title: "",
              body: "",
              tone: null,
              emphasized: false,
              sortOrder: 0,
            })
          }
        />
      ) : null}
    </div>
  );

  const noteOverlay =
    showNote && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[70] flex h-[100dvh] flex-col bg-background">
            {editor}
          </div>,
          document.body,
        )
      : null;

  const focusOverlay =
    showFocus && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 md:p-6">
            <button
              type="button"
              className="absolute inset-0 bg-foreground/45"
              aria-label="关闭书写"
              onClick={() => {
                void flush();
                setSelected(null);
              }}
            />
            <div className="relative flex h-[min(94vh,58rem)] w-[min(96vw,76rem)] flex-col overflow-hidden rounded-xl bg-card p-4 shadow-border">
              {editor}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <LayerProvider value={layer}>
    <div className="flex min-h-0 flex-1 flex-col">
      {adapter?.guest ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-secondary px-3 py-1.5 text-xs md:px-5">
          <span className="text-secondary-foreground">
            访客试用 · 写的内容只留在这个标签页里，关掉就清空，不会进账户。
          </span>
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            登录后长期保存
          </Link>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/80 px-3 py-2 backdrop-blur-sm md:px-5">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="上一张" onClick={() => onSheetChange(adjacentSheet(sheetKey, -1))}>
            <ChevronLeft />
          </Button>
          <button type="button" className="text-left" onClick={() => setSheetPickOpen(true)}>
            <p className="font-display text-lg leading-tight font-medium">{sheetLabel(sheetKey)}</p>
            <p className="text-[11px] text-muted-foreground">点标题选半年 · 点格子放大写</p>
          </button>
          <Button variant="ghost" size="icon" aria-label="下一张" onClick={() => onSheetChange(adjacentSheet(sheetKey, 1))}>
            <ChevronRight />
          </Button>
        </div>

        <div className="flex rounded-md border border-border p-0.5">
          {VIEW_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.hint}
              onClick={() => changeView(m.id)}
              className={cn(
                "rounded-sm px-2.5 py-1 text-xs",
                view === m.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-md border border-border p-0.5">
          {LAYER_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.hint}
              onClick={() => {
                setLayer(m.id);
                window.localStorage.setItem("slog-layer-mode", m.id);
              }}
              className={cn(
                "rounded-sm px-2.5 py-1 text-xs",
                layer === m.id ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={() => setOverviewOpen(true)}>
          <LayoutGrid className="size-3.5" />
          看全
        </Button>
        <Button variant="outline" size="sm" onClick={goToday}>
          回到今天
        </Button>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)}>
            <Search className="size-3.5" />
            寻找
            <kbd className="hidden rounded-sm bg-muted px-1 text-[10px] md:inline">/</kbd>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLegendOpen(true)}>
            <Palette className="size-3.5" />
            图例
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSpanOpen(true)}>
            <MapPin className="size-3.5" />
            时段
          </Button>
        </div>
      </div>

      {showSplit ? (
        <ResizableGroup orientation="horizontal" className="flex min-h-0 flex-1" id="slog-split">
          <ResizablePanel id="canvas" minSize="28%" defaultSize="58%" className="min-h-0 min-w-0">
            {canvas}
          </ResizablePanel>
          <ResizeHandle className="w-1.5 bg-border hover:bg-primary/40" />
          <ResizablePanel id="editor" minSize="24%" defaultSize="42%" maxSize="72%" className="min-h-0 min-w-0 border-l border-border bg-card">
            <div className="h-full min-h-0 overflow-hidden p-4">{editor}</div>
          </ResizablePanel>
        </ResizableGroup>
      ) : (
        <div className="flex min-h-0 flex-1">{canvas}</div>
      )}

      {focusOverlay}
      {noteOverlay}

      <OverviewDialog
        open={overviewOpen}
        onClose={() => setOverviewOpen(false)}
        snap={snap}
        view={view}
        weekMonday={weekMonday}
        month={mobileMonth}
        selected={selected}
        onSelect={(iso) => {
          setOverviewOpen(false);
          pickDay(iso);
        }}
      />
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} onQuery={onQuery} onPick={pickHit} />
      <LegendDialog
        open={legendOpen}
        onOpenChange={setLegendOpen}
        favoriteLabel={snap.settings.favoriteLabel}
      />
      <NoteDialog
        open={noteOpen}
        onClose={() => setNoteOpen(null)}
        onSave={(n) => {
          void handleSaveNote(n);
          setNoteOpen(null);
        }}
        onDelete={
          noteOpen?.id
            ? () => {
                void handleDeleteNote(noteOpen.id!);
                setNoteOpen(null);
              }
            : undefined
        }
      />
      <SheetPickerDialog
        open={sheetPickOpen}
        current={sheetKey}
        onClose={() => setSheetPickOpen(false)}
        onPick={(key) => {
          onSheetChange(key);
          setSheetPickOpen(false);
        }}
      />
      <SpanDialog
        open={spanOpen}
        onOpenChange={setSpanOpen}
        defaultDate={selected ?? toISODate(new Date())}
        onSave={(sp) => {
          void handleSaveSpan(sp);
          setSpanOpen(false);
        }}
      />
    </div>
    </LayerProvider>
  );
}

function NoteDialog({
  open,
  onClose,
  onSave,
  onDelete,
}: {
  open: Partial<LogNote> | null;
  onClose: () => void;
  onSave: (n: LogNote) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const sheetLevel = Boolean(open) && !open?.weekStart;
  useEffect(() => {
    setTitle(open?.title ?? "");
    setBody(open?.body ?? "");
  }, [open]);
  if (!open) return null;
  return (
    <Dialog open={Boolean(open)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogTitle>{sheetLevel ? "给自己的话" : "本周备注"}</DialogTitle>
        <DialogDescription>
          {sheetLevel
            ? "放在半年表最上面。点卡片可以改，不要了就删除。"
            : "提醒、复盘、课表，写在这一周的右边。"}
        </DialogDescription>
        <div className="mt-3 space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题，可空" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="正文" />
          <Button
            className="w-full"
            onClick={() =>
              onSave({
                id: open.id ?? crypto.randomUUID(),
                sheetKey: open.sheetKey ?? currentSheetKey(),
                weekStart: open.weekStart ?? null,
                kind: open.kind ?? (sheetLevel ? "quote" : "plan"),
                title,
                body,
                tone: open.tone ?? (sheetLevel ? "first" : "important"),
                emphasized: true,
                sortOrder: open.sortOrder ?? 0,
              })
            }
          >
            写上
          </Button>
          {onDelete ? (
            <Button variant="ghost" className="w-full text-destructive" onClick={onDelete}>
              删除
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SheetPickerDialog({
  open,
  current,
  onClose,
  onPick,
}: {
  open: boolean;
  current: string;
  onClose: () => void;
  onPick: (key: string) => void;
}) {
  const todayKey = currentSheetKey();
  const groups = new Map<number, { h1: string; h2: string }>();
  for (const key of nearbySheets()) {
    const { year, half } = parseSheetKey(key);
    const g = groups.get(year) ?? { h1: `${year}-H1`, h2: `${year}-H2` };
    if (half === 1) g.h1 = key;
    else g.h2 = key;
    groups.set(year, g);
  }
  const years = [...groups.keys()].sort((a, b) => b - a);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogTitle>所有半年</DialogTitle>
        <DialogDescription>一张总表。点上半年或下半年直接跳过去，不用连点箭头。</DialogDescription>
        <div className="mt-3 space-y-2">
          {years.map((year) => {
            const g = groups.get(year)!;
            return (
              <div key={year} className="flex items-center gap-2">
                <span className="w-12 font-display text-lg">{year}</span>
                {([g.h1, g.h2] as const).map((key, i) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onPick(key)}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-sm",
                      key === current
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {i === 0 ? "上半年 1–6 月" : "下半年 7–12 月"}
                    {key === todayKey ? <span className="ml-1 text-[10px] opacity-80">今天</span> : null}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SpanDialog({
  open,
  onOpenChange,
  defaultDate,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: string;
  onSave: (s: LogSpan) => void;
}) {
  const [label, setLabel] = useState("");
  const [start, setStart] = useState(defaultDate);
  const [end, setEnd] = useState(defaultDate);
  const [color, setColor] = useState("trip-pink");
  const [weeks, setWeeks] = useState(true);
  useEffect(() => {
    if (open) {
      setStart(defaultDate);
      setEnd(defaultDate);
    }
  }, [open, defaultDate]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>框一段日子</DialogTitle>
        <DialogDescription>旅行、实习、和朋友住的几天。粗线是为了离得很近的时段也能一眼分开。</DialogDescription>
        <div className="mt-3 grid gap-2">
          <div>
            <Label>名称</Label>
            <Input className="mt-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="英国 / A 所 / 小满来住" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>从</Label>
              <Input className="mt-1" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>到</Label>
              <Input className="mt-1" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {SPAN_PALETTE.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                className={cn("rounded-full px-2 py-1 text-[11px]", color === c.id && "ring-2 ring-primary")}
                style={{ background: `var(--color-${c.id})` }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={weeks} onChange={(e) => setWeeks(e.target.checked)} />
            在左边标第几周
          </label>
          <Button
            disabled={!label.trim()}
            onClick={() =>
              onSave({
                id: crypto.randomUUID(),
                startDate: start,
                endDate: end < start ? start : end,
                kind: "trip",
                label: label.trim(),
                color,
                showWeeks: weeks,
              })
            }
          >
            框起来
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
