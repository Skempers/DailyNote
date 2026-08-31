import { Check, ChevronLeft, Maximize2, Minimize2, Plus, Star, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { compressImageFile, IMAGE_LIMITS } from "@/lib/slog/compress-image";
import { headerFill, TONE_COLORS } from "@/lib/slog/colors";
import { formatLong, monthOf } from "@/lib/slog/calendar";
import { preferDraft, readDraft } from "@/lib/slog/drafts";
import type {
  DayRecord,
  Emphasis,
  EntryKind,
  EntryMarker,
  LogEntry,
  LogImage,
  LogSnapshot,
} from "@/lib/slog/types";
import { DAY_TONES, ENTRY_KINDS } from "@/lib/slog/types";
import { cn } from "@/lib/utils";
import { MARKERS, MarkerIcon } from "./markers";
import { PhotoGrid } from "./photo-grid";

export type DayDraft = {
  day: DayRecord;
  entries: LogEntry[];
  images: LogImage[];
};

export type SaveState = "idle" | "saving" | "saved" | "error" | "local";

export function emptyDay(iso: string): DayRecord {
  return {
    id: crypto.randomUUID(),
    date: iso,
    primaryTone: "month",
    secondaryTone: null,
    location: "",
    headerNote: "",
    p3: ["", "", ""],
    journal: "",
  };
}

function hydrate(iso: string, snap: LogSnapshot, draftNs: string): DayDraft {
  const stored = readDraft(draftNs, iso);
  const existing = preferDraft(snap.days[iso], stored);
  const day = existing
    ? { ...existing, p3: [...(existing.p3 ?? []), "", "", ""].slice(0, 3), journal: existing.journal ?? "" }
    : emptyDay(iso);
  const entries = stored && !snap.days[iso]?.journal && stored.entries.length
    ? stored.entries
    : [...(snap.entries[iso] ?? [])];
  const images = [...(snap.images?.[iso] ?? [])];
  return { day, entries, images };
}

export function DayEditor({
  iso,
  snap,
  favoriteLabel,
  layout = "dock",
  saveState = "idle",
  draftNs = "demo",
  onClose,
  onSave,
  onDeleteEntry,
  onAddImages,
  onDeleteImage,
  onExpand,
  onDock,
  ephemeral = false,
}: {
  iso: string;
  snap: LogSnapshot;
  favoriteLabel: string;
  layout?: "dock" | "focus" | "note";
  saveState?: SaveState;
  draftNs?: string;
  ephemeral?: boolean;
  onClose: () => void;
  onSave: (draft: DayDraft, opts?: { immediate?: boolean }) => void;
  onDeleteEntry: (id: string) => void;
  onAddImages?: (files: FileList | File[]) => Promise<void> | void;
  onDeleteImage?: (id: string) => void;
  onExpand?: () => void;
  onDock?: () => void;
}) {
  const [day, setDay] = useState(() => hydrate(iso, snap, draftNs).day);
  const [entries, setEntries] = useState(() => hydrate(iso, snap, draftNs).entries);
  const [images, setImages] = useState(() => hydrate(iso, snap, draftNs).images);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<EntryKind>("ordinary");
  const [marker, setMarker] = useState<EntryMarker | null>(null);
  const [emphasis, setEmphasis] = useState<Emphasis>("normal");
  const [metaOpen, setMetaOpen] = useState(layout === "focus");
  const [imgError, setImgError] = useState<string | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const journalRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const next = hydrate(iso, snap, draftNs);
    setDay(next.day);
    setEntries(next.entries);
    setImages(next.images);
    setBody("");
    setMetaOpen(layout === "focus");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);

  useEffect(() => {
    setImages([...(snap.images?.[iso] ?? [])]);
  }, [snap.images, iso]);

  useEffect(() => {
    if (layout === "focus") {
      const t = window.setTimeout(() => journalRef.current?.focus(), 40);
      return () => window.clearTimeout(t);
    }
  }, [layout, iso]);

  useEffect(() => {
    if (layout !== "note") return;
    const el = journalRef.current;
    if (!el) return;
    el.style.height = "auto";
    const min = Math.round(window.innerHeight * 0.52);
    el.style.height = `${Math.max(min, el.scrollHeight)}px`;
  }, [day.journal, layout]);

  const header = headerFill(day.primaryTone, monthOf(iso));

  function persist(next: DayDraft, immediate = false) {
    onSave(next, { immediate });
  }

  function commit() {
    persist({ day, entries, images }, true);
  }

  function patchDay(partial: Partial<DayRecord>, immediate = false) {
    const nextDay = { ...day, ...partial };
    setDay(nextDay);
    persist({ day: nextDay, entries, images }, immediate);
  }

  function addEntry() {
    const text = body.trim();
    if (!text) return;
    const e: LogEntry = {
      id: crypto.randomUUID(),
      date: iso,
      kind,
      body: text,
      marker,
      emphasis,
      starred: kind === "pride",
      sortOrder: entries.length,
    };
    const next = { day, entries: [...entries, e], images };
    setEntries(next.entries);
    setBody("");
    persist(next, true);
  }

  function toggleStar(id: string) {
    const nextEntries = entries.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e));
    setEntries(nextEntries);
    persist({ day, entries: nextEntries, images }, true);
  }

  function remove(id: string) {
    const nextEntries = entries.filter((e) => e.id !== id);
    setEntries(nextEntries);
    persist({ day, entries: nextEntries, images }, true);
    onDeleteEntry(id);
  }

  async function handleFiles(list: FileList | File[] | null) {
    if (!list || !list.length) return;
    setImgError(null);
    if (onAddImages) {
      setImgBusy(true);
      try {
        await onAddImages(list);
      } catch (err) {
        setImgError(err instanceof Error ? err.message : "图片没有加上");
      } finally {
        setImgBusy(false);
      }
      return;
    }
    setImgBusy(true);
    try {
      const next = [...images];
      for (const file of Array.from(list)) {
        if (next.length >= IMAGE_LIMITS.maxPerDay) {
          setImgError(`一天最多 ${IMAGE_LIMITS.maxPerDay} 张`);
          break;
        }
        const packed = await compressImageFile(file);
        next.push({
          id: crypto.randomUUID(),
          date: iso,
          dataUrl: packed.dataUrl,
          thumbUrl: packed.thumbUrl,
          caption: "",
          sortOrder: next.length,
        });
      }
      setImages(next);
      persist({ day, entries, images: next }, true);
    } catch (err) {
      setImgError(err instanceof Error ? err.message : "图片没有加上");
    } finally {
      setImgBusy(false);
    }
  }

  function dropImage(id: string) {
    const next = images.filter((i) => i.id !== id);
    setImages(next);
    persist({ day, entries, images: next }, true);
    onDeleteImage?.(id);
  }

  const saveLabel =
    saveState === "saving"
      ? "正在保存"
      : saveState === "saved"
        ? ephemeral
          ? "已记在本页"
          : "已写入"
        : saveState === "error"
          ? "保存失败，已留在本地"
          : saveState === "local"
            ? ephemeral
              ? "先记在本页"
              : "先记在本地"
            : ephemeral
              ? "只留在本页"
              : "边写边存";

  const journalBox = (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="mb-1.5 flex shrink-0 items-baseline justify-between gap-2">
        <Label htmlFor="journal">这一天</Label>
        <span
          className={cn(
            "text-[11px]",
            saveState === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {saveLabel}
        </span>
      </div>
      <Textarea
        id="journal"
        ref={journalRef}
        value={day.journal}
        onChange={(e) => patchDay({ journal: e.target.value })}
        onBlur={() => persist({ day, entries, images }, true)}
        placeholder="直接写。一段话会铺满格子，不用点保存。"
        className="min-h-0 min-w-0 flex-1 resize-none overflow-y-auto whitespace-pre-wrap break-all text-base leading-relaxed"
      />
    </section>
  );

  const imageBox = (
    <section
      className={cn(
        "mt-2 flex min-w-0 flex-col overflow-hidden",
        images.length ? "min-h-0 max-h-[30%] shrink-0" : "shrink-0",
      )}
    >
      <div className="mb-1 flex shrink-0 items-center justify-between">
        <Label>照片</Label>
        <span className="text-[11px] text-muted-foreground">
          {images.length}/{IMAGE_LIMITS.maxPerDay}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        <PhotoGrid
          images={images}
          size="editor"
          maxShow={IMAGE_LIMITS.maxPerDay}
          onDelete={dropImage}
          onAdd={() => fileRef.current?.click()}
          busy={imgBusy}
          canAdd={images.length < IMAGE_LIMITS.maxPerDay}
        />
      </div>
      {imgError ? <p className="mt-1 shrink-0 text-xs text-destructive">{imgError}</p> : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </section>
  );

  const metaBox = (
    <div className="space-y-4">
      <section>
        <Label>主色</Label>
        <div className="mt-1.5 grid grid-cols-4 gap-1">
          {DAY_TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.hint}
              onClick={() => patchDay({ primaryTone: t.id }, true)}
              className={cn(
                "rounded-sm px-1 py-1.5 text-[11px] leading-tight",
                day.primaryTone === t.id && "ring-2 ring-primary",
              )}
              style={{
                background: t.id === "month" ? `var(--color-month-${monthOf(iso)})` : TONE_COLORS[t.id].bg,
                color: t.id === "month" ? `var(--color-month-${monthOf(iso)}-fg)` : TONE_COLORS[t.id].fg,
              }}
            >
              {t.id === "favorite" ? favoriteLabel : t.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <Label>次色（可空）</Label>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => patchDay({ secondaryTone: null }, true)}
            className={cn(
              "rounded-full border border-border px-2 py-1 text-[11px]",
              !day.secondaryTone && "bg-foreground text-background",
            )}
          >
            无
          </button>
          {DAY_TONES.filter((t) => t.id !== "month").map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => patchDay({ secondaryTone: t.id }, true)}
              className={cn(
                "rounded-full px-2 py-1 text-[11px]",
                day.secondaryTone === t.id && "ring-2 ring-primary",
              )}
              style={{ background: TONE_COLORS[t.id].bg, color: TONE_COLORS[t.id].fg }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="header-note">格子上的小标题</Label>
          <Input
            id="header-note"
            className="mt-1 h-9"
            value={day.headerNote}
            placeholder="节日、生日、开学…"
            onChange={(e) => patchDay({ headerNote: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="location">地点</Label>
          <Input
            id="location"
            className="mt-1 h-9"
            value={day.location}
            placeholder="纽约 / 宿舍 / A 所"
            onChange={(e) => patchDay({ location: e.target.value })}
          />
        </div>
      </div>

      <section>
        <Label>P3 · 今天最重要的三件事</Label>
        <div className="mt-1.5 grid gap-1.5">
          {[0, 1, 2].map((i) => (
            <Input
              key={i}
              className="h-9"
              value={day.p3[i] ?? ""}
              placeholder={i === 0 ? "第一件" : i === 1 ? "第二件" : "第三件"}
              onChange={(e) => {
                const p3 = [...day.p3];
                p3[i] = e.target.value;
                patchDay({ p3 });
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );

  const entriesBox = (
    <section>
      <Label>标签条目</Label>
      <ul className="mt-1.5 space-y-1">
        {entries.map((e) => (
          <li key={e.id} className="flex items-start gap-2 rounded-md bg-muted/60 px-2 py-1.5 text-sm">
            <MarkerIcon marker={e.marker} className="mt-0.5 size-3.5" />
            <span className="min-w-0 flex-1 break-all whitespace-pre-wrap leading-snug">{e.body}</span>
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => toggleStar(e.id)}>
              <Star className={cn("size-3.5", e.starred && "fill-current text-tone-important-fg")} />
            </button>
            <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => remove(e.id)}>
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 space-y-2 rounded-md border border-border p-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="电影、航班、课表… 分类写一条"
          className="min-h-14"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addEntry();
          }}
        />
        <div className="flex flex-wrap gap-1">
          {ENTRY_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              title={k.hint}
              onClick={() => setKind(k.id)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px]",
                kind === k.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {MARKERS.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.label}
              onClick={() => setMarker(marker === m.id ? null : m.id)}
              className={cn(
                "rounded-sm p-1.5",
                marker === m.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <MarkerIcon marker={m.id} className="size-3.5" />
            </button>
          ))}
          <div className="ml-auto flex gap-1">
            {(["normal", "bold", "large"] as Emphasis[]).map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setEmphasis(em)}
                className={cn(
                  "rounded-sm px-2 py-1 text-[11px]",
                  emphasis === em ? "bg-secondary" : "text-muted-foreground",
                )}
              >
                {em === "normal" ? "常规" : em === "bold" ? "加粗" : "放大"}
              </button>
            ))}
          </div>
        </div>
        <Button type="button" size="sm" onClick={addEntry} className="w-full">
          <Plus className="size-3.5" />
          加一条标签
        </Button>
      </div>
    </section>
  );

  const chrome = (
    <header className="rounded-md px-3 py-3" style={{ background: header.bg, color: header.fg }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium tracking-wide uppercase opacity-80">这一天</p>
          <h2 className="font-display text-xl font-medium">{formatLong(iso)}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={saveState === "saved" ? "secondary" : "default"}
            onClick={commit}
          >
            <Check className="size-3.5" />
            {saveState === "saving" ? "保存中" : saveState === "saved" ? "已保存" : "保存"}
          </Button>
          {layout === "dock" && onExpand ? (
            <Button type="button" size="sm" variant="secondary" onClick={onExpand}>
              <Maximize2 className="size-3.5" />
              放大书写
            </Button>
          ) : null}
          {layout === "focus" && onDock ? (
            <Button type="button" size="sm" variant="secondary" onClick={onDock}>
              <Minimize2 className="size-3.5" />
              侧栏填写
            </Button>
          ) : null}
        </div>
      </div>
      <p className="mt-1 text-xs opacity-80">
        {ephemeral
          ? "正文会写进格子，关掉这个标签页就会清空。点保存可以立刻确认。"
          : "正文会自动写入格子和账户。点保存可以立刻确认。"}
      </p>
    </header>
  );

  if (layout === "note") {
    const words = Array.from(day.journal).length;
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div className="h-1 w-full shrink-0" style={{ background: header.bg }} />
        <header className="flex shrink-0 items-center gap-1 border-b border-border px-1 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full text-foreground hover:bg-muted"
            aria-label="返回"
          >
            <ChevronLeft className="size-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg leading-tight font-medium">{formatLong(iso)}</h2>
            <p className="text-[11px] text-muted-foreground">
              {words} 字
              <span className="mx-1 opacity-40">·</span>
              {saveLabel}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant={saveState === "saved" ? "secondary" : "default"}
            onClick={commit}
            aria-label="保存"
            className="mr-1"
          >
            <Check className="size-5" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Textarea
            id="journal"
            ref={journalRef}
            value={day.journal}
            onChange={(e) => patchDay({ journal: e.target.value })}
            onBlur={() => persist({ day, entries, images }, true)}
            placeholder="开始书写…"
            className="min-h-[52vh] min-w-0 resize-none rounded-none border-0 bg-transparent px-5 py-4 text-[17px] leading-7 shadow-none focus-visible:ring-0"
          />

          <section className="border-t border-border px-4 py-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">照片</p>
              <span className="text-[11px] text-muted-foreground">
                {images.length}/{IMAGE_LIMITS.maxPerDay}
              </span>
            </div>
            <PhotoGrid
              images={images}
              size="editor"
              maxShow={IMAGE_LIMITS.maxPerDay}
              onDelete={dropImage}
              onAdd={() => fileRef.current?.click()}
              busy={imgBusy}
              canAdd={images.length < IMAGE_LIMITS.maxPerDay}
            />
            {imgError ? <p className="mt-1 text-xs text-destructive">{imgError}</p> : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </section>

          <div className="border-t border-border px-4 py-4">
            {metaBox}
            <div className="mt-6">{entriesBox}</div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "focus") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0">{chrome}</div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden py-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden pr-1">
            {journalBox}
            {imageBox}
          </div>
          <div className="min-h-0 min-w-0 overflow-y-auto lg:border-l lg:border-border lg:pl-4">
            {metaBox}
            <div className="mt-4">{entriesBox}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-[11px] text-muted-foreground">{saveLabel}</span>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={commit}>
              <Check className="size-3.5" />
              {saveState === "saved" ? "已保存" : "保存"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              收起
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">{chrome}</div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden py-3">
        {journalBox}
        {imageBox}
      </div>
      <div className="mt-2 min-h-0 max-h-[34%] shrink-0 overflow-y-auto border-t border-border pt-2">
        <button
          type="button"
          onClick={() => setMetaOpen((v) => !v)}
          className="text-left text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {metaOpen ? "收起颜色与 P3" : "颜色 · 标题 · P3"}
        </button>
        {metaOpen ? <div className="mt-2">{metaBox}</div> : null}
        <div className="mt-3">{entriesBox}</div>
      </div>
      <div className="flex shrink-0 justify-end border-t border-border pt-3">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          收起
        </Button>
      </div>
    </div>
  );
}

export type TonePickerTone = DayRecord["primaryTone"];
