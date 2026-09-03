import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { sheetRange, toISODate } from "./calendar";
import { buildDemoSnapshot, emptySnapshot } from "./demo-data";
import { BACKUP_SCHEMA_VERSION } from "./schema";
import type {
  DayRecord,
  DayTodo,
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

type TodoRow = {
  id: string;
  day_date: string;
  body: string;
  done: boolean;
  sort_order: number;
};

function mapTodo(r: TodoRow): DayTodo {
  return {
    id: r.id,
    date: r.day_date,
    body: r.body,
    done: Boolean(r.done),
    sortOrder: Number(r.sort_order) || 0,
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

  const [settingsRows, dayRows, entryRows, imageRows, noteRows, spanRows, todoRows] = await Promise.all([
    sql<SettingsRow>`select favorite_label, semester_start, seeded from slog_settings where user_id = ${userId}`,
    sql<DayRow>`select id, day_date, primary_tone, secondary_tone, location, header_note, p3, journal from slog_days where user_id = ${userId} and day_date >= ${from} and day_date <= ${to}`,
    sql<EntryRow>`select id, day_date, kind, body, marker, emphasis, starred, sort_order from slog_entries where user_id = ${userId} and day_date >= ${from} and day_date <= ${to} order by sort_order, created_at`,
    sql<ImageMetaRow>`select id, day_date, caption, sort_order,
      case when length(coalesce(thumb_url, '')) > 32 then thumb_url else data_url end as thumb_url
      from slog_images where user_id = ${userId} and day_date >= ${from} and day_date <= ${to} order by sort_order, created_at`,
    sql<NoteRow>`select id, sheet_key, week_start, kind, title, body, tone, emphasized, sort_order from slog_notes where user_id = ${userId} and sheet_key = ${sheetKey} order by sort_order, created_at`,
    sql<SpanRow>`select id, start_date, end_date, kind, label, color, show_weeks from slog_spans where user_id = ${userId} and start_date <= ${to} and end_date >= ${from}`,
    sql<TodoRow>`select id, day_date, body, done, sort_order from slog_todos where user_id = ${userId} and day_date >= ${from} and day_date <= ${to} order by sort_order, created_at`,
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
  const todos: Record<string, DayTodo[]> = {};
  for (const r of todoRows) {
    (todos[r.day_date] ??= []).push(mapTodo(r));
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
    todos,
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

export const clearDemoSheet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const from = "2024-07-01";
    const to = "2024-12-31";
    const [days] = await sql<{ n: number }>`select count(*)::int as n from slog_days where user_id = ${context.userId} and day_date >= ${from} and day_date <= ${to}`;
    await sql`delete from slog_images where user_id = ${context.userId} and day_date >= ${from} and day_date <= ${to}`;
    await sql`delete from slog_entries where user_id = ${context.userId} and day_date >= ${from} and day_date <= ${to}`;
    await sql`delete from slog_todos where user_id = ${context.userId} and day_date >= ${from} and day_date <= ${to}`;
    await sql`delete from slog_days where user_id = ${context.userId} and day_date >= ${from} and day_date <= ${to}`;
    await sql`delete from slog_notes where user_id = ${context.userId} and sheet_key = ${"2024-H2"}`;
    await sql`delete from slog_spans where user_id = ${context.userId} and start_date >= ${from} and start_date <= ${to}`;
    return { removedDays: Number(days?.n ?? 0) };
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

export const saveDayTodos = createServerFn({ method: "POST" })
  .validator((d: { date: string; todos: DayTodo[] }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const kept = data.todos
      .map((t, i) => ({ ...t, body: (t.body ?? "").trim(), sortOrder: i }))
      .filter((t) => t.body);
    await sql`delete from slog_todos where user_id = ${context.userId} and day_date = ${data.date}`;
    const saved: DayTodo[] = [];
    for (const t of kept) {
      const id = crypto.randomUUID();
      await sql`insert into slog_todos (id, user_id, day_date, body, done, sort_order) values (${id}, ${context.userId}, ${data.date}, ${t.body}, ${Boolean(t.done)}, ${t.sortOrder})`;
      saved.push({ id, date: data.date, body: t.body, done: Boolean(t.done), sortOrder: t.sortOrder });
    }
    return saved;
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

export type FullBackup = {
  schemaVersion: number;
  exportedAt: string;
  userId: string;
  settings: LogSettings;
  days: DayRecord[];
  entries: LogEntry[];
  images: LogImage[];
  notes: LogNote[];
  spans: LogSpan[];
  todos: DayTodo[];
};

async function backupForUser(userId: string): Promise<FullBackup> {
  const sql = await getSql();
  const [settingsRows, dayRows, entryRows, imageRows, noteRows, spanRows, todoRows] = await Promise.all([
    sql<SettingsRow>`select favorite_label, semester_start, seeded from slog_settings where user_id = ${userId}`,
    sql<DayRow>`select id, day_date, primary_tone, secondary_tone, location, header_note, p3, journal from slog_days where user_id = ${userId} order by day_date`,
    sql<EntryRow>`select id, day_date, kind, body, marker, emphasis, starred, sort_order from slog_entries where user_id = ${userId} order by day_date, sort_order`,
    sql<ImageRow>`select id, day_date, data_url, thumb_url, caption, sort_order from slog_images where user_id = ${userId} order by day_date, sort_order`,
    sql<NoteRow>`select id, sheet_key, week_start, kind, title, body, tone, emphasized, sort_order from slog_notes where user_id = ${userId} order by sort_order`,
    sql<SpanRow>`select id, start_date, end_date, kind, label, color, show_weeks from slog_spans where user_id = ${userId} order by start_date`,
    sql<TodoRow>`select id, day_date, body, done, sort_order from slog_todos where user_id = ${userId} order by day_date, sort_order`,
  ]);
  const row = settingsRows[0];
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    userId,
    settings: {
      favoriteLabel: row?.favorite_label || "照相",
      semesterStart: row?.semester_start ?? null,
    },
    days: dayRows.map(mapDay),
    entries: entryRows.map(mapEntry),
    images: imageRows.map(mapImage),
    notes: noteRows.map(mapNote),
    spans: spanRows.map(mapSpan),
    todos: todoRows.map(mapTodo),
  };
}

export const exportBackup = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<FullBackup> => backupForUser(context.userId));

type WebdavRow = {
  webdav_url: string | null;
  webdav_username: string | null;
  webdav_password: string | null;
  webdav_last_at: string | null;
  webdav_last_error: string | null;
};

export type WebdavPublic = {
  url: string;
  username: string;
  hasPassword: boolean;
  lastAt: string | null;
  lastError: string | null;
};

function mapWebdav(row?: WebdavRow): WebdavPublic {
  return {
    url: row?.webdav_url ?? "",
    username: row?.webdav_username ?? "",
    hasPassword: Boolean(row?.webdav_password),
    lastAt: row?.webdav_last_at ?? null,
    lastError: row?.webdav_last_error ?? null,
  };
}

async function readWebdavRow(userId: string): Promise<WebdavRow | undefined> {
  const sql = await getSql();
  const rows = await sql<WebdavRow>`select webdav_url, webdav_username, webdav_password, webdav_last_at::text, webdav_last_error from slog_settings where user_id = ${userId}`;
  return rows[0];
}

async function markWebdav(userId: string, error: string | null, bumpLast = true) {
  const sql = await getSql();
  if (bumpLast) {
    await sql`update slog_settings set webdav_last_at = now(), webdav_last_error = ${error} where user_id = ${userId}`;
  } else {
    await sql`update slog_settings set webdav_last_error = ${error} where user_id = ${userId}`;
  }
}

export const loadWebdav = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<WebdavPublic> => mapWebdav(await readWebdavRow(context.userId)));

export const saveWebdav = createServerFn({ method: "POST" })
  .validator((d: { url: string; username: string; password: string }) => d)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const { normalizeWebdavFolder } = await import("./webdav");
    const url = data.url.trim() ? normalizeWebdavFolder(data.url) : "";
    const username = data.username.trim();
    const existing = await readWebdavRow(context.userId);
    const password = data.password ? data.password : (existing?.webdav_password ?? "");
    await sql`insert into slog_settings (user_id, favorite_label, seeded, webdav_url, webdav_username, webdav_password) values (${context.userId}, ${"照相"}, true, ${url}, ${username}, ${password}) on conflict (user_id) do update set webdav_url = excluded.webdav_url, webdav_username = excluded.webdav_username, webdav_password = excluded.webdav_password`;
    return mapWebdav(await readWebdavRow(context.userId));
  });

async function pushUserToWebdav(userId: string, filename: string, body: string) {
  const row = await readWebdavRow(userId);
  if (!row?.webdav_url) throw new Error("还没有填写网盘地址");
  if (!row.webdav_password) throw new Error("还没有保存网盘密码");
  const { putWebdavFile } = await import("./webdav");
  await putWebdavFile({
    folder: row.webdav_url,
    username: row.webdav_username ?? "",
    password: row.webdav_password,
    filename,
    body,
  });
}

export const testWebdav = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    try {
      const probe = JSON.stringify({ ok: true, at: new Date().toISOString(), app: "SLog" });
      await pushUserToWebdav(context.userId, "slog-webdav-test.json", probe);
      await markWebdav(context.userId, null, false);
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "连接失败";
      await markWebdav(context.userId, message, false);
      throw new Error(message);
    }
  });

export const pushWebdavBackup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const data = await backupForUser(context.userId);
    const body = JSON.stringify({ kind: "full", ...data });
    const day = data.exportedAt.slice(0, 10);
    try {
      await pushUserToWebdav(context.userId, `slog-full-${day}.json`, body);
      await pushUserToWebdav(context.userId, "slog-latest.json", body);
      await markWebdav(context.userId, null, true);
      return { kind: "full" as const, days: data.days.length, entries: data.entries.length, images: data.images.length, filename: `slog-full-${day}.json` };
    } catch (err) {
      const message = err instanceof Error ? err.message : "备份失败";
      await markWebdav(context.userId, message, false);
      throw new Error(message);
    }
  });

