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
  const [exiting, setExiting] = useState(false);
  const total = images.length;
  const safeIndex = total ? ((index % total) + total) % total : 0;
  const current = total ? images[safeIndex] : undefined;
  const src = current ? imageFull(current) : "";

  function requestClose() {
    if (exiting) return;
    setExiting(true);
  }

  useEffect(() => {
    if (!exiting) return;
    const t = window.setTimeout(() => onClose(), 520);
    return () => window.clearTimeout(t);
  }, [exiting, onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
      if (e.key === "ArrowLeft") onIndex(safeIndex - 1);
      if (e.key === "ArrowRight") onIndex(safeIndex + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onIndex, safeIndex]);

  if (typeof document === "undefined" || !current) return null;

  function prev(e?: { stopPropagation(): void; preventDefault(): void }) {
    e?.preventDefault();
    e?.stopPropagation();
    onIndex(safeIndex - 1);
  }
  function next(e?: { stopPropagation(): void; preventDefault(): void }) {
    e?.preventDefault();
    e?.stopPropagation();
    onIndex(safeIndex + 1);
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

      {total > 1 ? (
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

      {total > 1 ? (
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
        className="relative flex max-h-[90vh] max-w-[min(96vw,72rem)] flex-col items-center"
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {src ? (
          <img
            src={src}
            alt={current.caption || "照片"}
            className="max-h-[82vh] max-w-full rounded-md object-contain shadow-border"
            draggable={false}
          />
        ) : (
          <div className="grid size-48 place-items-center rounded-md bg-muted text-sm text-muted-foreground">
            加载中…
          </div>
        )}
        <figcaption className="mt-3 text-xs text-background/80">
          {safeIndex + 1} / {total}
          {current.caption ? ` · ${current.caption}` : ""}
          <span className="ml-2 hidden opacity-70 md:inline">← → 切换 · Esc 关闭</span>
        </figcaption>
      </figure>
    </div>,
    document.body,
  );
}
