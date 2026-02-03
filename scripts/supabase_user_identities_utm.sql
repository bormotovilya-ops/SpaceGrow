-- Add UTM columns to user_identities for attribution (run in Supabase SQL editor if table already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_identities' AND column_name = 'utm_source') THEN
    ALTER TABLE user_identities ADD COLUMN utm_source TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_identities' AND column_name = 'utm_medium') THEN
    ALTER TABLE user_identities ADD COLUMN utm_medium TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_identities' AND column_name = 'utm_campaign') THEN
    ALTER TABLE user_identities ADD COLUMN utm_campaign TEXT;
  END IF;
END $$;
