-- =====================================================================
-- NLabs · migración v5  (ejecútala UNA vez en Supabase → SQL Editor)
-- Pega el CONTENIDO de este archivo, no su nombre. Es idempotente.
-- =====================================================================

-- 1) Botones de «Crear» editables desde Shell
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS create_buttons jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Buckets de Arte y Música (si ya existen no se tocan) + permisos
--    Esto arregla el "Failed to fetch" / "Bucket not found" al subir arte.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('art', 'art', false, 52428800), ('music', 'music', false, 52428800)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "nlabs_art_music_select" ON storage.objects;
CREATE POLICY "nlabs_art_music_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('art', 'music'));
DROP POLICY IF EXISTS "nlabs_art_music_insert" ON storage.objects;
CREATE POLICY "nlabs_art_music_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('art', 'music'));
DROP POLICY IF EXISTS "nlabs_art_music_delete" ON storage.objects;
CREATE POLICY "nlabs_art_music_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('art', 'music') AND owner = auth.uid());

-- 3) Proyectos PÚBLICOS: cualquiera con el enlace /public/<slug o id> puede verlos.
--    Solo devuelve proyectos con visibilidad "public" y ya publicados (no borrador),
--    y solo campos seguros (sin notas internas ni datos privados).
CREATE OR REPLACE FUNCTION public.get_public_project(p_ref text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.projects%ROWTYPE;
  allowed text[] := ARRAY['id','slug','name','description','type','status','difficulty','visibility','tags','deadline','start_date',
    'banner_url','thumbnail_url','preview_video_url','song_name','song_url','bpm','level_id','gd_version','level_length','progress',
    'tools','github_enabled','github_url','palette','created_at'];
  proj jsonb; members jsonb; parts jsonb;
BEGIN
  SELECT * INTO p FROM public.projects
   WHERE (slug = p_ref OR id::text = p_ref) AND visibility = 'public' AND COALESCE(is_draft, false) = false
   LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) INTO proj
    FROM jsonb_each(to_jsonb(p)) AS t(k, v) WHERE k = ANY(allowed);

  SELECT COALESCE(jsonb_agg(jsonb_build_object('username', pr.username, 'display_name', pr.display_name,
                                               'avatar_url', pr.avatar_url, 'role', pm.role_label)), '[]'::jsonb)
    INTO members
    FROM public.project_members pm JOIN public.profiles pr ON pr.id = pm.user_id
   WHERE pm.project_id = p.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', pa.name, 'percent_range', pa.percent_range, 'status', pa.status)
                            ORDER BY pa.position), '[]'::jsonb)
    INTO parts FROM public.project_parts pa WHERE pa.project_id = p.id;

  RETURN proj || jsonb_build_object('members', members, 'parts', parts);
END $$;
REVOKE ALL ON FUNCTION public.get_public_project(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_project(text) TO anon, authenticated;
