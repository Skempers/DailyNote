import { Check, Copy, ImageDown, Share2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatFull, monthOf, WEEKDAYS, weekdayIndex, parseDate } from "@/lib/slog/calendar";
import { headerFill, TONE_COLORS } from "@/lib/slog/colors";
import { imageThumb } from "@/lib/slog/compress-image";
import { dataUrlToBlob, downloadPng, sharePng } from "@/lib/slog/export";
import { DAY_TONES } from "@/lib/slog/types";
import type { DayRecord, DayTodo, LogEntry, LogImage } from "@/lib/slog/types";
import { cn } from "@/lib/utils";

type ShareFlags = {
  journal: boolean;
  photos: boolean;
  p3: boolean;
  header: boolean;
  location: boolean;
  todos: boolean;
  color: boolean;
  entries: boolean;
};

const DEFAULT_FLAGS: ShareFlags = {
  journal: true,
  photos: true,
  p3: true,
  header: false,
  location: false,
  todos: false,
  color: false,
  entries: false,
};

const OPTIONS: { key: keyof ShareFlags; label: string; hint: string; def: boolean }[] = [
  { key: "journal", label: "正文", hint: "这一天写的主要内容", def: true },
  { key: "photos", label: "照片", hint: "当日缩略图", def: true },
  { key: "p3", label: "要紧事", hint: "今天最重要的事", def: true },
  { key: "header", label: "小标题", hint: "格子上那一行", def: false },
  { key: "location", label: "地点", hint: "", def: false },
  { key: "todos", label: "待办", hint: "当天待办条目", def: false },
  { key: "color", label: "颜色", hint: "这一天的主色 / 次色", def: false },
  { key: "entries", label: "格子小条", hint: "分类写入格子的那些", def: false },
];

function isAppleTouch() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function toneName(id: string | null | undefined, favoriteLabel: string) {
  if (!id || id === "month") return "月份底色";
  if (id === "favorite") return favoriteLabel;
  return DAY_TONES.find((t) => t.id === id)?.label ?? id;
}

async function waitImages(node: HTMLElement) {
  const imgs = [...node.querySelectorAll("img")];
  await Promise.all(
    imgs.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
    ),
  );
}

