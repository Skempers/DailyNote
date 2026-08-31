import { Star } from "lucide-react";
import { memo } from "react";
import { ENTRY_CLASS, headerFill, TONE_COLORS } from "@/lib/slog/colors";
import { inSheet, isFuture, isToday, monthOf } from "@/lib/slog/calendar";
import type { DayRecord, LogEntry, LogImage, LogSpan, ViewMode } from "@/lib/slog/types";
import { cn } from "@/lib/utils";
import { MarkerIcon } from "./markers";
import { PhotoGrid } from "./photo-grid";

export const DayCell = memo(function DayCell({
  iso,
  sheetKey,
  day,
  entries,
  images,
  spans,
  selected,
  onSelect,
  density = "half",
}: {
  iso: string;
  sheetKey: string;
  day?: DayRecord;
  entries: LogEntry[];
  images?: LogImage[];
  spans: LogSpan[];
  selected: boolean;
  onSelect: (iso: string) => void;
  density?: ViewMode | "overview";
}) {
  const month = monthOf(iso);
  const inRange = inSheet(iso, sheetKey);
  const tone = day?.primaryTone ?? "month";
  const header = headerFill(tone, month);
  const secondary = day?.secondaryTone && day.secondaryTone !== "month" ? day.secondaryTone : null;
  const today = isToday(iso);
  const future = isFuture(iso);
  const inSpan = spans.find((s) => iso >= s.startDate && iso <= s.endDate);
  const dateNum = Number(iso.slice(8, 10));
  const wash = tone === "month" ? undefined : TONE_COLORS[tone].wash;
  const journal = (day?.journal ?? "").trim();
  const p3 = (day?.p3 ?? []).filter(Boolean).slice(0, 3);
  const compact = density === "overview";
  const thumbMax = density === "week" ? 9 : density === "month" ? 6 : compact ? 3 : 6;

  const minH = compact
    ? "min-h-16"
    : density === "week"
      ? "h-full min-h-[20rem]"
      : density === "month"
        ? "min-h-44"
        : "min-h-28";
  const journalClamp = compact
    ? "line-clamp-2"
    : density === "week"
      ? "line-clamp-[18]"
      : density === "month"
        ? "line-clamp-8"
        : "line-clamp-5";
  const entryClamp = compact ? 1 : density === "week" ? 8 : density === "month" ? 5 : 3;
  const journalSize = compact
    ? "text-[10px] leading-snug"
    : density === "week"
      ? "text-[13px] leading-relaxed"
      : density === "month"
        ? "text-[12px] leading-snug"
        : "text-[11px] leading-snug";

  return (
    <div
      role="button"
      tabIndex={inRange ? 0 : -1}
      onClick={(e) => {
        if ((e.target as HTMLElement | null)?.closest("button, a, input")) return;
        onSelect(iso);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(iso);
        }
      }}
      data-date={iso}
      className={cn(
        "relative flex h-full min-w-0 w-full flex-col overflow-hidden border-r border-b border-border/80 text-left transition-[box-shadow,background-color] duration-150",
        minH,
        !inRange && "opacity-40",
        selected && "z-10 ring-2 ring-primary ring-inset",
        today && !selected && "ring-1 ring-primary/40 ring-inset",
        inSpan && "border-l-2",
      )}
      style={{
        background: wash
          ? future
            ? `color-mix(in oklab, ${wash} 94%, var(--color-muted))`
            : wash
          : future
            ? "color-mix(in oklab, var(--color-card) 93%, var(--color-muted))"
            : "var(--color-card)",
        borderLeftColor: inSpan ? `var(--color-${inSpan.color})` : undefined,
      }}
    >
      <div className="relative isolate min-w-0 overflow-hidden">
        <div className="absolute inset-0" style={{ background: inRange ? header.bg : "var(--color-muted)" }} />
        {secondary ? (
          <div
            className="absolute inset-y-0 right-0 w-1/5"
            style={{ background: TONE_COLORS[secondary].bg }}
            aria-hidden
          />
        ) : null}
        <div
          className={cn(
            "relative flex min-w-0 items-center gap-1 px-1.5 py-1 text-[11px] leading-5",
            secondary ? "w-4/5" : "w-full",
          )}
          style={{ color: header.fg }}
        >
          <span className="shrink-0 font-medium tabular-nums">{dateNum}</span>
          {day?.headerNote ? (
            <span className="min-w-0 flex-1 truncate text-[10px] leading-5 opacity-90">{day.headerNote}</span>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {today ? (
            <span className="shrink-0 rounded-full bg-primary px-1 text-[9px] leading-5 text-primary-foreground">
              今
            </span>
          ) : future ? (
            <span className="shrink-0 text-[11px] leading-none text-foreground/40" aria-hidden>
              ✧
            </span>
          ) : null}
        </div>
      </div>
      {p3.length && !compact ? (
        <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 overflow-hidden px-1.5 pt-1">
          {p3.map((p) => (
            <span key={p} className="text-[9px] font-semibold underline decoration-foreground/40">
              {p}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-hidden px-1.5 py-1">
        {journal ? (
          <p className={cn("min-w-0 break-all whitespace-pre-wrap text-foreground/90", journalSize, journalClamp)}>
            {journal}
          </p>
        ) : null}
        {entries.length ? (
          <ul className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-0.5">
            {entries.slice(0, entryClamp).map((e) => (
              <li
                key={e.id}
                className={cn(
                  "inline-flex max-w-full min-w-0 items-start gap-0.5 break-all whitespace-pre-wrap text-[11px] leading-snug",
                  density === "half" && "line-clamp-2",
                  density === "month" && "line-clamp-3",
                  compact && "line-clamp-1",
                  ENTRY_CLASS[e.kind] ?? "text-foreground",
                  e.emphasis === "large" && "text-xs font-semibold",
                  e.emphasis === "bold" && "font-semibold",
                )}
              >
                <MarkerIcon marker={e.marker} className="mt-0.5 size-3 shrink-0 opacity-80" />
                <span className="min-w-0 flex-1">{e.body}</span>
                {e.starred ? <Star className="mt-0.5 size-2.5 shrink-0 fill-current" /> : null}
              </li>
            ))}
            {entries.length > entryClamp ? (
              <li className="text-[10px] text-muted-foreground">+{entries.length - entryClamp}</li>
            ) : null}
          </ul>
        ) : null}
        {images?.length ? (
          <div className="min-w-0">
            <PhotoGrid images={images} size="sm" maxShow={thumbMax} />
          </div>
        ) : null}
      </div>
    </div>
  );
});
