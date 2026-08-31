import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { sheetRange, toISODate } from "./calendar";
import { buildDemoSnapshot, emptySnapshot } from "./demo-data";
import type {
  DayRecord,
  DayTone,
  Emphasis,
  EntryKind,
  EntryMarker,
  LogEntry,
  LogImage,
  LogNote,
  LogSettings,
  LogSnapshot,
  LogSpan,
  NoteKind,
  SearchHit,
} from "./types";

type DayRow = {
  id: string;
  day_date: string;
  primary_tone: string;
  secondary_tone: string | null;
  location: string | null;
  header_note: string | null;
  p3: string;
  journal: string | null;
};

type EntryRow = {
  id: string;
  day_date: string;
  kind: string;
  body: string;
  marker: string | null;
  emphasis: string;
  starred: boolean;
  sort_order: number;
};

type ImageRow = {
  id: string;
  day_date: string;
  data_url: string;
  thumb_url: string;
  caption: string;
  sort_order: number;
};

type ImageMetaRow = {
  id: string;
  day_date: string;
  thumb_url: string;
  caption: string;
  sort_order: number;
};

type NoteRow = {
  id: string;
  sheet_key: string;
  week_start: string | null;
  kind: string;
  title: string;
  body: string;
  tone: string | null;
  emphasized: boolean;
  sort_order: number;
};

type SpanRow = {
  id: string;
  start_date: string;
  end_date: string;
  kind: string;
  label: string;
  color: string;
  show_weeks: boolean;
};

type SettingsRow = {
  favorite_label: string;
  semester_start: string | null;
  seeded: boolean;
};

