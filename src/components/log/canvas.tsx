import { SPAN_SWATCH, TONE_COLORS } from "@/lib/slog/colors";
import {
  inSheet,
  monthOf,
  semesterWeek,
  stayWeek,
  toISODate,
  WEEKDAYS,
  weekOf,
  weeksOfSheet,
} from "@/lib/slog/calendar";
import type { LogNote, LogSnapshot, ViewMode } from "@/lib/slog/types";
import { cn } from "@/lib/utils";
import { DayCell } from "./day-cell";

export function SemesterCanvas({
  snap,
  selected,
  onSelect,
  onAddWeekNote,
  onEditNote,
  onAddSheetNote,
  density = "half",
}: {
  snap: LogSnapshot;
  selected: string | null;
  onSelect: (iso: string) => void;
  onAddWeekNote: (mondayIso: string) => void;
  onEditNote?: (note: LogNote) => void;
  onAddSheetNote?: () => void;
  density?: ViewMode;
}) {
  const weeks = weeksOfSheet(snap.sheetKey);
  const sheetNotes = snap.notes.filter((n) => !n.weekStart);

  return (
    <div className="min-w-0 overflow-x-auto">
      <div className="mb-3 grid gap-2 md:grid-cols-3">
        {sheetNotes.map((n) => (
          <SheetNoteCard key={n.id} note={n} onEdit={onEditNote} />
        ))}
        {onAddSheetNote ? (
          <button
            type="button"
            onClick={onAddSheetNote}
            className="rounded-lg border border-dashed border-border bg-card/60 p-3 text-left text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <p className="text-[10px] font-medium tracking-wide uppercase">给自己的话</p>
            <p className="mt-1">写一句放在表头。点卡片可改、可删。</p>
          </button>
        ) : null}
      </div>

      <div
        className="grid w-full min-w-[72rem] overflow-hidden rounded-lg border border-border bg-card"
        style={{
          gridTemplateColumns: "2.5rem 4.5rem repeat(7, minmax(6.5rem, 1fr)) 12rem",
        }}
      >
        <div className="border-b border-r border-border bg-muted px-1 py-2 text-center text-[10px] font-medium text-muted-foreground">
          周
        </div>
        <div className="border-b border-r border-border bg-muted px-1 py-2 text-center text-[10px] font-medium text-muted-foreground">
          地
        </div>
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="border-b border-r border-border bg-muted py-2 text-center text-xs font-medium text-ink-soft"
          >
            {w}
          </div>
        ))}
        <div className="border-b border-border bg-muted px-2 py-2 text-[10px] font-medium text-muted-foreground">
          备注 · 康奈尔留白
        </div>

        {weeks.map((week) => {
          const weekHasImportant = week.days.some((d) => {
            const iso = toISODate(d);
            return snap.days[iso]?.primaryTone === "important";
          });
          const loc = locationForWeek(week.days.map(toISODate), snap);
          const weekNotes = snap.notes.filter((n) => n.weekStart === week.mondayIso);
          const sem = semesterWeek(week.mondayIso, snap.settings.semesterStart);
          const stay = stayWeek(week.mondayIso, snap.spans);

          return (
            <WeekRow
              key={week.mondayIso}
              weekIso={week.mondayIso}
              days={week.days.map(toISODate)}
              snap={snap}
              selected={selected}
              onSelect={onSelect}
              weekHasImportant={weekHasImportant}
              loc={loc}
              weekNotes={weekNotes}
              sem={sem}
              stay={stay}
              onAddWeekNote={onAddWeekNote}
              density={density}
            />
          );
        })}
      </div>
    </div>
  );
}

