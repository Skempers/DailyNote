import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { imageThumb } from "@/lib/slog/compress-image";
import type { LogImage } from "@/lib/slog/types";
import { cn } from "@/lib/utils";
import { PhotoLightbox } from "./lightbox";

const HOLD_MS = 380;

export function PhotoGrid({
  images,
  size = "md",
  maxShow = 9,
  onDelete,
  onAdd,
  onReorder,
  busy = false,
  canAdd = false,
}: {
  images: LogImage[];
  size?: "sm" | "md" | "editor";
  maxShow?: number;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  onReorder?: (next: LogImage[]) => void;
  busy?: boolean;
  canAdd?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [shield, setShield] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [live, setLive] = useState<LogImage[] | null>(null);
  const holdTimer = useRef<number | null>(null);
  const startPt = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const source = live ?? images;
  const shown = maxShow >= source.length ? source : source.slice(0, maxShow);
  const extra = source.length - shown.length;
  const canSort = Boolean(onReorder) && size === "editor";

  useEffect(() => {
    if (!shield) return;
    const t = window.setTimeout(() => setShield(false), 500);
    return () => window.clearTimeout(t);
  }, [shield]);

  useEffect(() => {
    return () => {
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
    };
  }, []);

  function clearHold() {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function finishDrag() {
    clearHold();
    if (dragId && live && didDrag.current) {
      onReorder?.(live.map((img, i) => ({ ...img, sortOrder: i })));
    }
    setDragId(null);
    setLive(null);
    startPt.current = null;
  }

  function moveOver(overId: string) {
    if (!dragId || dragId === overId) return;
    setLive((cur) => {
      const list = [...(cur ?? images)];
      const from = list.findIndex((x) => x.id === dragId);
      const to = list.findIndex((x) => x.id === overId);
      if (from < 0 || to < 0) return cur;
      didDrag.current = true;
      const next = [...list];
      const [item] = next.splice(from, 1);
      if (!item) return cur;
      next.splice(to, 0, item);
      return next;
    });
  }

  if (!shown.length && !canAdd && openIndex == null && !shield) return null;

  const editor = size === "editor";

  return (
    <>
      <div
        className={cn(
          "grid min-w-0 gap-0.5",
          editor
            ? "grid-cols-[repeat(auto-fill,minmax(4rem,4rem))] gap-1"
            : "grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] sm:grid-cols-4",
        )}
      >
        {shown.map((img, i) => {
          const overflowLast = extra > 0 && i === shown.length - 1;
          const src = imageThumb(img);
          return (
            <button
              key={img.id}
              type="button"
              data-photo-id={img.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (!canSort || overflowLast) return;
                didDrag.current = false;
                startPt.current = { x: e.clientX, y: e.clientY };
                const target = e.currentTarget;
                const pointerId = e.pointerId;
                clearHold();
                holdTimer.current = window.setTimeout(() => {
                  setDragId(img.id);
                  setLive([...imagesRef.current]);
                  try {
                    target.setPointerCapture(pointerId);
                  } catch {
                    /* ignore */
                  }
                  navigator.vibrate?.(12);
                }, HOLD_MS);
              }}
              onPointerMove={(e) => {
                if (dragId) {
                  const hit = document
                    .elementFromPoint(e.clientX, e.clientY)
                    ?.closest("[data-photo-id]")
                    ?.getAttribute("data-photo-id");
                  if (hit) moveOver(hit);
                  return;
                }
                const start = startPt.current;
                if (!start) return;
                if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) clearHold();
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                const dragged = Boolean(dragId) && didDrag.current;
                finishDrag();
                if (dragged) e.preventDefault();
              }}
              onPointerCancel={finishDrag}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (didDrag.current) {
                  didDrag.current = false;
                  return;
                }
                setOpenIndex(i);
              }}
              className={cn(
                "group relative min-w-0 overflow-hidden rounded-[3px] bg-muted outline outline-1 -outline-offset-1 outline-foreground/10",
                editor ? "size-16" : "aspect-square",
                dragId === img.id && "z-10 scale-105 ring-2 ring-primary",
                dragId && dragId !== img.id && "opacity-80",
              )}
              style={canSort ? { touchAction: "none" } : undefined}
              aria-label={canSort ? `照片 ${i + 1}，长按可调整顺序` : `查看照片 ${i + 1}`}
            >
              {src ? (
                <img
                  src={src}
                  alt={img.caption || "照片"}
                  className="pointer-events-none absolute inset-0 size-full object-cover"
                  draggable={false}
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-[10px] text-muted-foreground">图</span>
              )}
              {overflowLast ? (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/50 text-[11px] font-medium text-background">
                  +{extra}
                </div>
              ) : null}
              {onDelete && !overflowLast && !dragId ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="absolute top-0.5 right-0.5 rounded-full bg-foreground/70 p-0.5 text-background md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDelete(img.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      onDelete(img.id);
                    }
                  }}
                  aria-label="删除照片"
                >
                  <X className="size-3" />
                </span>
              ) : null}
            </button>
          );
        })}
        {canAdd && onAdd ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            disabled={busy}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-[3px] border border-dashed border-border text-[10px] text-muted-foreground hover:bg-muted",
              editor ? "size-16" : "aspect-square min-w-0",
            )}
          >
            <ImagePlus className={editor ? "size-3.5" : "size-4"} />
            {busy ? "处理中" : "添加"}
          </button>
        ) : null}
      </div>
      {openIndex != null && images.length ? (
        <PhotoLightbox
          images={live ?? images}
          index={openIndex}
          onClose={() => {
            setOpenIndex(null);
            setShield(true);
          }}
          onIndex={setOpenIndex}
          onDelete={onDelete}
        />
      ) : null}
      {shield && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[85]"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />,
            document.body,
          )
        : null}
    </>
  );
}