function parseP3(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function mapDay(r: DayRow): DayRecord {
  return {
    id: r.id,
    date: r.day_date,
    primaryTone: (r.primary_tone as DayTone) || "month",
    secondaryTone: (r.secondary_tone as DayTone) || null,
    location: r.location ?? "",
    headerNote: r.header_note ?? "",
    p3: parseP3(r.p3),
    journal: r.journal ?? "",
  };
}

function mapEntry(r: EntryRow): LogEntry {
  return {
    id: r.id,
    date: r.day_date,
    kind: (r.kind as EntryKind) || "ordinary",
    body: r.body,
    marker: (r.marker as EntryMarker) || null,
    emphasis: (r.emphasis as Emphasis) || "normal",
    starred: Boolean(r.starred),
    sortOrder: Number(r.sort_order) || 0,
  };
}

function mapImage(r: ImageRow): LogImage {
  return {
    id: r.id,
    date: r.day_date,
    dataUrl: r.data_url,
    thumbUrl: r.thumb_url || undefined,
    caption: r.caption ?? "",
    sortOrder: Number(r.sort_order) || 0,
  };
}

function mapImageMeta(r: ImageMetaRow): LogImage {
  return {
    id: r.id,
    date: r.day_date,
    dataUrl: "",
    thumbUrl: r.thumb_url || "",
    caption: r.caption ?? "",
    sortOrder: Number(r.sort_order) || 0,
  };
}

function mapNote(r: NoteRow): LogNote {
  return {
    id: r.id,
    sheetKey: r.sheet_key,
    weekStart: r.week_start,
    kind: (r.kind as NoteKind) || "plan",
    title: r.title,
    body: r.body,
    tone: (r.tone as DayTone) || null,
    emphasized: Boolean(r.emphasized),
    sortOrder: Number(r.sort_order) || 0,
  };
}

function mapSpan(r: SpanRow): LogSpan {
  return {
    id: r.id,
    startDate: r.start_date,
    endDate: r.end_date,
    kind: r.kind as LogSpan["kind"],
    label: r.label,
    color: r.color,
    showWeeks: Boolean(r.show_weeks),
  };
}

function realId(id: string | undefined) {
  if (id && !id.startsWith("tmp-") && id !== "welcome-day") return id;
  return crypto.randomUUID();
}

async function readSnapshot(userId: string, sheetKey: string): Promise<LogSnapshot> {
  const sql = await getSql();
  const { start, end } = sheetRange(sheetKey);
  const from = toISODate(start);
  const to = toISODate(end);

  const [settingsRows, dayRows, entryRows, imageRows, noteRows, spanRows] = await Promise.all([
    sql<SettingsRow>`select favorite_label, semester_start, seeded from slog_settings where user_id = ${userId}`,
    sql<DayRow>`select id, day_date, primary_tone, secondary_tone, location, header_note, p3, journal from slog_days where user_id = ${userId} and day_date >= ${from} and day_date <= ${to}`,
    sql<EntryRow>`select id, day_date, kind, body, marker, emphasis, starred, sort_order from slog_entries where user_id = ${userId} and day_date >= ${from} and day_date <= ${to} order by sort_order, created_at`,
    sql<ImageMetaRow>`select id, day_date, caption, sort_order,
      case when length(coalesce(thumb_url, '')) > 32 then thumb_url else data_url end as thumb_url
      from slog_images where user_id = ${userId} and day_date >= ${from} and day_date <= ${to} order by sort_order, created_at`,
    sql<NoteRow>`select id, sheet_key, week_start, kind, title, body, tone, emphasized, sort_order from slog_notes where user_id = ${userId} and sheet_key = ${sheetKey} order by sort_order, created_at`,
    sql<SpanRow>`select id, start_date, end_date, kind, label, color, show_weeks from slog_spans where user_id = ${userId} and start_date <= ${to} and end_date >= ${from}`,
  ]);

  const days: Record<string, DayRecord> = {};
  for (const r of dayRows) days[r.day_date] = mapDay(r);
  const entries: Record<string, LogEntry[]> = {};
  for (const r of entryRows) {
    (entries[r.day_date] ??= []).push(mapEntry(r));
  }
  const images: Record<string, LogImage[]> = {};
  for (const r of imageRows) {
    (images[r.day_date] ??= []).push(mapImageMeta(r));
  }
  const settings: LogSettings = settingsRows[0]
    ? {
        favoriteLabel: settingsRows[0].favorite_label,
        semesterStart: settingsRows[0].semester_start,
      }
    : { favoriteLabel: "照相", semesterStart: null };

  return {
    sheetKey,
    settings,
    days,
    entries,
    images,
    notes: noteRows.map(mapNote),
    spans: spanRows.map(mapSpan),
  };
}

export const loadSheet = createServerFn({ method: "GET" })
  .validator((sheetKey: string) => sheetKey)
  .middleware([authMiddleware])
  .handler(async ({ context, data: sheetKey }) => {
    return readSnapshot(context.userId, sheetKey);
  });

export const ensureSeeded = createServerFn({ method: "POST" })
  .validator((sheetKey: string) => sheetKey)
  .middleware([authMiddleware])
  .handler(async ({ context, data: sheetKey }) => {
    const sql = await getSql();
    const existing = await sql<SettingsRow>`select favorite_label, semester_start, seeded from slog_settings where user_id = ${context.userId}`;
    if (existing[0]?.seeded) return readSnapshot(context.userId, sheetKey);

    const today = toISODate(new Date());
    const seed = emptySnapshot(sheetKey, today);

    await sql`insert into slog_settings (user_id, favorite_label, semester_start, seeded) values (${context.userId}, ${seed.settings.favoriteLabel}, ${seed.settings.semesterStart}, true) on conflict (user_id) do update set seeded = true`;

    const welcome = seed.days[today];
    if (welcome) {
      await sql`insert into slog_days (id, user_id, day_date, primary_tone, secondary_tone, location, header_note, p3, journal) values (${welcome.id}, ${context.userId}, ${welcome.date}, ${welcome.primaryTone}, ${welcome.secondaryTone}, ${welcome.location}, ${welcome.headerNote}, ${JSON.stringify(welcome.p3)}, ${welcome.journal}) on conflict (user_id, day_date) do nothing`;
    }
    for (const e of seed.entries[today] ?? []) {
      await sql`insert into slog_entries (id, user_id, day_date, kind, body, marker, emphasis, starred, sort_order) values (${e.id}, ${context.userId}, ${e.date}, ${e.kind}, ${e.body}, ${e.marker}, ${e.emphasis}, ${e.starred}, ${e.sortOrder}) on conflict (id) do nothing`;
    }
    for (const n of seed.notes) {
      await sql`insert into slog_notes (id, user_id, sheet_key, week_start, kind, title, body, tone, emphasized, sort_order) values (${n.id}, ${context.userId}, ${n.sheetKey}, ${n.weekStart}, ${n.kind}, ${n.title}, ${n.body}, ${n.tone}, ${n.emphasized}, ${n.sortOrder}) on conflict (id) do nothing`;
    }
    return readSnapshot(context.userId, sheetKey);
  });

export const importDemoSheet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const demo = buildDemoSnapshot();
    await sql`insert into slog_settings (user_id, favorite_label, semester_start, seeded) values (${context.userId}, ${demo.settings.favoriteLabel}, ${demo.settings.semesterStart}, true) on conflict (user_id) do update set favorite_label = excluded.favorite_label, semester_start = excluded.semester_start, seeded = true`;

    for (const d of Object.values(demo.days)) {
      await sql`insert into slog_days (id, user_id, day_date, primary_tone, secondary_tone, location, header_note, p3, journal) values (${crypto.randomUUID()}, ${context.userId}, ${d.date}, ${d.primaryTone}, ${d.secondaryTone}, ${d.location}, ${d.headerNote}, ${JSON.stringify(d.p3)}, ${d.journal}) on conflict (user_id, day_date) do update set primary_tone = excluded.primary_tone, secondary_tone = excluded.secondary_tone, location = excluded.location, header_note = excluded.header_note, p3 = excluded.p3, journal = excluded.journal, updated_at = now()`;
    }
    await sql`delete from slog_entries where user_id = ${context.userId} and day_date >= ${"2024-07-01"} and day_date <= ${"2024-12-31"}`;
    for (const list of Object.values(demo.entries)) {
      for (const e of list) {
        await sql`insert into slog_entries (id, user_id, day_date, kind, body, marker, emphasis, starred, sort_order) values (${crypto.randomUUID()}, ${context.userId}, ${e.date}, ${e.kind}, ${e.body}, ${e.marker}, ${e.emphasis}, ${e.starred}, ${e.sortOrder})`;
      }
    }
    await sql`delete from slog_notes where user_id = ${context.userId} and sheet_key = ${"2024-H2"}`;
    for (const n of demo.notes) {
      await sql`insert into slog_notes (id, user_id, sheet_key, week_start, kind, title, body, tone, emphasized, sort_order) values (${crypto.randomUUID()}, ${context.userId}, ${n.sheetKey}, ${n.weekStart}, ${n.kind}, ${n.title}, ${n.body}, ${n.tone}, ${n.emphasized}, ${n.sortOrder})`;
    }
    await sql`delete from slog_spans where user_id = ${context.userId} and start_date >= ${"2024-07-01"} and start_date <= ${"2024-12-31"}`;
    for (const s of demo.spans) {
      await sql`insert into slog_spans (id, user_id, start_date, end_date, kind, label, color, show_weeks) values (${crypto.randomUUID()}, ${context.userId}, ${s.startDate}, ${s.endDate}, ${s.kind}, ${s.label}, ${s.color}, ${s.showWeeks})`;
    }
    return readSnapshot(context.userId, "2024-H2");
  });