function WeekRow({
  weekIso,
  days,
  snap,
  selected,
  onSelect,
  weekHasImportant,
  loc,
  weekNotes,
  sem,
  stay,
  onAddWeekNote,
  density,
}: {
  weekIso: string;
  days: string[];
  snap: LogSnapshot;
  selected: string | null;
  onSelect: (iso: string) => void;
  weekHasImportant: boolean;
  loc: { label: string; color: string } | null;
  weekNotes: LogNote[];
  sem: number | null;
  stay: number | null;
  onAddWeekNote: (mondayIso: string) => void;
  density: ViewMode;
}) {
  return (
    <>
      <div
        className={cn(
          "flex flex-col items-center justify-center border-r border-b border-border text-xs tabular-nums",
          weekHasImportant ? "font-semibold" : "text-muted-foreground",
        )}
        style={
          weekHasImportant
            ? { background: TONE_COLORS.important.bg, color: TONE_COLORS.important.fg }
            : undefined
        }
        title={sem ? `学期第 ${sem} 周` : "周序"}
      >
        <span>{sem ?? stay ?? "·"}</span>
        {sem && stay ? <span className="text-[9px] opacity-70">{stay}</span> : null}
      </div>
      <div
        className="flex items-center justify-center border-r border-b border-border px-1"
        style={
          loc
            ? {
                background: `color-mix(in oklab, ${SPAN_SWATCH[loc.color] ?? "var(--color-muted)"} 55%, white)`,
              }
            : undefined
        }
      >
        {loc ? (
          <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight">{loc.label}</span>
        ) : null}
      </div>
      {days.map((iso) => (
        <DayCell
          key={iso}
          iso={iso}
          sheetKey={snap.sheetKey}
          day={snap.days[iso]}
          entries={snap.entries[iso] ?? []}
          images={snap.images?.[iso] ?? []}
          spans={snap.spans}
          selected={selected === iso}
          onSelect={onSelect}
          density={density}
        />
      ))}
      <div className="flex flex-col gap-1 border-b border-border bg-card p-1.5">
        {weekNotes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onSelect(n.weekStart ?? days[0]!)}
            className={cn(
              "rounded-sm px-1.5 py-1 text-left text-[11px] leading-snug",
              n.emphasized && "font-semibold",
            )}
            style={
              n.tone && n.tone !== "month"
                ? {
                    background: TONE_COLORS[n.tone].wash,
                    color: TONE_COLORS[n.tone].fg,
                  }
                : { background: "var(--color-muted)" }
            }
          >
            {n.title ? <div className="font-medium">{n.title}</div> : null}
            <div className="line-clamp-2 whitespace-pre-wrap text-foreground/80">{n.body}</div>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onAddWeekNote(weekIso)}
          className="rounded-sm px-1.5 py-1 text-left text-[10px] text-muted-foreground hover:bg-muted"
        >
          + 本周备注
        </button>
      </div>
    </>
  );
}

function locationForWeek(days: string[], snap: LogSnapshot) {
  for (const iso of days) {
    if (!inSheet(iso, snap.sheetKey)) continue;
    const span = snap.spans.find((s) => iso >= s.startDate && iso <= s.endDate);
    if (span) return { label: span.label, color: span.color };
    const loc = snap.days[iso]?.location;
    if (loc) return { label: loc, color: "trip-ink" };
  }
  return null;
}

function SheetNoteCard({ note, onEdit }: { note: LogNote; onEdit?: (note: LogNote) => void }) {
  return (
    <button
      type="button"
      onClick={() => onEdit?.(note)}
      className="rounded-lg p-3 text-left shadow-border transition-opacity hover:opacity-90"
      style={
        note.tone && note.tone !== "month"
          ? { background: TONE_COLORS[note.tone].wash, color: TONE_COLORS[note.tone].fg }
          : { background: "var(--color-card)" }
      }
    >
      <p className="text-[10px] font-medium tracking-wide uppercase opacity-70">
        {note.kind === "quote" ? "给自己的话" : note.kind === "plan" ? "半年备忘" : "备注"}
      </p>
      {note.title ? (
        <h3 className="mt-1 font-display text-base font-medium leading-snug">{note.title}</h3>
      ) : null}
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{note.body || "（空）"}</p>
    </button>
  );
}

