-- Таблица app_config для настроек приложения (зоны Кабинета и др.).
-- Выполните в Supabase: Dashboard → SQL Editor → New query → вставьте весь блок → Run.

-- 1. Таблица в схеме public
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS (при повторном запуске сначала удаляем старые политики)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read app_config" ON public.app_config;
DROP POLICY IF EXISTS "Allow insert update app_config" ON public.app_config;

CREATE POLICY "Allow read app_config"
  ON public.app_config FOR SELECT
  USING (true);

CREATE POLICY "Allow insert update app_config"
  ON public.app_config FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.app_config IS 'Глобальные настройки: cabinet-zones (зоны Кабинета) и др.';
