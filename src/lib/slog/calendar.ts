import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarWeeks,
  eachDayOfInterval,
  endOfMonth,
  format,
  getISODay,
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import type { SheetKey, ViewMode } from "./types";

export const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"] as const;

export function currentSheetKey(now = new Date()): SheetKey {
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? 1 : 2;
  return `${year}-H${half}` as SheetKey;
}

export function parseSheetKey(key: string): { year: number; half: 1 | 2 } {
  const m = /^(\d{4})-H([12])$/.exec(key);
  if (!m) {
    const cur = currentSheetKey();
    const parsed = /^(\d{4})-H([12])$/.exec(cur)!;
    return { year: Number(parsed[1]), half: Number(parsed[2]) as 1 | 2 };
  }
  return { year: Number(m[1]), half: Number(m[2]) as 1 | 2 };
}

export function sheetLabel(key: string): string {
  const { year, half } = parseSheetKey(key);
  return half === 1 ? `${year} 上半年 · 1–6 月` : `${year} 下半年 · 7–12 月`;
}

export function sheetRange(key: string): { start: Date; end: Date } {
  const { year, half } = parseSheetKey(key);
  if (half === 1) {
    return { start: new Date(year, 0, 1), end: new Date(year, 5, 30) };
  }
  return { start: new Date(year, 6, 1), end: new Date(year, 11, 31) };
}

export function adjacentSheet(key: string, dir: -1 | 1): SheetKey {
  const { year, half } = parseSheetKey(key);
  if (dir === 1) {
    return half === 1 ? (`${year}-H2` as SheetKey) : (`${year + 1}-H1` as SheetKey);
  }
  return half === 2 ? (`${year}-H1` as SheetKey) : (`${year - 1}-H2` as SheetKey);
}

export function sheetKeyFromIso(iso: string): SheetKey {
  const y = yearOf(iso);
  const m = monthOf(iso);
  return `${y}-H${m < 7 ? 1 : 2}` as SheetKey;
}

export function weeksOfYear(year: number): GridWeek[] {
  const start = startOfWeek(new Date(year, 0, 1), { weekStartsOn: 1 });
  const last = startOfWeek(new Date(year, 11, 31), { weekStartsOn: 1 });
  const weeks: GridWeek[] = [];
  for (let cursor = start; !isAfter(cursor, last); cursor = addDays(cursor, 7)) {
    weeks.push({
      monday: cursor,
      mondayIso: toISODate(cursor),
      days: eachDayOfInterval({ start: cursor, end: addDays(cursor, 6) }),
    });
  }
  return weeks;
}

export function yearInterval(year: number): { start: Date; end: Date } {
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
}

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 2024, (m || 1) - 1, d || 1);
}

export type GridWeek = {
  monday: Date;
  mondayIso: string;
  days: Date[];
};

export function weeksOfSheet(key: string): GridWeek[] {
  const { start, end } = sheetRange(key);
  const firstMonday = startOfWeek(start, { weekStartsOn: 1 });
  const last = startOfWeek(end, { weekStartsOn: 1 });
  const weeks: GridWeek[] = [];
  for (let cursor = firstMonday; !isAfter(cursor, last); cursor = addDays(cursor, 7)) {
    const days = eachDayOfInterval({ start: cursor, end: addDays(cursor, 6) });
    weeks.push({ monday: cursor, mondayIso: toISODate(cursor), days });
  }
  return weeks;
}

export function weekOf(iso: string): GridWeek {
  const monday = startOfWeek(parseDate(iso), { weekStartsOn: 1 });
  return {
    monday,
    mondayIso: toISODate(monday),
    days: eachDayOfInterval({ start: monday, end: addDays(monday, 6) }),
  };
}

export function shiftWeek(mondayIso: string, dir: -1 | 1): string {
  return toISODate(addWeeks(parseDate(mondayIso), dir));
}

export function formatWeekRange(mondayIso: string): string {
  const start = parseDate(mondayIso);
  const end = addDays(start, 6);
  return `${format(start, "M月d日", { locale: zhCN })} – ${format(end, "M月d日", { locale: zhCN })}`;
}

export function inSheet(iso: string, key: string): boolean {
  const d = parseDate(iso);
  const { start, end } = sheetRange(key);
  return isWithinInterval(d, { start, end });
}

export function weekdayIndex(d: Date): number {
  return getISODay(d) - 1;
}

export function formatLong(iso: string): string {
  return format(parseDate(iso), "M月d日 EEEE", { locale: zhCN });
}

export function formatShort(iso: string): string {
  return format(parseDate(iso), "M/d");
}