function ShareCard({
  iso,
  day,
  images,
  todos,
  entries,
  flags,
  favoriteLabel,
}: {
  iso: string;
  day: DayRecord;
  images: LogImage[];
  todos: DayTodo[];
  entries: LogEntry[];
  flags: ShareFlags;
  favoriteLabel: string;
}) {
  const month = monthOf(iso);
  const header = headerFill(day.primaryTone, month);
  const weekday = WEEKDAYS[weekdayIndex(parseDate(iso))] ?? "";
  const p3 = (day.p3 ?? []).map((x) => x.trim()).filter(Boolean);
  const filledTodos = todos.filter((t) => t.body.trim());
  const thumbs = images.filter((img) => imageThumb(img));
  const extra = Math.max(0, thumbs.length - 18);
  const shown = extra > 0 ? thumbs.slice(0, 18) : thumbs;
  const journal = (day.journal ?? "").trim();

  return (
    <article
      className="w-[540px] bg-[#F3EEE4] text-[#1A1714]"
      style={{ fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, "Songti SC", serif' }}
    >
      {flags.color ? (
        <div className="relative h-10 w-full overflow-hidden">
          <div className="absolute inset-0" style={{ background: header.bg }} />
          {day.secondaryTone && day.secondaryTone !== "month" ? (
            <div
              className="absolute inset-y-0 right-0 w-1/5"
              style={{ background: TONE_COLORS[day.secondaryTone].bg }}
            />
          ) : null}
          <p
            className="relative px-7 py-2.5 text-[12px] tracking-wide"
            style={{ color: header.fg, width: day.secondaryTone ? "80%" : "100%" }}
          >
            {toneName(day.primaryTone, favoriteLabel)}
            {day.secondaryTone ? ` · ${toneName(day.secondaryTone, favoriteLabel)}` : ""}
          </p>
        </div>
      ) : null}

      <div className="px-8 pt-8 pb-7">
        <h1 className="font-display text-[32px] leading-tight font-medium tracking-tight">
          {formatFull(iso).replace(` ${weekday}`, "")}
        </h1>
        <p className="mt-1 text-[13px] text-[#1A1714]/55">星期{weekday}</p>

        {flags.header && day.headerNote.trim() ? (
          <p className="mt-3 text-[16px] font-medium">{day.headerNote.trim()}</p>
        ) : null}
        {flags.location && day.location.trim() ? (
          <p className="mt-1 text-[13px] text-[#1A1714]/60">{day.location.trim()}</p>
        ) : null}

        {flags.journal ? (
          <p className="mt-6 whitespace-pre-wrap text-[16px] leading-[1.85]">
            {journal || "这一天还没有写下正文。"}
          </p>
        ) : null}

        {flags.photos && shown.length ? (
          <div className="mt-6 grid grid-cols-6 gap-1">
            {shown.map((img, i) => (
              <div key={img.id} className="relative aspect-square overflow-hidden bg-[#e7e0d4]">
                <img src={imageThumb(img)} alt="" className="absolute inset-0 size-full object-cover" />
                {extra > 0 && i === shown.length - 1 ? (
                  <div className="absolute inset-0 grid place-items-center bg-[#1A1714]/45 text-[11px] text-white">
                    +{extra}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {flags.p3 && p3.length ? (
          <div className="mt-7">
            <p className="text-[11px] tracking-[0.2em] text-[#1A1714]/45">今日要紧事</p>
            <ol className="mt-2 space-y-2">
              {p3.map((item, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-snug">
                  <span className="mt-px w-5 shrink-0 text-[12px] text-[#1A1714]/40">{i + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {flags.todos && filledTodos.length ? (
          <div className="mt-7">
            <p className="text-[11px] tracking-[0.2em] text-[#1A1714]/45">待办</p>
            <ul className="mt-2 space-y-1.5">
              {filledTodos.map((t) => (
                <li key={t.id} className="flex gap-2 text-[14px] leading-snug">
                  <span className="mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-[2px] border border-[#1A1714]/30 text-[10px] leading-none">
                    {t.done ? "✓" : ""}
                  </span>
                  <span className={t.done ? "text-[#1A1714]/45 line-through" : ""}>{t.body.trim()}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {flags.entries && entries.length ? (
          <div className="mt-7">
            <p className="text-[11px] tracking-[0.2em] text-[#1A1714]/45">格子小条</p>
            <ul className="mt-2 space-y-1 text-[14px] leading-snug">
              {entries.map((e) => (
                <li key={e.id} className="text-[#1A1714]/80">
                  {e.body}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-8 text-[11px] tracking-wide text-[#1A1714]/30">记过就不会丢</p>
      </div>
    </article>
  );
}

export function ShareDayDialog({
  open,
  onClose,
  iso,
  day,
  images,
  todos,
  entries,
  favoriteLabel,
}: {
  open: boolean;
  onClose: () => void;
  iso: string;
  day: DayRecord;
  images: LogImage[];
  todos: DayTodo[];
  entries: LogEntry[];
  favoriteLabel: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [flags, setFlags] = useState<ShareFlags>(DEFAULT_FLAGS);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const filename = `SLog-${iso}.png`;

  function toggle(key: keyof ShareFlags) {
    setFlags((f) => ({ ...f, [key]: !f[key] }));
    setPreview(null);
  }

  async function generate() {
    const node = cardRef.current;
    if (!node) return;
    setBusy(true);
    setErr(null);
    setHint(null);
    try {
      await waitImages(node);
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#F3EEE4",
        cacheBust: true,
        width: 540,
        height: Math.max(node.scrollHeight, node.offsetHeight),
      });
      setPreview(dataUrl);
    } catch {
      setErr("这张图没生成出来，再试一次");
    } finally {
      setBusy(false);
    }
  }

  async function saveToAlbum() {
    if (!preview) return;
    setBusy(true);
    setErr(null);
    try {
      if (isAppleTouch()) {
        const result = await sharePng(preview, filename);
        if (result === "shared") setHint("在弹出的菜单里点「存储图像」，就会进系统相册。");
        else if (result === "cancel") setHint("也可以长按上面的预览图，选「存储图像」。");
        else setHint("已开始下载。若没进相册，长按预览图选「存储图像」。");
        return;
      }
      downloadPng(preview, filename);
      setHint("图片已保存到下载，相册里一般也能看到。");
    } catch {
      setErr("保存失败了，长按上面的预览图也可以存进相册");
    } finally {
      setBusy(false);
    }
  }

  async function shareOut() {
    if (!preview) return;
    setBusy(true);
    setErr(null);
    try {
      const result = await sharePng(preview, filename);
      if (result === "shared") setHint("已交给系统分享");
      if (result === "saved") setHint("这台设备没有分享面板，已改为下载");
    } catch {
      setErr("分享失败了，试试保存到相册，或长按预览图");
    } finally {
      setBusy(false);
    }
  }

  async function copyImage() {
    if (!preview) return;
    setBusy(true);
    setErr(null);
    try {
      const blob = dataUrlToBlob(preview);
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      setHint("已复制，可以直接粘贴");
    } catch {
      try {
        const blob = dataUrlToBlob(preview);
        const item = new ClipboardItem({ "image/png": Promise.resolve(blob) });
        await navigator.clipboard.write([item]);
        setHint("已复制，可以直接粘贴");
      } catch {
        setErr("这台设备不支持复制图片，用保存到相册，或长按预览图");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setPreview(null);
          setErr(null);
          setHint(null);
          onClose();
        }
      }}
    >
      <DialogContent
        overlayClassName="z-[120]"
        className="z-[120] flex max-h-[min(92vh,44rem)] w-[min(100%-1rem,40rem)] flex-col overflow-hidden p-0"
      >
        <div className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle>分享这一天</DialogTitle>
          <DialogDescription className="mt-1">
            生成一张图，不存到服务器。勾选要放进去的内容，默认是正文、照片和要紧事。
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="text-[11px] tracking-wide text-muted-foreground">要放进图里的</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                title={opt.hint}
                onClick={() => toggle(opt.key)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px]",
                  flags[opt.key]
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {flags[opt.key] ? <Check className="size-3" /> : null}
                {opt.label}
                {opt.def ? <span className="opacity-60">默认</span> : null}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-[#F3EEE4]">
            <div style={{ zoom: 0.62 }}>
              <ShareCard
                iso={iso}
                day={day}
                images={images}
                todos={todos}
                entries={entries}
                flags={flags}
                favoriteLabel={favoriteLabel}
              />
            </div>
          </div>
          <div className="pointer-events-none absolute -left-[9999px] top-0" aria-hidden>
            <div ref={cardRef}>
              <ShareCard
                iso={iso}
                day={day}
                images={images}
                todos={todos}
                entries={entries}
                flags={flags}
                favoriteLabel={favoriteLabel}
              />
            </div>
          </div>

          {preview ? (
            <img src={preview} alt="分享图预览" className="mt-4 w-full rounded-md border border-border" />
          ) : null}
          {err ? <p className="mt-2 text-xs text-destructive">{err}</p> : null}
          {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border px-5 py-3">
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              关闭
            </Button>
            <Button type="button" variant={preview ? "outline" : "default"} disabled={busy} onClick={() => void generate()}>
              {busy && !preview ? "正在生成…" : preview ? "重新生成" : "生成图片"}
            </Button>
          </div>
          {preview ? (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Button type="button" variant="outline" disabled={busy} onClick={() => void copyImage()}>
                <Copy className="size-3.5" />
                复制
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void shareOut()}>
                <Share2 className="size-3.5" />
                分享
              </Button>
              <Button type="button" className="col-span-2 sm:col-span-1" disabled={busy} onClick={() => void saveToAlbum()}>
                <ImageDown className="size-3.5" />
                保存到相册
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
