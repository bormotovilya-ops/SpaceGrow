-- Выполнить один раз в Supabase: SQL Editor → вставить и Run.
-- Обходит ошибку PGRST204 (кэш схемы): вставка в user_segments через RPC, а не через REST по таблице.

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
