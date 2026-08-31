-- Day journal (free-form writing that auto-saves) + photos
alter table slog_days add column if not exists journal text not null default '';

create table if not exists slog_images (
  id text primary key,
  user_id text not null,
  day_date date not null,
  data_url text not null,
  caption text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists slog_images_user_date_idx on slog_images (user_id, day_date);