export function monthOf(iso: string): number {
  const m = Number(iso.slice(5, 7));
  return m >= 1 && m <= 12 ? m : 1;
}

export function yearOf(iso: string): number {
  const y = Number(iso.slice(0, 4));
  return y || new Date().getFullYear();
}

export function semesterWeek(iso: string, semesterStart: string | null): number | null {
  if (!semesterStart) return null;
  const start = startOfWeek(parseDate(semesterStart), { weekStartsOn: 1 });
  const day = parseDate(iso);
  if (isBefore(day, start)) return null;
  return differenceInCalendarWeeks(day, start, { weekStartsOn: 1 }) + 1;
}

export function stayWeek(
  iso: string,
  spans: { startDate: string; endDate: string; showWeeks: boolean }[],
): number | null {
  const d = parseDate(iso);
  const span = spans.find(
    (s) =>
      s.showWeeks &&
      !isBefore(d, parseDate(s.startDate)) &&
      !isAfter(d, parseDate(s.endDate)),
  );
  if (!span) return null;
  const start = startOfWeek(parseDate(span.startDate), { weekStartsOn: 1 });
  return differenceInCalendarWeeks(d, start, { weekStartsOn: 1 }) + 1;
}

export function isToday(iso: string, now = new Date()): boolean {
  return isSameDay(parseDate(iso), now);
}

export function isFuture(iso: string, now = new Date()): boolean {
  return iso > toISODate(now);
}

export function nearbySheets(around = new Date(), back = 3, forward = 1): SheetKey[] {
  const y = around.getFullYear();
  const keys: SheetKey[] = [];
  for (let year = y - back; year <= y + forward; year++) {
    keys.push(`${year}-H1` as SheetKey, `${year}-H2` as SheetKey);
  }
  return keys;
}

export function monthStartsInSheet(key: string): { month: number; iso: string }[] {
  const { start, end } = sheetRange(key);
  const out: { month: number; iso: string }[] = [];
  let cursor = startOfMonth(start);
  while (!isAfter(cursor, end)) {
    out.push({ month: cursor.getMonth() + 1, iso: toISODate(cursor) });
    cursor = addMonths(cursor, 1);
  }
  return out;
}

export function daysOfMonth(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month - 1, 1));
  return eachDayOfInterval({ start, end: endOfMonth(start) });
}

export function clampMonthToSheet(sheetKey: string, month: number): number {
  const { half } = parseSheetKey(sheetKey);
  if (half === 1) return Math.min(6, Math.max(1, month));
  return Math.min(12, Math.max(7, month));
}

export function clampWeekToSheet(sheetKey: string, iso: string): string {
  const w = weekOf(iso);
  if (w.days.some((d) => inSheet(toISODate(d), sheetKey))) return w.mondayIso;
  const { start, end } = sheetRange(sheetKey);
  const mid = new Date((start.getTime() + end.getTime()) / 2);
  return weekOf(toISODate(mid)).mondayIso;
}

export function datesInView(
  view: ViewMode,
  opts: { sheetKey: string; weekMonday: string; year: number; month: number },
): string[] {
  if (view === "week") return weekOf(opts.weekMonday).days.map(toISODate);
  if (view === "month") return daysOfMonth(opts.year, opts.month).map(toISODate);
  if (view === "year" || view === "life") {
    const { start, end } = yearInterval(opts.year);
    return eachDayOfInterval({ start, end }).map(toISODate);
  }
  const { start, end } = sheetRange(opts.sheetKey);
  return eachDayOfInterval({ start, end }).map(toISODate);
}

export function viewRangeLabel(
  view: ViewMode,
  opts: { sheetKey: string; weekMonday: string; year: number; month: number },
): string {
  if (view === "week") return formatWeekRange(opts.weekMonday);
  if (view === "month") return `${opts.year}年${opts.month}月`;
  if (view === "year") return `${opts.year} 年`;
  if (view === "life") return "一生";
  return sheetLabel(opts.sheetKey);
}

export function anchorDate(
  sheetKey: string,
  selected: string | null,
  filled: string[] = [],
  now = new Date(),
): string {
  const today = toISODate(now);
  if (selected && inSheet(selected, sheetKey)) return selected;
  if (inSheet(today, sheetKey)) return today;
  const hits = filled.filter((d) => inSheet(d, sheetKey)).sort();
  if (hits.length) return hits[Math.floor(hits.length / 2)]!;
  const { start, end } = sheetRange(sheetKey);
  if (now.getTime() < start.getTime()) return toISODate(start);
  return toISODate(end);
}
