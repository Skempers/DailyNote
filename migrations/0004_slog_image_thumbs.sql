-- Small thumbs ride with the half-year sheet; full data_url loads per day.
alter table slog_images add column if not exists thumb_url text not null default '';