export const upsertDay = createServerFn({ method: "POST" })
  .validator((d: DayRecord) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data: d }) => {
    const sql = await getSql();
    const id = realId(d.id);
    const rows = await sql<{ id: string }>`insert into slog_days (id, user_id, day_date, primary_tone, secondary_tone, location, header_note, p3, journal) values (${id}, ${context.userId}, ${d.date}, ${d.primaryTone}, ${d.secondaryTone}, ${d.location}, ${d.headerNote}, ${JSON.stringify(d.p3 ?? [])}, ${d.journal ?? ""}) on conflict (user_id, day_date) do update set primary_tone = excluded.primary_tone, secondary_tone = excluded.secondary_tone, location = excluded.location, header_note = excluded.header_note, p3 = excluded.p3, journal = excluded.journal, updated_at = now() returning id`;
    return { ...d, id: rows[0]?.id ?? id, journal: d.journal ?? "" };
  });

export const upsertEntry = createServerFn({ method: "POST" })
  .validator((e: LogEntry) => e)
  .middleware([authMiddleware])
  .handler(async ({ context, data: e }) => {
    const sql = await getSql();
    const id = realId(e.id);
    await sql`insert into slog_entries (id, user_id, day_date, kind, body, marker, emphasis, starred, sort_order) values (${id}, ${context.userId}, ${e.date}, ${e.kind}, ${e.body}, ${e.marker}, ${e.emphasis}, ${e.starred}, ${e.sortOrder}) on conflict (id) do update set kind = excluded.kind, body = excluded.body, marker = excluded.marker, emphasis = excluded.emphasis, starred = excluded.starred, sort_order = excluded.sort_order where slog_entries.user_id = ${context.userId}`;
    return { ...e, id };
  });