const AUTO_BACKUP_MS = 12 * 60 * 60 * 1000;

async function changedDatesSince(userId: string, since: string): Promise<string[]> {
  const sql = await getSql();
  const rows = await sql<{ day_date: string }>`
    select distinct day_date::text as day_date from slog_days where user_id = ${userId} and updated_at > ${since}::timestamptz
    union
    select distinct day_date::text as day_date from slog_entries where user_id = ${userId} and created_at > ${since}::timestamptz
    union
    select distinct day_date::text as day_date from slog_images where user_id = ${userId} and created_at > ${since}::timestamptz
  `;
  return rows.map((r) => String(r.day_date).slice(0, 10));
}

function stampName(d = new Date()) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

async function pushIncremental(userId: string) {
  const row = await readWebdavRow(userId);
  const since = row?.webdav_last_at ?? null;
  const full = await backupForUser(userId);
  if (!since) {
    const body = JSON.stringify({ kind: "full", ...full });
    const day = full.exportedAt.slice(0, 10);
    await pushUserToWebdav(userId, `slog-full-${day}.json`, body);
    await pushUserToWebdav(userId, "slog-latest.json", body);
    await markWebdav(userId, null, true);
    return { kind: "full" as const, days: full.days.length, entries: full.entries.length, images: full.images.length, filename: `slog-full-${day}.json` };
  }
  const dates = new Set(await changedDatesSince(userId, since));
  if (dates.size === 0) {
    await markWebdav(userId, null, true);
    return { kind: "incr" as const, days: 0, entries: 0, images: 0, filename: null, skipped: "unchanged" as const };
  }
  const pack = {
    kind: "incremental" as const,
    since,
    exportedAt: full.exportedAt,
    userId: full.userId,
    settings: full.settings,
    days: full.days.filter((d) => dates.has(d.date)),
    entries: full.entries.filter((e) => dates.has(e.date)),
    images: full.images.filter((i) => dates.has(i.date)),
    notes: full.notes,
    spans: full.spans,
  };
  const filename = `slog-incr-${stampName()}.json`;
  await pushUserToWebdav(userId, filename, JSON.stringify(pack));
  await markWebdav(userId, null, true);
  return { kind: "incr" as const, days: pack.days.length, entries: pack.entries.length, images: pack.images.length, filename };
}