export function MonthBoard({
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
          <div key={w} className="py-2 text-center text-xs font-medium text-ink-soft">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((iso, idx) => {
          if (!iso) return <div key={`p-${idx}`} className="min-h-44 border-r border-b border-border/50 bg-muted/30" />;
          return (
            <DayCell
              key={iso}
              iso={iso}
              sheetKey={snap.sheetKey}
              day={snap.days[iso]}
              entries={snap.entries[iso] ?? []}
              images={snap.images?.[iso] ?? []}
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

export function WeekBoard({
  snap,
  mondayIso,
  selected,
  onSelect,
  onAddWeekNote,
}: {
  snap: LogSnapshot;
  mondayIso: string;
  selected: string | null;
  onSelect: (iso: string) => void;
  onAddWeekNote: (mondayIso: string) => void;
}) {
  const week = weekOf(mondayIso);
  const days = week.days.map(toISODate);
  const loc = locationForWeek(days, snap);
  const weekNotes = snap.notes.filter((n) => n.weekStart === mondayIso);
  const sem = semesterWeek(mondayIso, snap.settings.semesterStart);
  const stay = stayWeek(mondayIso, snap.spans);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {sem ? (
          <span
            className="rounded-sm px-2 py-1 text-xs font-medium"
            style={{ background: TONE_COLORS.important.bg, color: TONE_COLORS.important.fg }}
          >
            学期第 {sem} 周
          </span>
        ) : null}
        {stay ? <span className="text-xs text-muted-foreground">停留第 {stay} 周</span> : null}
        {loc ? (
          <span
            className="rounded-sm px-2 py-1 text-xs font-medium"
            style={{
              background: `color-mix(in oklab, ${SPAN_SWATCH[loc.color] ?? "var(--color-muted)"} 55%, white)`,
            }}
          >
            {loc.label}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-7 md:gap-0 md:overflow-hidden md:rounded-lg md:border md:border-border">
        {days.map((iso, i) => (
          <div key={iso} className="flex min-h-[24rem] min-w-0 flex-col overflow-hidden rounded-lg border border-border md:min-h-[32rem] md:rounded-none md:border-0 md:border-r md:border-b-0">
            <div className="bg-muted px-2 py-1.5 text-center text-xs font-medium text-ink-soft">
              {WEEKDAYS[i]}
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
              <DayCell
                iso={iso}
                sheetKey={snap.sheetKey}
                day={snap.days[iso]}
                entries={snap.entries[iso] ?? []}
                images={snap.images?.[iso] ?? []}
                spans={snap.spans}
                selected={selected === iso}
                onSelect={onSelect}
                density="week"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">本周备注</p>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {weekNotes.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onSelect(n.weekStart ?? days[0]!)}
              className="rounded-md px-3 py-2 text-left text-sm"
              style={
                n.tone && n.tone !== "month"
                  ? { background: TONE_COLORS[n.tone].wash, color: TONE_COLORS[n.tone].fg }
                  : { background: "var(--color-muted)" }
              }
            >
              {n.title ? <div className="font-medium">{n.title}</div> : null}
              <div className="whitespace-pre-wrap text-foreground/80">{n.body}</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => onAddWeekNote(mondayIso)}
            className="rounded-md border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
          >
            + 本周备注
          </button>
        </div>
      </div>
    </div>
  );
}

export function MonthHeatmap({
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

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 text-center text-[10px] text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, idx) => {
          if (!iso) return <div key={`p-${idx}`} />;
          const day = snap.days[iso];
          const tone = day?.primaryTone ?? "month";
          const bg = tone === "month" ? `var(--color-month-${monthOf(iso)})` : TONE_COLORS[tone].bg;
          const filled = Boolean(day?.journal || day || (snap.entries[iso] ?? []).length);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              title={iso}
              className={cn(
                "aspect-square rounded-sm text-[10px] tabular-nums transition-transform duration-150",
                selected === iso && "ring-2 ring-primary",
                !filled && "opacity-70",
              )}
              style={{ background: bg, color: "var(--color-foreground)" }}
            >
              {Number(iso.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
