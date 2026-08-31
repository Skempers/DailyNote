-- SLog: per-user six-month life canvas
create table if not exists slog_settings (
  user_id text primary key,
  favorite_label text not null default '照相',
  semester_start date,
  seeded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists slog_days (
  id text primary key,
  user_id text not null,
  day_date date not null,
  primary_tone text not null default 'month',
  secondary_tone text,
  location text,
  header_note text,
  p3 text not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day_date)
);
create index if not exists slog_days_user_date_idx on slog_days (user_id, day_date);

create table if not exists slog_entries (
  id text primary key,
  user_id text not null,
  day_date date not null,
  kind text not null default 'ordinary',
  body text not null,
  marker text,
  emphasis text not null default 'normal',
  starred boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists slog_entries_user_date_idx on slog_entries (user_id, day_date);

create table if not exists slog_notes (
  id text primary key,
  user_id text not null,
  sheet_key text not null,
  week_start date,
  kind text not null default 'plan',
  title text not null default '',
  body text not null,
  tone text,
  emphasized boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists slog_notes_user_sheet_idx on slog_notes (user_id, sheet_key);

create table if not exists slog_spans (
  id text primary key,
  user_id text not null,
  start_date date not null,
  end_date date not null,
  kind text not null default 'trip',
  label text not null,
  color text not null default 'trip-pink',
  show_weeks boolean not null default false
);
create index if not exists slog_spans_user_idx on slog_spans (user_id, start_date);