export const maybeWebdavBackup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const row = await readWebdavRow(context.userId);
    if (!row?.webdav_url || !row.webdav_password) return { skipped: "not-configured" as const };
    if (row.webdav_last_at) {
      const last = Date.parse(row.webdav_last_at);
      if (Number.isFinite(last) && Date.now() - last < AUTO_BACKUP_MS) {
        return { skipped: "fresh" as const, nextInMs: AUTO_BACKUP_MS - (Date.now() - last) };
      }
    }
    try {
      return await pushIncremental(context.userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "自动备份失败";
      await markWebdav(context.userId, message, false);
      throw new Error(message);
    }
  });

function snapToBackup(snap: LogSnapshot, userId = "import"): FullBackup {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    userId,
    settings: snap.settings ?? { favoriteLabel: "照相", semesterStart: null },
    days: Object.values(snap.days ?? {}),
    entries: Object.values(snap.entries ?? {}).flat(),
    images: Object.values(snap.images ?? {}).flat(),
    notes: snap.notes ?? [],
    spans: snap.spans ?? [],
    todos: Object.values(snap.todos ?? {}).flat(),
  };
}

function normalizeImport(raw: unknown): FullBackup[] {
  if (!raw || typeof raw !== "object") throw new Error("备份文件不是 JSON 对象");
  const data = raw as Record<string, unknown>;
  if (Array.isArray(data.users)) {
    return (data.users as FullBackup[]).filter((u) => u && typeof u === "object");
  }
  if (Array.isArray(data.days) && Array.isArray(data.entries)) {
    return [data as unknown as FullBackup];
  }
  if (data.guestSheets && typeof data.guestSheets === "object") {
    return Object.values(data.guestSheets as Record<string, LogSnapshot>).map((s) => snapToBackup(s));
  }
  if (data.days && typeof data.days === "object" && !Array.isArray(data.days)) {
    return [snapToBackup(data as unknown as LogSnapshot)];
  }
  const drafts = data.drafts;
  if (drafts && typeof drafts === "object") {
    const days: DayRecord[] = [];
    const entries: LogEntry[] = [];
    for (const payload of Object.values(drafts as Record<string, { day?: DayRecord; entries?: LogEntry[] }>)) {
      if (payload?.day) days.push(payload.day);
      if (payload?.entries) entries.push(...payload.entries);
    }
    if (days.length) {
      return [
        {
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          userId: "drafts",
          settings: { favoriteLabel: "照相", semesterStart: null },
          days,
          entries,
          images: [],
          notes: [],
          spans: [],
          todos: [],
        },
      ];
    }
  }
  throw new Error("认不出这个备份格式");
}

