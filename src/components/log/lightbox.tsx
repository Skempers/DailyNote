import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadImage } from "@/lib/slog/api";
import { imageFull, isFullImage } from "@/lib/slog/compress-image";
import type { LogImage } from "@/lib/slog/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const fullCache = new Map<string, string>();

export function PhotoLightbox({
  images,
  index,
  onClose,
  onIndex,
  onDelete,
  onFull,
}: {
  images: LogImage[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
  onDelete?: (id: string) => void;
  onFull?: (img: LogImage) => void;
}) {
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [exiting, setExiting] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [src, setSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const [askDel, setAskDel] = useState(false);
  const total = images.length;
  const safeIndex = total ? ((index % total) + total) % total : 0;
  const current = total ? images[safeIndex] : undefined;

  function requestClose() {
    if (exiting) return;
    setAskDel(false);
    setExiting(true);
  }

  function resetView() {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }

  useEffect(() => {
    resetView();
    setAskDel(false);
  }, [safeIndex]);

  useEffect(() => {
    if (!current) {
      setSrc("");
      return;
    }
    const cached = fullCache.get(current.id);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      return;
    }
    if (isFullImage(current)) {
      fullCache.set(current.id, current.dataUrl);
      setSrc(current.dataUrl);
      setLoading(false);
      return;
    }
    const local = imageFull(current);
    if (local) {
      fullCache.set(current.id, local);
      setSrc(local);
      setLoading(false);
      return;
    }
    setSrc("");
    setLoading(true);
    let cancelled = false;
    void loadImage({ data: current.id })
      .then((full) => {
        if (cancelled) return;
        const url = full.dataUrl || "";
        if (url) fullCache.set(full.id, url);
        setSrc(url);
        onFull?.(full);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  useEffect(() => {
    if (!exiting) return;
    const t = window.setTimeout(() => onClose(), 520);
    return () => window.clearTimeout(t);
  }, [exiting, onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (askDel) setAskDel(false);
        else if (scale > 1) resetView();
        else requestClose();
      }
      if (askDel || scale > 1) return;
      if (e.key === "ArrowLeft") onIndex(safeIndex - 1);
      if (e.key === "ArrowRight") onIndex(safeIndex + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onIndex, safeIndex, scale, askDel]);

  if (typeof document === "undefined" || !current) return null;

  function prev(e?: { stopPropagation(): void; preventDefault(): void }) {
    e?.preventDefault();
    e?.stopPropagation();
    resetView();
    onIndex(safeIndex - 1);
  }
  function next(e?: { stopPropagation(): void; preventDefault(): void }) {
    e?.preventDefault();
    e?.stopPropagation();
    resetView();
    onIndex(safeIndex + 1);
  }

  function toggleZoom() {
    if (scale > 1) resetView();
    else setScale(2.4);
  }

  function confirmDelete() {
    if (!current || !onDelete) return;
    onDelete(current.id);
    setAskDel(false);
    if (total <= 1) requestClose();
    else onIndex(Math.min(safeIndex, total - 2));
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[90] flex touch-none items-center justify-center bg-[#1A1714]/82 p-3 transition-opacity duration-150",
        exiting && "opacity-0",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="查看照片"
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) e.preventDefault();
        startX.current = e.clientX;
        swiped.current = false;
      }}
      onPointerMove={(e) => {
        if (startX.current == null) return;
        if (Math.abs(e.clientX - startX.current) > 12) swiped.current = true;
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        const x0 = startX.current;
        startX.current = null;
        if (scale > 1 || askDel) return;
        const delta = x0 == null ? 0 : e.clientX - x0;
        if (Math.abs(delta) > 56) {
          if (delta > 0) prev();
          else next();
          return;
        }
        if (!swiped.current && e.target === e.currentTarget) requestClose();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onWheel={(e) => {
        e.preventDefault();
        const nextScale = Math.min(5, Math.max(1, scale * (e.deltaY < 0 ? 1.12 : 0.9)));
        setScale(nextScale);
        if (nextScale <= 1) setPan({ x: 0, y: 0 });
      }}
    >
      <button
        type="button"
        className="absolute top-3 right-3 z-10 rounded-full bg-background/90 px-3 py-1.5 text-xs text-foreground hover:bg-background"
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          requestClose();
        }}
      >
        关闭
      </button>

      {total > 1 && scale <= 1 ? (
        <button
          type="button"
          className="absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2 text-foreground hover:bg-background md:left-6"
          onPointerUp={(e) => e.stopPropagation()}
          onClick={prev}
          aria-label="上一张"
        >
          <ChevronLeft className="size-5" />
        </button>
      ) : null}

      {total > 1 && scale <= 1 ? (
        <button
          type="button"
          className="absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2 text-foreground hover:bg-background md:right-6"
          onPointerUp={(e) => e.stopPropagation()}
          onClick={next}
          aria-label="下一张"
        >
          <ChevronRight className="size-5" />
        </button>
      ) : null}

      <figure
        className="relative flex max-h-[90vh] max-w-[min(96vw,72rem)] flex-col items-center overflow-hidden"
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {src ? (
          <div className="relative">
            <img
              src={src}
              alt={current.caption || "照片"}
              className={cn(
                "max-h-[82vh] max-w-full rounded-md object-contain shadow-border",
                scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
              )}
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "center center" }}
              draggable={false}
              onClick={(e) => {
                e.stopPropagation();
                if (swiped.current) return;
                toggleZoom();
              }}
              onPointerDown={(e) => {
                if (scale <= 1) return;
                e.stopPropagation();
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
              }}
              onPointerMove={(e) => {
                if (!drag.current) return;
                setPan({
                  x: drag.current.px + (e.clientX - drag.current.x),
                  y: drag.current.py + (e.clientY - drag.current.y),
                });
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
            />
            {onDelete ? (
              <button
                type="button"
                className="absolute top-2 right-2 rounded-full bg-foreground/75 p-1.5 text-background hover:bg-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setAskDel(true);
                }}
                aria-label="删除照片"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid size-48 place-items-center rounded-md bg-muted text-sm text-muted-foreground">
            {loading ? "正在载入原图…" : "没有原图"}
          </div>
        )}
        <figcaption className="mt-3 text-xs text-background/80">
          {safeIndex + 1} / {total}
          {current.caption ? ` · ${current.caption}` : ""}
          <span className="ml-2 hidden opacity-70 md:inline">点击放大 · 滚轮缩放 · Esc 关闭</span>
        </figcaption>
      </figure>

      {askDel ? (
        <div
          className="absolute inset-0 z-20 grid place-items-center bg-[#1A1714]/50 p-4"
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-xs rounded-lg bg-card p-4 text-foreground shadow-border">
            <p className="font-display text-lg font-medium">删除这张照片？</p>
            <p className="mt-1 text-sm text-muted-foreground">删了就从这一天里拿掉，确认一下。</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAskDel(false)}>
                取消
              </Button>
              <Button type="button" size="sm" onClick={confirmDelete}>
                删除
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
