-- NLabs v4: iconos personalizables por sección (ejecútalo UNA vez; es idempotente)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS section_icons jsonb NOT NULL DEFAULT '{}'::jsonb;
