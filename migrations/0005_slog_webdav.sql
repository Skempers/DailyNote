alter table slog_settings add column if not exists webdav_url text;
alter table slog_settings add column if not exists webdav_username text;
alter table slog_settings add column if not exists webdav_password text;
alter table slog_settings add column if not exists webdav_last_at timestamptz;
alter table slog_settings add column if not exists webdav_last_error text;
