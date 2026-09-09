import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { loadImage } from "@/lib/slog/api";
import { imageFull, isFullImage } from "@/lib/slog/compress-image";
import type { LogImage } from "@/lib/slog/types";
import { cn } from "@/lib/utils";

const fullCache = new Map<string, string>();
const MIN_SCALE = 1;
const MAX_SCALE = 6;

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

export function PhotoLightbox({
  images,
  index,
  onClose,
  onIndex,
  onFull,
}: {
  images: LogImage[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
  onFull?: (img: LogImage) => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const scaleRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    moved: boolean;
    ax: number;
    ay: number;
    px: number;
    py: number;
    dist: number;
    startScale: number;
  }>({ moved: false, ax: 0, ay: 0, px: 0, py: 0, dist: 0, startScale: 1 });
  const [exiting, setExiting] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [src, setSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const total = images.length;
  const safeIndex = total ? ((index % total) + total) % total : 0;
  const current = total ? images[safeIndex] : undefined;

  function requestClose() {
    if (exiting) return;
    setExiting(true);
  }

  function commitView(nextScale: number, nextPan: { x: number; y: number }) {
    const s = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    const p = s <= 1.01 ? { x: 0, y: 0 } : nextPan;
    scaleRef.current = s <= 1.01 ? 1 : s;
    panRef.current = p;
    setScale(scaleRef.current);
    setPan(p);
  }

  function resetView() {
    commitView(1, { x: 0, y: 0 });
  }

  function zoomAt(clientX: number, clientY: number, nextScale: number) {
    const prev = scaleRef.current;
    const s = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    if (s <= 1.01) {
      commitView(1, { x: 0, y: 0 });
      return;
    }
    const img = imgRef.current;
    if (!img || prev <= 0) {
      commitView(s, panRef.current);
      return;
    }
    const rect = img.getBoundingClientRect();
    const cx = clientX - (rect.left + rect.width / 2);
    const cy = clientY - (rect.top + rect.height / 2);
    const factor = 1 - s / prev;
    commitView(s, {
      x: panRef.current.x + cx * factor,
      y: panRef.current.y + cy * factor,
    });
  }

  useEffect(() => {
    resetView();
    pointers.current.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const t = window.setTimeout(() => onClose(), 180);
    return () => window.clearTimeout(t);
  }, [exiting, onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (scaleRef.current > 1) resetView();
        else requestClose();
      }
      if (scaleRef.current > 1) return;
      if (e.key === "ArrowLeft") onIndex(safeIndex - 1);
      if (e.key === "ArrowRight") onIndex(safeIndex + 1);
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      zoomAt(e.clientX, e.clientY, scaleRef.current * factor);
    }
    window.addEventListener("keydown", onKey);
    const shell = shellRef.current;
    shell?.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      shell?.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onIndex, safeIndex]);

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

  function pinchDist() {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return 0;
    const a = pts[0]!;
    const b = pts[1]!;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function pinchCenter() {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return { x: 0, y: 0 };
    return { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 };
  }

  function onShellPointerDown(e: ReactPointerEvent) {
    if (e.target !== e.currentTarget) return;
    gesture.current.moved = false;
    gesture.current.ax = e.clientX;
    gesture.current.ay = e.clientY;
  }

  function onShellPointerMove(e: ReactPointerEvent) {
    if (e.target !== e.currentTarget) return;
    const g = gesture.current;
    if (Math.hypot(e.clientX - g.ax, e.clientY - g.ay) > 10) g.moved = true;
  }

  function onShellPointerUp(e: ReactPointerEvent) {
    if (e.target !== e.currentTarget) return;
    const g = gesture.current;
    const dx = e.clientX - g.ax;
    const dy = e.clientY - g.ay;
    if (!g.moved) {
      requestClose();
      return;
    }
    if (scaleRef.current > 1) return;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) prev();
      else next();
    } else if (dy > 72) {
      requestClose();
    }
  }

  function onImgPointerDown(e: ReactPointerEvent<HTMLImageElement>) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    g.moved = false;
    g.ax = e.clientX;
    g.ay = e.clientY;
    g.px = panRef.current.x;
    g.py = panRef.current.y;
    g.startScale = scaleRef.current;
    g.dist = pinchDist();
  }

  function onImgPointerMove(e: ReactPointerEvent<HTMLImageElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size >= 2) {
      const dist = pinchDist();
      if (g.dist > 0 && dist > 0) {
        g.moved = true;
        const mid = pinchCenter();
        zoomAt(mid.x, mid.y, g.startScale * (dist / g.dist));
      }
      return;
    }
    const dx = e.clientX - g.ax;
    const dy = e.clientY - g.ay;
    if (Math.hypot(dx, dy) > 8) g.moved = true;
    if (scaleRef.current > 1 && g.moved) {
      commitView(scaleRef.current, { x: g.px + dx, y: g.py + dy });
    }
  }

  function onImgPointerUp(e: ReactPointerEvent<HTMLImageElement>) {
    e.stopPropagation();
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      const g = gesture.current;
      g.ax = e.clientX;
      g.ay = e.clientY;
      g.px = panRef.current.x;
      g.py = panRef.current.y;
      g.startScale = scaleRef.current;
      g.dist = pinchDist();
      return;
    }
    const g = gesture.current;
    const dx = e.clientX - g.ax;
    const dy = e.clientY - g.ay;
    if (g.moved) {
      if (scaleRef.current <= 1 && Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) prev();
        else next();
      }
      return;
    }
    if (scaleRef.current > 1) resetView();
    else zoomAt(e.clientX, e.clientY, 2.4);
  }

  return createPortal(
    <div
      ref={shellRef}
      className={cn(
        "fixed inset-0 z-[90] flex touch-none items-center justify-center bg-[#1A1714]/82 p-3 transition-opacity duration-150",
        exiting && "opacity-0",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="查看照片"
      onPointerDown={onShellPointerDown}
      onPointerMove={onShellPointerMove}
      onPointerUp={onShellPointerUp}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        className="absolute top-3 right-3 z-10 rounded-full bg-background/90 p-2 text-foreground hover:bg-background"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          requestClose();
        }}
        aria-label="退出预览"
      >
        <X className="size-4" />
      </button>

      {total > 1 && scale <= 1 ? (
        <button
          type="button"
          className="absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2 text-foreground hover:bg-background md:left-6"
          onPointerDown={(e) => e.stopPropagation()}
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
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={next}
          aria-label="下一张"
        >
          <ChevronRight className="size-5" />
        </button>
      ) : null}

      <figure className="pointer-events-none relative flex max-h-[90vh] max-w-[min(96vw,72rem)] flex-col items-center">
        {src ? (
          <img
            ref={imgRef}
            src={src}
            alt={current.caption || "照片"}
            className={cn(
              "pointer-events-auto max-h-[82vh] max-w-full rounded-md object-contain shadow-border",
              scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
            )}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "center center" }}
            draggable={false}
            onPointerDown={onImgPointerDown}
            onPointerMove={onImgPointerMove}
            onPointerUp={onImgPointerUp}
            onPointerCancel={onImgPointerUp}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        ) : (
          <div className="grid size-48 place-items-center rounded-md bg-muted text-sm text-muted-foreground">
            {loading ? "正在载入原图…" : "没有原图"}
          </div>
        )}
        <figcaption className="mt-3 text-xs text-background/80">
          {safeIndex + 1} / {total}
          {current.caption ? ` · ${current.caption}` : ""}
          <span className="ml-2 hidden opacity-70 md:inline">点击放大 · 滚轮缩放 · 点空白关闭</span>
        </figcaption>
      </figure>
    </div>,
    document.body,
  );
}
