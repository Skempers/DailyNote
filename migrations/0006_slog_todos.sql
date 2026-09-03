create table if not exists slog_todos (
  id text primary key,
  user_id text not null,
  day_date date not null,
  body text not null default '',
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists slog_todos_user_date_idx on slog_todos (user_id, day_date);
