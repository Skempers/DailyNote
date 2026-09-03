import { FileSpreadsheet, Image as ImageIcon, X } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  datesInView,
  inSheet,
  monthOf,
  parseSheetKey,
  semesterWeek,
  stayWeek,
  toISODate,
  viewRangeLabel,
  WEEKDAYS,
  weekOf,
  weeksOfSheet,
} from "@/lib/slog/calendar";
import { TONE_COLORS } from "@/lib/slog/colors";
import { exportNodePng, exportViewExcel } from "@/lib/slog/export";
import type { LogSnapshot, ViewMode } from "@/lib/slog/types";
import { cn } from "@/lib/utils";
import { DayCell } from "./day-cell";

function locationForWeek(days: string[], snap: LogSnapshot) {
  for (const iso of days) {
    if (!inSheet(iso, snap.sheetKey)) continue;
    const span = snap.spans.find((s) => iso >= s.startDate && iso <= s.endDate);
    if (span) return span.label;
    const loc = snap.days[iso]?.location;
    if (loc) return loc;
  }
  return null;
}

export function OverviewDialog({
  open,
  onClose,
  snap,
  view,
  weekMonday,
  month,
  selected,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  snap: LogSnapshot;
  view: ViewMode;
  weekMonday: string;
  month: number;
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"png" | "xls" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { year } = parseSheetKey(snap.sheetKey);
  const opts = { sheetKey: snap.sheetKey, weekMonday, year, month };
  const label = viewRangeLabel(view, opts);
  const dates = datesInView(view, opts);

  async function savePng() {
    if (!rootRef.current) return;
    setBusy("png");
    setError(null);
    try {
      await exportNodePng(rootRef.current, `SLog-${label.replace(/[\\/:*?"<>|]/g, "-")}.png`);
    } catch {
      setError("图片导出失败，请再试一次");
    } finally {
      setBusy(null);
    }
  }

  function saveXls() {
    setBusy("xls");
    setError(null);
    try {
      exportViewExcel(snap, dates, view, opts);
    } catch {
      setError("表格导出失败，请再试一次");
    } finally {
      setBusy(null);
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-background">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2 md:px-5">
        <div>
          <p className="font-display text-lg leading-tight font-medium">看全 · {label}</p>
          <p className="text-[11px] text-muted-foreground">当前视图里的全部格子，可导出图片或 Excel</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => void savePng()} disabled={Boolean(busy)}>
            <ImageIcon className="size-3.5" />
            {busy === "png" ? "正在出图" : "导出图片"}
          </Button>
          <Button variant="outline" size="sm" onClick={saveXls} disabled={Boolean(busy)}>
            <FileSpreadsheet className="size-3.5" />
            {busy === "xls" ? "正在写出" : "导出 Excel"}
          </Button>
          <Button variant="ghost" size="icon" aria-label="关闭看全" onClick={onClose}>
            <X />
          </Button>
        </div>
      </header>
      {error ? <p className="px-5 py-2 text-sm text-destructive">{error}</p> : null}
      <div className="min-h-0 flex-1 overflow-auto p-3 md:p-5">
        <div ref={rootRef} className="bg-background p-2">
          <p className="mb-2 font-display text-base font-medium">SLog · {label}</p>
          {view === "week" ? (
            <WeekOverview snap={snap} mondayIso={weekMonday} selected={selected} onSelect={onSelect} />
          ) : null}
          {view === "month" ? (
            <MonthOverview snap={snap} year={year} month={month} selected={selected} onSelect={onSelect} />
          ) : null}
          {view === "half" ? (
            <HalfOverview snap={snap} selected={selected} onSelect={onSelect} />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function WeekOverview({
  snap,
  mondayIso,
  selected,
  onSelect,
}: {
  snap: LogSnapshot;
  mondayIso: string;
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  const days = weekOf(mondayIso).days.map(toISODate);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1.5 text-center text-xs font-medium text-ink-soft">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((iso) => (
          <DayCell
            key={iso}
            iso={iso}
            sheetKey={snap.sheetKey}
            day={snap.days[iso]}
            entries={snap.entries[iso] ?? []}
            images={snap.images?.[iso] ?? []}
            todos={snap.todos?.[iso] ?? []}
            spans={snap.spans}
            selected={selected === iso}
            onSelect={onSelect}
            density="week"
          />
        ))}
      </div>
    </div>
  );
}

function MonthOverview({
  snap,
  year,
  month,
  selected,
  onSelect,
}: {
  snap: LogSnapshot;
  year: number;
  month: number;
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  const first = new Date(year, month - 1, 1);
  const startPad = (first.getDay() + 6) % 7;
  const lastDate = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: lastDate }, (_, i) => {
      const d = String(i + 1).padStart(2, "0");
      const m = String(month).padStart(2, "0");
      return `${year}-${m}-${d}`;
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1.5 text-center text-xs font-medium text-ink-soft">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((iso, idx) => {
          if (!iso) return <div key={`p-${idx}`} className="min-h-28 border-r border-b border-border/50 bg-muted/30" />;
          return (
            <DayCell
              key={iso}
              iso={iso}
              sheetKey={snap.sheetKey}
              day={snap.days[iso]}
              entries={snap.entries[iso] ?? []}
              images={snap.images?.[iso] ?? []}
              todos={snap.todos?.[iso] ?? []}
              spans={snap.spans}
              selected={selected === iso}
              onSelect={onSelect}
              density="month"
            />
          );
        })}
      </div>
    </div>
  );
}

