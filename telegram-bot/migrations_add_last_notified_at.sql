-- Добавить колонку last_notified_at в таблицу users для интервала маркетинговой рассылки.
-- Выполнить в Supabase SQL Editor один раз.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.last_notified_at IS 'Время последней отправки маркетингового сообщения (для интервала из bot_settings.marketing_interval_minutes)';