export const removeEntry = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from slog_entries where id = ${id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const upsertImage = createServerFn({ method: "POST" })
  .validator((img: LogImage) => img)
  .middleware([authMiddleware])
  .handler(async ({ context, data: img }) => {
    if (!img.dataUrl.startsWith("data:image/")) throw new Error("invalid image");
    if (img.dataUrl.length > 900_000) throw new Error("image too large");
    const sql = await getSql();
    const existing = await sql<{ c: number }>`select count(*)::int as c from slog_images where user_id = ${context.userId} and day_date = ${img.date}`;
    if ((existing[0]?.c ?? 0) >= 12 && !(img.id && !img.id.startsWith("tmp-"))) {
      throw new Error("一天最多 12 张图");
    }
    const id = realId(img.id);
    const thumb = img.thumbUrl || "";
    await sql`insert into slog_images (id, user_id, day_date, data_url, thumb_url, caption, sort_order) values (${id}, ${context.userId}, ${img.date}, ${img.dataUrl}, ${thumb}, ${img.caption ?? ""}, ${img.sortOrder}) on conflict (id) do update set data_url = excluded.data_url, thumb_url = excluded.thumb_url, caption = excluded.caption, sort_order = excluded.sort_order where slog_images.user_id = ${context.userId}`;
    return { ...img, id };
  });

export const loadDayImages = createServerFn({ method: "GET" })
  .validator((date: string) => date)
  .middleware([authMiddleware])
  .handler(async ({ context, data: date }) => {
    const sql = await getSql();
    const rows = await sql<ImageRow>`select id, day_date, data_url, thumb_url, caption, sort_order from slog_images where user_id = ${context.userId} and day_date = ${date} order by sort_order, created_at`;
    return rows.map(mapImage);
  });

export const removeImage = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from slog_images where id = ${id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const upsertNote = createServerFn({ method: "POST" })
  .validator((n: LogNote) => n)
  .middleware([authMiddleware])
  .handler(async ({ context, data: n }) => {
    const sql = await getSql();
    const id = realId(n.id);
    await sql`insert into slog_notes (id, user_id, sheet_key, week_start, kind, title, body, tone, emphasized, sort_order) values (${id}, ${context.userId}, ${n.sheetKey}, ${n.weekStart}, ${n.kind}, ${n.title}, ${n.body}, ${n.tone}, ${n.emphasized}, ${n.sortOrder}) on conflict (id) do update set week_start = excluded.week_start, kind = excluded.kind, title = excluded.title, body = excluded.body, tone = excluded.tone, emphasized = excluded.emphasized, sort_order = excluded.sort_order where slog_notes.user_id = ${context.userId}`;
    return { ...n, id };
  });

export const removeNote = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from slog_notes where id = ${id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const upsertSpan = createServerFn({ method: "POST" })
  .validator((s: LogSpan) => s)
  .middleware([authMiddleware])
  .handler(async ({ context, data: s }) => {
    const sql = await getSql();
    const id = realId(s.id);
    await sql`insert into slog_spans (id, user_id, start_date, end_date, kind, label, color, show_weeks) values (${id}, ${context.userId}, ${s.startDate}, ${s.endDate}, ${s.kind}, ${s.label}, ${s.color}, ${s.showWeeks}) on conflict (id) do update set start_date = excluded.start_date, end_date = excluded.end_date, kind = excluded.kind, label = excluded.label, color = excluded.color, show_weeks = excluded.show_weeks where slog_spans.user_id = ${context.userId}`;
    return { ...s, id };
  });

export const removeSpan = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from slog_spans where id = ${id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .validator((s: LogSettings) => s)
  .middleware([authMiddleware])
  .handler(async ({ context, data: s }) => {
    const sql = await getSql();
    await sql`insert into slog_settings (user_id, favorite_label, semester_start, seeded) values (${context.userId}, ${s.favoriteLabel}, ${s.semesterStart}, true) on conflict (user_id) do update set favorite_label = excluded.favorite_label, semester_start = excluded.semester_start`;
    return s;
  });

export const loadSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LogSettings> => {
    const sql = await getSql();
    const rows = await sql<SettingsRow>`select favorite_label, semester_start, seeded from slog_settings where user_id = ${context.userId}`;
    const row = rows[0];
    return {
      favoriteLabel: row?.favorite_label || "照相",
      semesterStart: row?.semester_start ?? null,
    };
  });

export type UsageStats = {
  imageBytes: number;
  imageCount: number;
  dayCount: number;
};

export const loadUsage = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<UsageStats> => {
    const sql = await getSql();
    const [img] = await sql<{ bytes: string | number; n: number }>`
      select coalesce(sum(length(data_url) + length(coalesce(thumb_url, ''))), 0)::bigint as bytes,
             count(*)::int as n
      from slog_images where user_id = ${context.userId}`;
    const [days] = await sql<{ n: number }>`select count(*)::int as n from slog_days where user_id = ${context.userId}`;
    return {
      imageBytes: Number(img?.bytes ?? 0),
      imageCount: Number(img?.n ?? 0),
      dayCount: Number(days?.n ?? 0),
    };
  });

export const searchLog = createServerFn({ method: "GET" })
  .validator((q: string) => q.trim().slice(0, 80))
  .middleware([authMiddleware])
  .handler(async ({ context, data: q }): Promise<SearchHit[]> => {
    if (!q) return [];
    const sql = await getSql();
    const like = `%${q}%`;
    const [entries, notes, days, spans] = await Promise.all([
      sql<{ id: string; day_date: string; body: string; kind: string }>`select id, day_date, body, kind from slog_entries where user_id = ${context.userId} and body ilike ${like} order by day_date desc limit 20`,
      sql<{ id: string; sheet_key: string; title: string; body: string; week_start: string | null }>`select id, sheet_key, title, body, week_start from slog_notes where user_id = ${context.userId} and (title ilike ${like} or body ilike ${like}) limit 12`,
      sql<{ id: string; day_date: string; location: string | null; header_note: string | null; journal: string | null }>`select id, day_date, location, header_note, journal from slog_days where user_id = ${context.userId} and (location ilike ${like} or header_note ilike ${like} or journal ilike ${like}) limit 12`,
      sql<{ id: string; start_date: string; label: string }>`select id, start_date, label from slog_spans where user_id = ${context.userId} and label ilike ${like} limit 8`,
    ]);
    const hits: SearchHit[] = [];
    for (const r of entries) {
      hits.push({ id: r.id, date: r.day_date, kind: "entry", title: r.body, snippet: r.kind });
    }
    for (const r of notes) {
      hits.push({
        id: r.id,
        date: r.week_start ?? r.sheet_key,
        kind: "note",
        title: r.title || r.body.slice(0, 24),
        snippet: r.body.slice(0, 80),
      });
    }
    for (const r of days) {
      hits.push({
        id: r.id,
        date: r.day_date,
        kind: "day",
        title: r.header_note || r.location || r.journal?.slice(0, 24) || r.day_date,
        snippet: [r.location, r.header_note, r.journal?.slice(0, 60)].filter(Boolean).join(" · "),
      });
    }
    for (const r of spans) {
      hits.push({ id: r.id, date: r.start_date, kind: "span", title: r.label, snippet: "时段" });
    }
    return hits.slice(0, 30);
  });