function HalfOverview({
  snap,
  selected,
  onSelect,
}: {
  snap: LogSnapshot;
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  const weeks = weeksOfSheet(snap.sheetKey);
  return (
    <div
      className="grid w-full overflow-hidden rounded-lg border border-border bg-card"
      style={{ gridTemplateColumns: "2rem repeat(7, minmax(0, 1fr))" }}
    >
      <div className="border-b border-r border-border bg-muted py-1 text-center text-[10px] text-muted-foreground">
        周
      </div>
      {WEEKDAYS.map((w) => (
        <div
          key={w}
          className="border-b border-r border-border bg-muted py-1 text-center text-[10px] font-medium text-ink-soft"
        >
          {w}
        </div>
      ))}
      {weeks.map((week) => {
        const days = week.days.map(toISODate);
        const weekHasImportant = days.some((iso) => snap.days[iso]?.primaryTone === "important");
        const sem = semesterWeek(week.mondayIso, snap.settings.semesterStart);
        const stay = stayWeek(week.mondayIso, snap.spans);
        const loc = locationForWeek(days, snap);
        return (
          <WeekStrip
            key={week.mondayIso}
            days={days}
            snap={snap}
            selected={selected}
            onSelect={onSelect}
            weekHasImportant={weekHasImportant}
            label={sem ?? stay}
            loc={loc}
          />
        );
      })}
    </div>
  );
}

function WeekStrip({
  days,
  snap,
  selected,
  onSelect,
  weekHasImportant,
  label,
  loc,
}: {
  days: string[];
  snap: LogSnapshot;
  selected: string | null;
  onSelect: (iso: string) => void;
  weekHasImportant: boolean;
  label: number | null;
  loc: string | null;
}) {
  return (
    <>
      <div
        className={cn(
          "flex flex-col items-center justify-center border-r border-b border-border text-[10px] tabular-nums",
          weekHasImportant ? "font-semibold" : "text-muted-foreground",
        )}
        style={
          weekHasImportant
            ? { background: TONE_COLORS.important.bg, color: TONE_COLORS.important.fg }
            : undefined
        }
        title={loc ?? undefined}
      >
        <span>{label ?? "·"}</span>
      </div>
      {days.map((iso) => (
        <OverviewSwatch
          key={iso}
          iso={iso}
          snap={snap}
          selected={selected === iso}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function OverviewSwatch({
  iso,
  snap,
  selected,
  onSelect,
}: {
  iso: string;
  snap: LogSnapshot;
  selected: boolean;
  onSelect: (iso: string) => void;
}) {
  const inRange = inSheet(iso, snap.sheetKey);
  const day = snap.days[iso];
  const tone = day?.primaryTone ?? "month";
  const header = tone === "month"
    ? { bg: `var(--color-month-${monthOf(iso)})`, fg: `var(--color-month-${monthOf(iso)}-fg)` }
    : { bg: TONE_COLORS[tone].bg, fg: TONE_COLORS[tone].fg };
  const secondary = day?.secondaryTone && day.secondaryTone !== "month" ? day.secondaryTone : null;
  const snippet = (day?.journal ?? day?.headerNote ?? "").trim();

  return (
    <button
      type="button"
      data-date={iso}
      onClick={() => onSelect(iso)}
      className={cn(
        "relative min-h-14 min-w-0 overflow-hidden border-r border-b border-border/80 text-left",
        !inRange && "opacity-30",
        selected && "z-10 ring-2 ring-primary ring-inset",
      )}
      style={{ background: "var(--color-card)" }}
    >
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0" style={{ background: inRange ? header.bg : "var(--color-muted)" }} />
        {secondary ? (
          <div className="absolute inset-y-0 right-0 w-1/5" style={{ background: TONE_COLORS[secondary].bg }} />
        ) : null}
        <div className="relative px-1 py-0.5 text-[10px] leading-4 font-medium tabular-nums" style={{ color: header.fg }}>
          {Number(iso.slice(8, 10))}
          {day?.headerNote ? <span className="ml-1 font-normal opacity-80">{day.headerNote}</span> : null}
        </div>
      </div>
      {snippet ? (
        <p className="line-clamp-2 px-1 py-0.5 text-[9px] leading-snug text-foreground/80">{snippet}</p>
      ) : null}
    </button>
  );
}
