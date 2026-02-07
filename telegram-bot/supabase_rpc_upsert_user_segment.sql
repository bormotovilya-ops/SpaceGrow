-- Выполнить один раз в Supabase: SQL Editor → вставить и Run.
-- Обходит ошибку PGRST204 (кэш схемы): вставка в user_segments через RPC, а не через REST по таблице.

-- Добавить поле масштаба проекта (если таблица уже есть):
ALTER TABLE public.user_segments ADD COLUMN IF NOT EXISTS segment_scale text;

CREATE OR REPLACE FUNCTION public.upsert_user_segment_on_start(
  p_tg_user_id bigint,
  p_segment_hunt_level int DEFAULT 0,
  p_segment_temperature text DEFAULT 'Нужна реанимация',
  p_updated_at timestamptz DEFAULT now(),
  p_last_update timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_segments
  SET segment_hunt_level = p_segment_hunt_level,
      segment_temperature = p_segment_temperature,
      updated_at = p_updated_at,
      last_update = p_last_update
  WHERE tg_user_id = p_tg_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_segments (tg_user_id, segment_hunt_level, segment_temperature, updated_at, last_update)
    VALUES (p_tg_user_id, p_segment_hunt_level, p_segment_temperature, p_updated_at, p_last_update);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_segment_on_start(bigint, int, text, timestamptz, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_user_segment_on_start(bigint, int, text, timestamptz, timestamptz) TO authenticated;

-- RPC: обновить сегмент по результатам теста "Знакомство" (ниша, hunt 1–5, temperature, scale).
-- Идентификация: по p_tg_user_id (если задан) иначе по p_cookie_id (гость). Хотя бы один должен быть задан.
-- segment_motivation: ниша из ob_1 (soft/hard/creative/other). segment_hunt_level: 1–5.
CREATE OR REPLACE FUNCTION public.upsert_user_segment_from_onboarding(
  p_segment_hunt_level int,
  p_tg_user_id bigint DEFAULT NULL,
  p_cookie_id text DEFAULT NULL,
  p_segment_motivation text DEFAULT NULL,
  p_segment_temperature text DEFAULT NULL,
  p_segment_scale text DEFAULT NULL,
  p_updated_at timestamptz DEFAULT now(),
  p_last_update timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- По tg_user_id
  IF p_tg_user_id IS NOT NULL THEN
    UPDATE public.user_segments
    SET segment_hunt_level = p_segment_hunt_level,
        segment_motivation = COALESCE(NULLIF(trim(p_segment_motivation), ''), segment_motivation),
        segment_temperature = COALESCE(NULLIF(trim(p_segment_temperature), ''), segment_temperature),
        segment_scale = COALESCE(NULLIF(trim(p_segment_scale), ''), segment_scale),
        updated_at = p_updated_at,
        last_update = p_last_update
    WHERE tg_user_id = p_tg_user_id;
    IF FOUND THEN RETURN; END IF;
    INSERT INTO public.user_segments (tg_user_id, segment_hunt_level, segment_motivation, segment_temperature, segment_scale, updated_at, last_update)
    VALUES (p_tg_user_id, p_segment_hunt_level, COALESCE(NULLIF(trim(p_segment_motivation), ''), NULL), COALESCE(NULLIF(trim(p_segment_temperature), ''), 'Нужна реанимация'), COALESCE(NULLIF(trim(p_segment_scale), ''), NULL), p_updated_at, p_last_update);
    RETURN;
  END IF;

  -- По cookie_id (гость: tg_user_id пустой)
  IF p_cookie_id IS NOT NULL AND trim(p_cookie_id) <> '' THEN
    UPDATE public.user_segments
    SET segment_hunt_level = p_segment_hunt_level,
        segment_motivation = COALESCE(NULLIF(trim(p_segment_motivation), ''), segment_motivation),
        segment_temperature = COALESCE(NULLIF(trim(p_segment_temperature), ''), segment_temperature),
        segment_scale = COALESCE(NULLIF(trim(p_segment_scale), ''), segment_scale),
        updated_at = p_updated_at,
        last_update = p_last_update
    WHERE cookie_id = p_cookie_id AND tg_user_id IS NULL;
    IF FOUND THEN RETURN; END IF;
    INSERT INTO public.user_segments (cookie_id, tg_user_id, segment_hunt_level, segment_motivation, segment_temperature, segment_scale, updated_at, last_update)
    VALUES (p_cookie_id, NULL, p_segment_hunt_level, COALESCE(NULLIF(trim(p_segment_motivation), ''), NULL), COALESCE(NULLIF(trim(p_segment_temperature), ''), 'Нужна реанимация'), COALESCE(NULLIF(trim(p_segment_scale), ''), NULL), p_updated_at, p_last_update);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_segment_from_onboarding(int, bigint, text, text, text, text, timestamptz, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_user_segment_from_onboarding(int, bigint, text, text, text, text, timestamptz, timestamptz) TO authenticated;
