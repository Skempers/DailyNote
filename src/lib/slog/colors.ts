import type { DayTone, EntryKind } from "./types";

export const MONTH_COLORS: Record<number, { bg: string; fg: string; name: string }> = {
  1: { bg: "var(--color-month-1)", fg: "var(--color-month-1-fg)", name: "一月黄" },
  2: { bg: "var(--color-month-2)", fg: "var(--color-month-2-fg)", name: "二月粉" },
  3: { bg: "var(--color-month-3)", fg: "var(--color-month-3-fg)", name: "三月紫" },
  4: { bg: "var(--color-month-4)", fg: "var(--color-month-4-fg)", name: "四月橘" },
  5: { bg: "var(--color-month-5)", fg: "var(--color-month-5-fg)", name: "五月绿" },
  6: { bg: "var(--color-month-6)", fg: "var(--color-month-6-fg)", name: "六月青" },
  7: { bg: "var(--color-month-7)", fg: "var(--color-month-7-fg)", name: "七月珊瑚" },
  8: { bg: "var(--color-month-8)", fg: "var(--color-month-8-fg)", name: "八月桃" },
  9: { bg: "var(--color-month-9)", fg: "var(--color-month-9-fg)", name: "九月粉" },
  10: { bg: "var(--color-month-10)", fg: "var(--color-month-10-fg)", name: "十月蓝" },
  11: { bg: "var(--color-month-11)", fg: "var(--color-month-11-fg)", name: "十一月褐" },
  12: { bg: "var(--color-month-12)", fg: "var(--color-month-12-fg)", name: "十二月霜" },
};

export const TONE_COLORS: Record<DayTone, { bg: string; fg: string; wash: string }> = {
  month: { bg: "transparent", fg: "var(--color-foreground)", wash: "transparent" },
  important: {
    bg: "var(--color-tone-important)",
    fg: "var(--color-tone-important-fg)",
    wash: "color-mix(in oklab, var(--color-tone-important) 42%, white)",
  },
  social: {
    bg: "var(--color-tone-social)",
    fg: "var(--color-tone-social-fg)",
    wash: "color-mix(in oklab, var(--color-tone-social) 38%, white)",
  },
  first: {
    bg: "var(--color-tone-first)",
    fg: "var(--color-tone-first-fg)",
    wash: "color-mix(in oklab, var(--color-tone-first) 38%, white)",
  },
  favorite: {
    bg: "var(--color-tone-favorite)",
    fg: "var(--color-tone-favorite-fg)",
    wash: "color-mix(in oklab, var(--color-tone-favorite) 32%, white)",
  },
  emo: {
    bg: "var(--color-tone-emo)",
    fg: "var(--color-tone-emo-fg)",
    wash: "color-mix(in oklab, var(--color-tone-emo) 45%, white)",
  },
  memory: {
    bg: "var(--color-tone-memory)",
    fg: "var(--color-tone-memory-fg)",
    wash: "color-mix(in oklab, var(--color-tone-memory) 18%, white)",
  },
  cycle: {
    bg: "var(--color-tone-cycle)",
    fg: "var(--color-tone-cycle-fg)",
    wash: "var(--color-tone-cycle)",
  },
};

export function headerFill(tone: DayTone, month: number): { bg: string; fg: string } {
  if (tone !== "month" && TONE_COLORS[tone]) {
    const t = TONE_COLORS[tone];
    return { bg: t.bg, fg: t.fg };
  }
  const m = MONTH_COLORS[month] ?? MONTH_COLORS[1]!;
  return { bg: m.bg, fg: m.fg };
}

export const ENTRY_CLASS: Record<EntryKind, string> = {
  ordinary: "text-foreground",
  hobby: "text-tone-first-fg",
  important: "font-medium text-tone-favorite-fg",
  class: "italic text-tone-first-fg",
  skipped: "text-muted-foreground line-through",
  trip: "font-medium text-tone-favorite-fg underline decoration-tone-favorite-fg/50",
  activity: "font-medium text-tone-first-fg underline decoration-tone-first-fg/40",
  movie: "italic text-foreground",
  book: "text-foreground",
  flight: "font-medium text-tone-favorite-fg underline",
  pride: "font-medium text-foreground",
};

export const SPAN_SWATCH: Record<string, string> = {
  "trip-pink": "var(--color-trip-pink)",
  "trip-blue": "var(--color-trip-blue)",
  "trip-orange": "var(--color-trip-orange)",
  "trip-purple": "var(--color-trip-purple)",
  "trip-teal": "var(--color-trip-teal)",
  "trip-ink": "var(--color-trip-ink)",
};
