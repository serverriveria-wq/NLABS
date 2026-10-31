-- =====================================================================
-- NLabs · migración v2  (ejecútala UNA vez en Supabase → SQL Editor)
-- Es idempotente: puedes volver a ejecutarla sin problema.
-- =====================================================================

-- 1) Arregla "permission denied for table site_settings" y que Noticias/Avisos no guarde.
--    Las políticas RLS ya limitan la escritura a administradores.
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

-- 2) Ajustes editables desde Shell
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS gd_preview_bg_url text,
  ADD COLUMN IF NOT EXISTS github_icon_url text;

-- 3) GitHub opcional + herramientas + dependencias en Collabs
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS github_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS tools text[] NOT NULL DEFAULT '{}';

-- 4) Arte
ALTER TABLE IF EXISTS public.artworks
  ADD COLUMN IF NOT EXISTS github_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS tools text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dependencies text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS license text,
  ADD COLUMN IF NOT EXISTS dimensions text;

-- 5) Música
ALTER TABLE IF EXISTS public.music_tracks
  ADD COLUMN IF NOT EXISTS github_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS tools text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dependencies text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS license text,
  ADD COLUMN IF NOT EXISTS bpm integer,
  ADD COLUMN IF NOT EXISTS musical_key text;

-- 6) Stickers del Room (los gestiona el admin desde Shell → Stickers)
CREATE TABLE IF NOT EXISTS public.room_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  order_index integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.room_stickers TO authenticated;
GRANT ALL ON public.room_stickers TO service_role;
ALTER TABLE public.room_stickers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS room_stickers_read ON public.room_stickers;
CREATE POLICY room_stickers_read ON public.room_stickers FOR SELECT TO authenticated USING (true);

ALTER TABLE public.room_messages ADD COLUMN IF NOT EXISTS sticker_url text;

-- 7) Eliminar mi propia cuenta
--    OJO: por las claves foráneas (ON DELETE CASCADE) también se borran los
--    proyectos creados por esa cuenta. La app lo avisa antes de confirmar.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'founder') THEN
    RAISE EXCEPTION 'La cuenta fundadora no se puede eliminar desde aquí';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
