import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { imageFull } from "@/lib/slog/compress-image";
import type { LogImage } from "@/lib/slog/types";
import { cn } from "@/lib/utils";

export function PhotoLightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: LogImage[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [exiting, setExiting] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const total = images.length;
  const safeIndex = total ? ((index % total) + total) % total : 0;
  const current = total ? images[safeIndex] : undefined;
  const src = current ? imageFull(current) : "";

  function requestClose() {
    if (exiting) return;
    setExiting(true);
  }

  function resetView() {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }

  useEffect(() => {
    resetView();
  }, [safeIndex]);

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
        if (scale > 1) resetView();
        else requestClose();
      }
      if (scale > 1) return;
      if (e.key === "ArrowLeft") onIndex(safeIndex - 1);
      if (e.key === "ArrowRight") onIndex(safeIndex + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onIndex, safeIndex, scale]);

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
        if (scale > 1) return;
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
        className="absolute top-3 right-3 z-10 rounded-full bg-background/90 p-2 text-foreground hover:bg-background"
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          requestClose();
        }}
        aria-label="关闭"
      >
        <X className="size-4" />
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
        ) : (
          <div className="grid size-48 place-items-center rounded-md bg-muted text-sm text-muted-foreground">
            加载中…
          </div>
        )}
        <figcaption className="mt-3 text-xs text-background/80">
          {safeIndex + 1} / {total}
          {current.caption ? ` · ${current.caption}` : ""}
          <span className="ml-2 hidden opacity-70 md:inline">
            点击放大 · 滚轮缩放 · 拖动查看 · Esc 关闭
          </span>
        </figcaption>
      </figure>
    </div>,
    document.body,
  );
}
