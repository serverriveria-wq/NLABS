-- NLabs v6: tema del editor GD con archivos propios (ejecútalo UNA vez; es idempotente)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS gd_theme jsonb NOT NULL DEFAULT '{}'::jsonb;
