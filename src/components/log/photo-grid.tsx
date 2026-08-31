import { ImagePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { imageThumb } from "@/lib/slog/compress-image";
import type { LogImage } from "@/lib/slog/types";
import { cn } from "@/lib/utils";
import { PhotoLightbox } from "./lightbox";

export function PhotoGrid({
  images,
  size = "md",
  maxShow = 9,
  onDelete,
  onAdd,
  busy = false,
  canAdd = false,
}: {
  images: LogImage[];
  size?: "sm" | "md" | "editor";
  maxShow?: number;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  busy?: boolean;
  canAdd?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [shield, setShield] = useState(false);
  const shown = images.slice(0, maxShow);
  const extra = images.length - shown.length;

  useEffect(() => {
    if (!shield) return;
    const t = window.setTimeout(() => setShield(false), 500);
    return () => window.clearTimeout(t);
  }, [shield]);

  if (!shown.length && !canAdd && openIndex == null && !shield) return null;

  const editor = size === "editor";
  const cols = size === "sm" ? 3 : 4;

  return (
    <>
      <div
        className={cn(
          "grid min-w-0 gap-0.5",
          editor ? "grid-cols-[repeat(auto-fill,minmax(4rem,4rem))] gap-1" : cols === 3 ? "grid-cols-3" : "grid-cols-4",
        )}
      >
        {shown.map((img, i) => {
          const overflowLast = extra > 0 && i === shown.length - 1;
          const src = imageThumb(img);
          return (
            <button
              key={img.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setOpenIndex(i);
              }}
              className={cn(
                "group relative min-w-0 overflow-hidden rounded-[3px] bg-muted outline outline-1 -outline-offset-1 outline-foreground/10",
                editor ? "size-16" : "aspect-square",
              )}
              aria-label={`查看照片 ${i + 1}`}
            >
              {src ? (
                <img
                  src={src}
                  alt={img.caption || "照片"}
                  className="absolute inset-0 size-full object-cover"
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
              {onDelete && !overflowLast ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="absolute top-0.5 right-0.5 rounded-full bg-foreground/70 p-0.5 text-background md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
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
          images={images}
          index={openIndex}
          onClose={() => {
            setOpenIndex(null);
            setShield(true);
          }}
          onIndex={setOpenIndex}
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
