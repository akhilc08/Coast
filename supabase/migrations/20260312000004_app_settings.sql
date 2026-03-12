-- supabase/migrations/011_app_settings.sql
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Admin can read and write; all server reads use the admin client (bypasses RLS)
CREATE POLICY "Admin full access" ON app_settings
  FOR ALL TO authenticated
  USING  (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

INSERT INTO app_settings (key, value)
VALUES ('transport_markup_pct', '0')
ON CONFLICT (key) DO NOTHING;