export const importBackup = createServerFn({ method: "POST" })
  .validator((raw: unknown) => raw)
  .middleware([authMiddleware])
  .handler(async ({ context, data: raw }) => {
    const { backup, mode } = parseImportArg(raw);
    const packs = normalizeImport(backup);
    const sql = await getSql();
    const userId = context.userId;
    const counts = { days: 0, entries: 0, images: 0, notes: 0, spans: 0, todos: 0, skippedDays: 0, imageErrors: 0 };
    for (const pack of packs) {
      await importPack(sql, userId, pack, mode, counts);
    }
    return counts;
  });

type ImportMode = "fill" | "replace-overlap";

function parseImportArg(raw: unknown): { backup: unknown; mode: ImportMode } {
  if (raw && typeof raw === "object" && "backup" in raw) {
    const d = raw as { backup: unknown; mode?: string };
    return { backup: d.backup, mode: d.mode === "replace-overlap" ? "replace-overlap" : "fill" };
  }
  return { backup: raw, mode: "fill" };
}

async function importPack(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  pack: FullBackup,
  mode: ImportMode,
  counts: { days: number; entries: number; images: number; notes: number; spans: number; todos: number; skippedDays: number; imageErrors: number },
) {
  if (mode === "replace-overlap" && pack.settings?.favoriteLabel) {
    await sql`insert into slog_settings (user_id, favorite_label, semester_start, seeded) values (${userId}, ${pack.settings.favoriteLabel}, ${pack.settings.semesterStart}, true) on conflict (user_id) do update set favorite_label = excluded.favorite_label, semester_start = excluded.semester_start`;
  }

  const dates = [...new Set((pack.days ?? []).map((d) => d.date).filter(Boolean))];
  if (mode === "replace-overlap") {
    for (const date of dates) {
      await sql`delete from slog_entries where user_id = ${userId} and day_date = ${date}`;
      await sql`delete from slog_images where user_id = ${userId} and day_date = ${date}`;
      await sql`delete from slog_todos where user_id = ${userId} and day_date = ${date}`;
    }
  }

  for (const d of pack.days ?? []) {
    if (!d?.date) continue;
    const existing = await sql<{
      id: string;
      journal: string | null;
      header_note: string | null;
      location: string | null;
      p3: string;
      primary_tone: string;
    }>`select id, journal, header_note, location, p3, primary_tone from slog_days where user_id = ${userId} and day_date = ${d.date}`;
    const row = existing[0];
    if (row && mode === "fill") {
      const journal = (row.journal ?? "").trim() ? row.journal : (d.journal ?? "");
      const header = (row.header_note ?? "").trim() ? row.header_note : (d.headerNote ?? "");
      const location = (row.location ?? "").trim() ? row.location : (d.location ?? "");
      const p3 = parseP3(row.p3).some(Boolean) ? row.p3 : JSON.stringify(d.p3 ?? []);
      await sql`update slog_days set journal = ${journal}, header_note = ${header}, location = ${location}, p3 = ${p3}, updated_at = now() where id = ${row.id} and user_id = ${userId}`;
      counts.skippedDays += 1;
      continue;
    }
    if (row && mode === "replace-overlap") {
      await sql`update slog_days set primary_tone = ${d.primaryTone ?? "month"}, secondary_tone = ${d.secondaryTone ?? null}, location = ${d.location ?? ""}, header_note = ${d.headerNote ?? ""}, p3 = ${JSON.stringify(d.p3 ?? [])}, journal = ${d.journal ?? ""}, updated_at = now() where id = ${row.id} and user_id = ${userId}`;
      counts.days += 1;
      continue;
    }
    await sql`insert into slog_days (id, user_id, day_date, primary_tone, secondary_tone, location, header_note, p3, journal) values (${crypto.randomUUID()}, ${userId}, ${d.date}, ${d.primaryTone ?? "month"}, ${d.secondaryTone ?? null}, ${d.location ?? ""}, ${d.headerNote ?? ""}, ${JSON.stringify(d.p3 ?? [])}, ${d.journal ?? ""}) on conflict (user_id, day_date) do nothing`;
    counts.days += 1;
  }

  for (const e of pack.entries ?? []) {
    if (!e?.date || !e.body) continue;
    if (mode === "fill") {
      const dup = await sql<{ c: number }>`select count(*)::int as c from slog_entries where user_id = ${userId} and day_date = ${e.date} and body = ${e.body}`;
      if ((dup[0]?.c ?? 0) > 0) continue;
    }
    await sql`insert into slog_entries (id, user_id, day_date, kind, body, marker, emphasis, starred, sort_order) values (${crypto.randomUUID()}, ${userId}, ${e.date}, ${e.kind ?? "ordinary"}, ${e.body}, ${e.marker ?? null}, ${e.emphasis ?? "normal"}, ${Boolean(e.starred)}, ${e.sortOrder ?? 0})`;
    counts.entries += 1;
  }

  for (const img of pack.images ?? []) {
    const url = img.dataUrl || img.thumbUrl || "";
    if (!url.startsWith("data:image/")) {
      counts.imageErrors += 1;
      continue;
    }
    try {
      const existing = await sql<{ c: number }>`select count(*)::int as c from slog_images where user_id = ${userId} and day_date = ${img.date}`;
      if ((existing[0]?.c ?? 0) >= 12) continue;
      if (mode === "fill") {
        const same = await sql<{ c: number }>`select count(*)::int as c from slog_images where user_id = ${userId} and day_date = ${img.date} and data_url = ${url}`;
        if ((same[0]?.c ?? 0) > 0) continue;
      }
      const thumb = img.thumbUrl && img.thumbUrl.startsWith("data:image/") ? img.thumbUrl : "";
      await sql`insert into slog_images (id, user_id, day_date, data_url, thumb_url, caption, sort_order) values (${crypto.randomUUID()}, ${userId}, ${img.date}, ${url}, ${thumb}, ${img.caption ?? ""}, ${img.sortOrder ?? 0})`;
      counts.images += 1;
    } catch {
      counts.imageErrors += 1;
    }
  }

  for (const n of pack.notes ?? []) {
    if (!n?.sheetKey) continue;
    if (mode === "fill") {
      const dup = await sql<{ c: number }>`select count(*)::int as c from slog_notes where user_id = ${userId} and sheet_key = ${n.sheetKey} and body = ${n.body ?? ""}`;
      if ((dup[0]?.c ?? 0) > 0) continue;
    }
    await sql`insert into slog_notes (id, user_id, sheet_key, week_start, kind, title, body, tone, emphasized, sort_order) values (${crypto.randomUUID()}, ${userId}, ${n.sheetKey}, ${n.weekStart}, ${n.kind ?? "plan"}, ${n.title ?? ""}, ${n.body ?? ""}, ${n.tone ?? null}, ${Boolean(n.emphasized)}, ${n.sortOrder ?? 0})`;
    counts.notes += 1;
  }

  for (const s of pack.spans ?? []) {
    if (!s?.startDate || !s.endDate) continue;
    if (mode === "fill") {
      const dup = await sql<{ c: number }>`select count(*)::int as c from slog_spans where user_id = ${userId} and start_date = ${s.startDate} and end_date = ${s.endDate} and label = ${s.label}`;
      if ((dup[0]?.c ?? 0) > 0) continue;
    }
    await sql`insert into slog_spans (id, user_id, start_date, end_date, kind, label, color, show_weeks) values (${crypto.randomUUID()}, ${userId}, ${s.startDate}, ${s.endDate}, ${s.kind ?? "trip"}, ${s.label}, ${s.color ?? "trip-pink"}, ${Boolean(s.showWeeks)})`;
    counts.spans += 1;
  }

  for (const t of pack.todos ?? []) {
    if (!t?.date || !(t.body ?? "").trim()) continue;
    if (mode === "fill") {
      const dup = await sql<{ c: number }>`select count(*)::int as c from slog_todos where user_id = ${userId} and day_date = ${t.date} and body = ${t.body}`;
      if ((dup[0]?.c ?? 0) > 0) continue;
    }
    await sql`insert into slog_todos (id, user_id, day_date, body, done, sort_order) values (${crypto.randomUUID()}, ${userId}, ${t.date}, ${t.body.trim()}, ${Boolean(t.done)}, ${t.sortOrder ?? 0})`;
    counts.todos += 1;
  }
}

export async function dumpPreviewAllUsers(): Promise<{
  exportedAt: string;
  source: string;
  counts: { users: number; days: number; entries: number; images: number };
  users: FullBackup[];
}> {
  const sql = await getSql();
  const idRows = await sql<{ user_id: string }>`
    select distinct user_id from slog_days
    union
    select distinct user_id from slog_settings
    union
    select distinct user_id from slog_images
    union
    select distinct user_id from slog_entries`;
  const users = [];
  for (const row of idRows) users.push(await backupForUser(row.user_id));
  return {
    exportedAt: new Date().toISOString(),
    source: "pglite-preview",
    counts: {
      users: users.length,
      days: users.reduce((n, u) => n + u.days.length, 0),
      entries: users.reduce((n, u) => n + u.entries.length, 0),
      images: users.reduce((n, u) => n + u.images.length, 0),
    },
    users,
  };
}

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
