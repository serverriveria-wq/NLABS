-- NLabs · esquema completo (base DUCKDUCKGO adaptada). Ejecutar UNA vez en Supabase → SQL Editor.
-- Limpia políticas de storage de pruebas anteriores de NLabs.
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- ===== 20260704224750_be8f9ac1-9eb0-406c-a706-63f7a263399a.sql =====

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('founder','owner','administrator','moderator','project_manager','host','member','guest');
CREATE TYPE public.project_type AS ENUM ('solo','mini_collab','collab','megacollab','extreme_demon','art','layout','remake','contest','secret');
CREATE TYPE public.project_status AS ENUM ('active','paused','review','verification','showcase','cancelled','completed','published');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- is_admin: founder/owner/administrator
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('founder','owner','administrator')
  );
$$;

-- MODALITIES
CREATE TABLE public.modalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modalities TO authenticated;
GRANT ALL ON public.modalities TO service_role;
ALTER TABLE public.modalities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_modalities (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modality_id UUID NOT NULL REFERENCES public.modalities(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, modality_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_modalities TO authenticated;
GRANT ALL ON public.user_modalities TO service_role;
ALTER TABLE public.user_modalities ENABLE ROW LEVEL SECURITY;

-- PROJECTS
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  type public.project_type NOT NULL DEFAULT 'collab',
  status public.project_status NOT NULL DEFAULT 'active',
  difficulty TEXT,
  progress INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cohost_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  required_modalities UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modality_id UUID REFERENCES public.modalities(id) ON DELETE SET NULL,
  role_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, modality_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_comments TO authenticated;
GRANT ALL ON public.project_comments TO service_role;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- profiles: all authenticated read; own or admin update; only service/admin insert; admin delete
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_insert_admin" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() = id);
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- user_roles: read own or admin; write admin only
CREATE POLICY "roles_read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "roles_write_admin" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- modalities: all read; admin write
CREATE POLICY "modalities_read" ON public.modalities FOR SELECT TO authenticated USING (true);
CREATE POLICY "modalities_write_admin" ON public.modalities FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_modalities: all read; own or admin write
CREATE POLICY "umod_read" ON public.user_modalities FOR SELECT TO authenticated USING (true);
CREATE POLICY "umod_write" ON public.user_modalities FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- projects
CREATE POLICY "projects_read" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = host_id OR auth.uid() = cohost_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR auth.uid() = host_id OR auth.uid() = cohost_id OR public.is_admin(auth.uid()));
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- project_members
CREATE POLICY "pmembers_read" ON public.project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "pmembers_write" ON public.project_members FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id
      AND (p.created_by = auth.uid() OR p.host_id = auth.uid() OR p.cohost_id = auth.uid()))
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id
      AND (p.created_by = auth.uid() OR p.host_id = auth.uid() OR p.cohost_id = auth.uid()))
  );

-- project_comments
CREATE POLICY "pcomments_read" ON public.project_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "pcomments_insert" ON public.project_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pcomments_update_own" ON public.project_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pcomments_delete" ON public.project_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Seed modalities
INSERT INTO public.modalities (name, slug) VALUES
  ('Host','host'),('Co-host','co-host'),('Layout Creator','layout-creator'),
  ('Gameplay Creator','gp-creator'),('Trigger Creator','trigger-creator'),
  ('Camera Creator','camera-creator'),('Syncer','syncer'),('Passer','passer'),
  ('Decorator','decorator'),('Air Decorator','air-decorator'),('Block Designer','block-designer'),
  ('Art Creator','art-creator'),('Background Creator','background-creator'),
  ('Background Artist','background-artist'),('Colorist','colorist'),('Glow Creator','glow-creator'),
  ('Logo Creator','logo-creator'),('Effect Creator','fx-creator'),('Animator','animator'),
  ('Intro Creator','intro-creator'),('End Screen Creator','endscreen-creator'),
  ('Optimizer','optimizer'),('Playtester','playtester'),('Verifier','verifier'),
  ('Showcaser','showcaser'),('Thumbnail Creator','thumbnail-creator'),
  ('Publisher','publisher'),('Credit Designer','credit-designer'),('Lore Writer','lore-writer');

-- ===== 20260704224805_c569ba0e-5b37-44e5-8668-6cd8654f9426.sql =====

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;

-- ===== 20260705005924_78570f6d-680c-4353-8010-08785bd7d5cb.sql =====

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'team',
  ADD COLUMN IF NOT EXISTS track_progress_history boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS song_name text,
  ADD COLUMN IF NOT EXISTS song_url text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE TABLE IF NOT EXISTS public.project_progress_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  progress integer NOT NULL CHECK (progress >= 0 AND progress <= 100),
  note text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_progress_history TO authenticated;
GRANT ALL ON public.project_progress_history TO service_role;

ALTER TABLE public.project_progress_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view progress history"
  ON public.project_progress_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert progress history"
  ON public.project_progress_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = changed_by);

-- Trigger to auto-record progress when track_progress_history is on
CREATE OR REPLACE FUNCTION public.record_project_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.track_progress_history AND (TG_OP = 'INSERT' OR NEW.progress IS DISTINCT FROM OLD.progress) THEN
    INSERT INTO public.project_progress_history (project_id, progress, changed_by)
    VALUES (NEW.id, NEW.progress, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_project_progress ON public.projects;
CREATE TRIGGER trg_record_project_progress
  AFTER INSERT OR UPDATE OF progress ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.record_project_progress();

-- ===== 20260705005953_51734c87-98ab-4ab2-af4a-f0c6b46bb572.sql =====
REVOKE EXECUTE ON FUNCTION public.record_project_progress() FROM PUBLIC, anon, authenticated;
-- ===== 20260705205840_e6365b1b-c4fe-48df-acb2-860f91fa2736.sql =====

-- 1. modalities: icon_url
ALTER TABLE public.modalities ADD COLUMN IF NOT EXISTS icon_url text;

-- 2. projects: nuevos campos
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS preview_video_url text,
  ADD COLUMN IF NOT EXISTS preview_button_image_url text,
  ADD COLUMN IF NOT EXISTS name_segments jsonb;

-- 3. project_progress_history: GD share + etiqueta de versión
ALTER TABLE public.project_progress_history
  ADD COLUMN IF NOT EXISTS gd_share_url text,
  ADD COLUMN IF NOT EXISTS version_label text;

-- 4. site_settings (singleton)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  logo_url text,
  favicon_url text,
  preview_button_image_url text,
  site_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_settings_read_all" ON public.site_settings;
CREATE POLICY "site_settings_read_all" ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "site_settings_write_admin" ON public.site_settings;
CREATE POLICY "site_settings_write_admin" ON public.site_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
INSERT INTO public.site_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- 5. text_overrides
CREATE TABLE IF NOT EXISTS public.text_overrides (
  key text PRIMARY KEY,
  value text NOT NULL,
  gradient jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.text_overrides TO anon, authenticated;
GRANT ALL ON public.text_overrides TO service_role;
ALTER TABLE public.text_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "text_overrides_read_all" ON public.text_overrides;
CREATE POLICY "text_overrides_read_all" ON public.text_overrides FOR SELECT USING (true);
DROP POLICY IF EXISTS "text_overrides_write_admin" ON public.text_overrides;
CREATE POLICY "text_overrides_write_admin" ON public.text_overrides FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 6. Rate limit: 2 proyectos / 24h para no-admins
CREATE OR REPLACE FUNCTION public.enforce_project_daily_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cnt int;
BEGIN
  IF public.is_admin(NEW.created_by) THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO cnt FROM public.projects
    WHERE created_by = NEW.created_by
      AND created_at >= (now() - interval '24 hours');
  IF cnt >= 2 THEN
    RAISE EXCEPTION 'Límite diario alcanzado: máximo 2 proyectos por día. El spam de proyectos está prohibido.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_project_daily_limit ON public.projects;
CREATE TRIGGER trg_project_daily_limit
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_daily_limit();

-- 7. Trigger para actualizar updated_at en las nuevas tablas
DROP TRIGGER IF EXISTS trg_site_settings_updated ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_text_overrides_updated ON public.text_overrides;
CREATE TRIGGER trg_text_overrides_updated BEFORE UPDATE ON public.text_overrides
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 8. Storage: políticas RLS para los buckets (admin en branding/modality-icons; autenticado en project-media/gd-shares)
DROP POLICY IF EXISTS "branding_read" ON storage.objects;
CREATE POLICY "branding_read" ON storage.objects FOR SELECT
  USING (bucket_id IN ('branding','modality-icons','project-media','gd-shares'));

DROP POLICY IF EXISTS "branding_admin_write" ON storage.objects;
CREATE POLICY "branding_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('branding','modality-icons') AND public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "branding_admin_update" ON storage.objects;
CREATE POLICY "branding_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('branding','modality-icons') AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id IN ('branding','modality-icons') AND public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "branding_admin_delete" ON storage.objects;
CREATE POLICY "branding_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('branding','modality-icons') AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "project_media_write" ON storage.objects;
CREATE POLICY "project_media_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('project-media','gd-shares'));
DROP POLICY IF EXISTS "project_media_update" ON storage.objects;
CREATE POLICY "project_media_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('project-media','gd-shares') AND owner = auth.uid())
  WITH CHECK (bucket_id IN ('project-media','gd-shares') AND owner = auth.uid());
DROP POLICY IF EXISTS "project_media_delete" ON storage.objects;
CREATE POLICY "project_media_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('project-media','gd-shares') AND (owner = auth.uid() OR public.is_admin(auth.uid())));

-- ===== 20260705205857_eaea4294-bd93-4ef5-bd96-1cbd195e1619.sql =====

REVOKE EXECUTE ON FUNCTION public.enforce_project_daily_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_project_progress() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- ===== 20260705214522_d310668c-f2e7-43c7-a1a6-bf194e38e00d.sql =====

-- Allow owners and admins to edit their projects
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- Grant founder role to elnevulex@gmail.com
DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = 'elnevulex@gmail.com' LIMIT 1;
  IF uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'founder')
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'owner')
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'administrator')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- ===== 20260705220018_97bdac57-d643-471f-afa3-05c1f42957ae.sql =====

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- Existing users stay approved
UPDATE public.profiles SET approved = true WHERE approved = false;

-- Auto-approve when granted an admin-tier role
CREATE OR REPLACE FUNCTION public.auto_approve_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IN ('founder','owner','administrator','moderator','project_manager','host') THEN
    UPDATE public.profiles SET approved = true WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_approve_admin_role ON public.user_roles;
CREATE TRIGGER trg_auto_approve_admin_role
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.auto_approve_admin_role();

-- ===== 20260705221925_87979671-2c7a-48a9-8c0e-87dfcbc9187d.sql =====
ALTER TABLE public.profiles ALTER COLUMN approved SET DEFAULT true;
UPDATE public.profiles SET approved = true WHERE approved = false;
-- ===== 20260706003445_2e05146c-bb83-4940-b3dc-14d022622d6d.sql =====

CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.slugify(v text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(public.unaccent(coalesce(v,''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

CREATE OR REPLACE FUNCTION public.projects_set_slug() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base text; candidate text; n int := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP='UPDATE' AND NEW.name IS DISTINCT FROM OLD.name) THEN
    base := public.slugify(NEW.name);
    IF base = '' THEN base := 'proyecto'; END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.projects WHERE slug = candidate AND id <> NEW.id) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_projects_set_slug ON public.projects;
CREATE TRIGGER trg_projects_set_slug BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.projects_set_slug();

UPDATE public.projects SET slug = NULL;
UPDATE public.projects SET name = name;

CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_key ON public.projects(slug);

-- ===== 20260708004643_892d1952-4cd5-467d-9142-639fb42b7071.sql =====

-- 1) Extender projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS duration_seconds int,
  ADD COLUMN IF NOT EXISTS style text,
  ADD COLUMN IF NOT EXISTS layout_pct int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gameplay_pct int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS decoration_pct int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_pct int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits text;

-- 2) project_members extras
ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS contribution_pct int NOT NULL DEFAULT 0;

-- 3) project_comments: parent + adjuntos
ALTER TABLE public.project_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.project_comments(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.project_comment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.project_comments(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_comment_attachments TO authenticated;
GRANT ALL ON public.project_comment_attachments TO service_role;
ALTER TABLE public.project_comment_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read comment attachments" ON public.project_comment_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert own comment attachments" ON public.project_comment_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.project_comments c WHERE c.id = comment_id AND c.user_id = auth.uid()));
CREATE POLICY "auth delete own comment attachments" ON public.project_comment_attachments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_comments c WHERE c.id = comment_id AND c.user_id = auth.uid()));

-- Helper: can user edit project
CREATE OR REPLACE FUNCTION public.can_edit_project(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND (
      p.created_by = _user_id OR p.host_id = _user_id OR p.cohost_id = _user_id
      OR public.is_admin(_user_id)
    )
  ) OR EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = _project_id AND m.user_id = _user_id AND m.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.can_edit_project(_project_id, _user_id);
$$;

-- 4) project_gallery
CREATE TABLE IF NOT EXISTS public.project_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url text NOT NULL,
  description text,
  order_index int NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_gallery TO authenticated;
GRANT ALL ON public.project_gallery TO service_role;
ALTER TABLE public.project_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery read" ON public.project_gallery FOR SELECT TO authenticated USING (true);
CREATE POLICY "gallery edit by members" ON public.project_gallery FOR ALL TO authenticated
  USING (public.can_edit_project(project_id, auth.uid()))
  WITH CHECK (public.can_edit_project(project_id, auth.uid()));

-- 5) tasks
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  assignee_id uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
GRANT ALL ON public.project_tasks TO service_role;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks read" ON public.project_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks edit by members" ON public.project_tasks FOR ALL TO authenticated
  USING (public.can_edit_project(project_id, auth.uid()))
  WITH CHECK (public.can_edit_project(project_id, auth.uid()));
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6) files
CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url text NOT NULL,
  name text NOT NULL,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO authenticated;
GRANT ALL ON public.project_files TO service_role;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files read" ON public.project_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "files edit by members" ON public.project_files FOR ALL TO authenticated
  USING (public.can_edit_project(project_id, auth.uid()))
  WITH CHECK (public.can_edit_project(project_id, auth.uid()));

-- 7) links
CREATE TABLE IF NOT EXISTS public.project_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'other',
  url text NOT NULL,
  label text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_links TO authenticated;
GRANT ALL ON public.project_links TO service_role;
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "links read" ON public.project_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "links edit by members" ON public.project_links FOR ALL TO authenticated
  USING (public.can_edit_project(project_id, auth.uid()))
  WITH CHECK (public.can_edit_project(project_id, auth.uid()));

-- 8) chat messages
CREATE TABLE IF NOT EXISTS public.project_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_chat_messages TO authenticated;
GRANT ALL ON public.project_chat_messages TO service_role;
ALTER TABLE public.project_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat read members" ON public.project_chat_messages FOR SELECT TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "chat insert members" ON public.project_chat_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_project_member(project_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "chat update own or editor" ON public.project_chat_messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can_edit_project(project_id, auth.uid()));
CREATE POLICY "chat delete own or editor" ON public.project_chat_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_edit_project(project_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.project_chat_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.project_chat_messages(id) ON DELETE CASCADE,
  url text NOT NULL,
  kind text NOT NULL DEFAULT 'image',
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_chat_attachments TO authenticated;
GRANT ALL ON public.project_chat_attachments TO service_role;
ALTER TABLE public.project_chat_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat att read" ON public.project_chat_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_chat_messages m WHERE m.id = message_id AND public.is_project_member(m.project_id, auth.uid())));
CREATE POLICY "chat att write" ON public.project_chat_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.project_chat_messages m WHERE m.id = message_id AND m.user_id = auth.uid()));

-- 9) activity
CREATE TABLE IF NOT EXISTS public.project_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.project_activity TO authenticated;
GRANT ALL ON public.project_activity TO service_role;
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity read" ON public.project_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity insert authed" ON public.project_activity FOR INSERT TO authenticated
  WITH CHECK (actor_id IS NULL OR actor_id = auth.uid());

-- 10) favorites
CREATE TABLE IF NOT EXISTS public.project_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);
GRANT SELECT, INSERT, DELETE ON public.project_favorites TO authenticated;
GRANT ALL ON public.project_favorites TO service_role;
ALTER TABLE public.project_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fav own read" ON public.project_favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "fav own write" ON public.project_favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "fav own delete" ON public.project_favorites FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 11) join requests
CREATE TABLE IF NOT EXISTS public.project_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_join_requests TO authenticated;
GRANT ALL ON public.project_join_requests TO service_role;
ALTER TABLE public.project_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jr read own or editor" ON public.project_join_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_edit_project(project_id, auth.uid()));
CREATE POLICY "jr insert own" ON public.project_join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "jr update editor" ON public.project_join_requests FOR UPDATE TO authenticated
  USING (public.can_edit_project(project_id, auth.uid()));
CREATE POLICY "jr delete own or editor" ON public.project_join_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_edit_project(project_id, auth.uid()));

-- 12) views
CREATE TABLE IF NOT EXISTS public.project_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  view_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, viewer_id, view_date)
);
GRANT SELECT, INSERT ON public.project_views TO authenticated;
GRANT ALL ON public.project_views TO service_role;
ALTER TABLE public.project_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views read" ON public.project_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "views insert own" ON public.project_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_project_views() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.projects SET views_count = COALESCE(views_count,0) + 1 WHERE id = NEW.project_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_bump_project_views ON public.project_views;
CREATE TRIGGER trg_bump_project_views AFTER INSERT ON public.project_views
  FOR EACH ROW EXECUTE FUNCTION public.bump_project_views();

-- 13) notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif own update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif own delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif insert authed" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- 14) realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ===== 20260709220034_67173b20-25e0-402c-9683-f5cc508cbea9.sql =====

CREATE TABLE public.link_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  icon_url text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.link_types TO anon, authenticated;
GRANT ALL ON public.link_types TO service_role;

ALTER TABLE public.link_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "link_types readable by all"
  ON public.link_types FOR SELECT
  USING (true);

CREATE POLICY "link_types admin write"
  ON public.link_types FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER link_types_updated_at
  BEFORE UPDATE ON public.link_types
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.project_links
  ADD COLUMN IF NOT EXISTS link_type_id uuid REFERENCES public.link_types(id) ON DELETE SET NULL;

-- Seed common link types
INSERT INTO public.link_types (slug, label, order_index) VALUES
  ('discord', 'Discord', 10),
  ('drive', 'Google Drive', 20),
  ('youtube', 'YouTube', 30),
  ('whatsapp', 'WhatsApp', 40),
  ('music', 'Música', 50),
  ('gdshare', 'GDShare', 60),
  ('other', 'Otro', 999)
ON CONFLICT (slug) DO NOTHING;

-- ===== 20260710005909_749b854d-7c40-4c5b-8ebf-b8b6471287a8.sql =====

CREATE OR REPLACE FUNCTION public.enforce_comment_daily_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cnt int; is_owner boolean;
BEGIN
  IF public.is_admin(NEW.user_id) THEN RETURN NEW; END IF;
  SELECT EXISTS(SELECT 1 FROM public.projects p WHERE p.id = NEW.project_id
    AND (p.created_by = NEW.user_id OR p.host_id = NEW.user_id OR p.cohost_id = NEW.user_id))
    INTO is_owner;
  IF is_owner THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO cnt FROM public.project_comments
    WHERE user_id = NEW.user_id AND created_at >= (now() - interval '24 hours');
  IF cnt >= 2 THEN
    RAISE EXCEPTION 'Límite diario alcanzado: máximo 2 comentarios por día.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_comment_daily_limit ON public.project_comments;
CREATE TRIGGER trg_comment_daily_limit
  BEFORE INSERT ON public.project_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_daily_limit();

-- Allow project owners/host/cohost to moderate (delete) comments on their project
DROP POLICY IF EXISTS pcomments_delete ON public.project_comments;
CREATE POLICY pcomments_delete ON public.project_comments FOR DELETE
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id
      AND (p.created_by = auth.uid() OR p.host_id = auth.uid() OR p.cohost_id = auth.uid()))
  );

-- ===== 20260711012904_7f673067-a368-4ccc-bb03-1fba9ca07a10.sql =====

CREATE TABLE public.dependency_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  icon_url text,
  order_index int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dependency_types TO authenticated;
GRANT ALL ON public.dependency_types TO service_role;
ALTER TABLE public.dependency_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deps_types_read" ON public.dependency_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "deps_types_admin_write" ON public.dependency_types FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER dep_types_set_updated BEFORE UPDATE ON public.dependency_types
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.project_dependencies (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  dependency_id uuid NOT NULL REFERENCES public.dependency_types(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, dependency_id)
);
GRANT SELECT, INSERT, DELETE ON public.project_dependencies TO authenticated;
GRANT ALL ON public.project_dependencies TO service_role;
ALTER TABLE public.project_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdeps_read" ON public.project_dependencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "pdeps_editor_write" ON public.project_dependencies FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_project(project_id, auth.uid()));
CREATE POLICY "pdeps_editor_delete" ON public.project_dependencies FOR DELETE TO authenticated
  USING (public.can_edit_project(project_id, auth.uid()));

-- ===== 20260716005125_5b43667d-e268-4d2b-b1b8-a606d1ab3652.sql =====

CREATE TABLE public.site_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  released_at date,
  notes text,
  order_index int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_versions TO anon, authenticated;
GRANT ALL ON public.site_versions TO service_role;
ALTER TABLE public.site_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_versions readable by everyone" ON public.site_versions FOR SELECT USING (true);

CREATE TRIGGER trg_site_versions_updated_at BEFORE UPDATE ON public.site_versions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.site_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  image_url text,
  url text,
  order_index int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_credits TO anon, authenticated;
GRANT ALL ON public.site_credits TO service_role;
ALTER TABLE public.site_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_credits readable by everyone" ON public.site_credits FOR SELECT USING (true);

CREATE TRIGGER trg_site_credits_updated_at BEFORE UPDATE ON public.site_credits
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== 20260717002542_d1f58945-dc63-47c1-980a-1656051c75f5.sql =====

CREATE TABLE public.site_dedications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  target_name TEXT,
  message TEXT,
  image_url TEXT,
  url TEXT,
  order_index INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_dedications TO anon, authenticated;
GRANT ALL ON public.site_dedications TO service_role;
ALTER TABLE public.site_dedications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read dedications" ON public.site_dedications FOR SELECT USING (true);
CREATE TRIGGER trg_dedications_updated_at BEFORE UPDATE ON public.site_dedications
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== 20260801135822_086aa0de-2bdf-48af-8e82-a59a445f20c8.sql =====

-- DIFFICULTY LEVELS
CREATE TABLE public.difficulty_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  icon_url text,
  color text,
  order_index integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.difficulty_levels TO anon;
GRANT SELECT ON public.difficulty_levels TO authenticated;
GRANT ALL ON public.difficulty_levels TO service_role;
ALTER TABLE public.difficulty_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "difficulty_levels public read" ON public.difficulty_levels FOR SELECT USING (true);
CREATE TRIGGER difficulty_levels_updated_at BEFORE UPDATE ON public.difficulty_levels FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- SOCIAL TYPES
CREATE TABLE public.social_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  icon_url text,
  url_prefix text,
  order_index integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_types TO anon;
GRANT SELECT ON public.social_types TO authenticated;
GRANT ALL ON public.social_types TO service_role;
ALTER TABLE public.social_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_types public read" ON public.social_types FOR SELECT USING (true);
CREATE TRIGGER social_types_updated_at BEFORE UPDATE ON public.social_types FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- USER SOCIALS
CREATE TABLE public.user_socials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_type_id uuid NOT NULL REFERENCES public.social_types(id) ON DELETE CASCADE,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, social_type_id)
);
GRANT SELECT ON public.user_socials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_socials TO authenticated;
GRANT ALL ON public.user_socials TO service_role;
ALTER TABLE public.user_socials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_socials public read" ON public.user_socials FOR SELECT USING (true);
CREATE POLICY "user_socials owner insert" ON public.user_socials FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_socials owner update" ON public.user_socials FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_socials owner delete" ON public.user_socials FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE TRIGGER user_socials_updated_at BEFORE UPDATE ON public.user_socials FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- TEXT ICONS  (#geode -> image)
CREATE TABLE public.text_icons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.text_icons TO anon;
GRANT SELECT ON public.text_icons TO authenticated;
GRANT ALL ON public.text_icons TO service_role;
ALTER TABLE public.text_icons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "text_icons public read" ON public.text_icons FOR SELECT USING (true);
CREATE TRIGGER text_icons_updated_at BEFORE UPDATE ON public.text_icons FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== 20260802132038_f8753fb6-ba9f-491f-9e11-1f2ae92c2aa2.sql =====
CREATE OR REPLACE FUNCTION public.notify_project_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.progress IS DISTINCT FROM OLD.progress THEN
    INSERT INTO public.notifications (user_id, project_id, title, body, link)
    SELECT p.id, NEW.id,
           'Progreso actualizado: ' || NEW.name,
           'El proyecto pasó de ' || COALESCE(OLD.progress,0) || '% a ' || COALESCE(NEW.progress,0) || '%.',
           '/projects/' || NEW.id::text
    FROM public.profiles p
    WHERE p.id IS DISTINCT FROM auth.uid();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_project_progress ON public.projects;
CREATE TRIGGER trg_notify_project_progress
AFTER UPDATE OF progress ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.notify_project_progress();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ===== 20260810121139_0d9ee8b4-f784-47f9-94cd-25210b49678b.sql =====
CREATE TABLE public.site_honors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  reason text,
  image_url text,
  url text,
  kind text NOT NULL DEFAULT 'memorable',
  order_index integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_honors TO anon;
GRANT SELECT ON public.site_honors TO authenticated;
GRANT ALL ON public.site_honors TO service_role;

ALTER TABLE public.site_honors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Honors are viewable by everyone"
ON public.site_honors FOR SELECT
USING (true);

CREATE TRIGGER trg_site_honors_updated_at
BEFORE UPDATE ON public.site_honors
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
-- ===== 20260827235302_a583d2b1-0bd5-4248-a01b-b92f56dac60c.sql =====
CREATE TABLE public.site_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  url text NOT NULL,
  logo_url text,
  banner_url text,
  order_index integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_links TO anon, authenticated;
GRANT ALL ON public.site_links TO service_role;

ALTER TABLE public.site_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_links_public_read" ON public.site_links FOR SELECT USING (true);

CREATE TRIGGER site_links_set_updated_at
BEFORE UPDATE ON public.site_links
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
-- ===== 20260830010630_1ec4a2da-e861-48bf-b02a-cee83e8bb739.sql =====
-- Profile badge
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badge_label text,
  ADD COLUMN IF NOT EXISTS badge_gradient jsonb;

-- Team join requests
CREATE TABLE public.team_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  modality_id uuid REFERENCES public.modalities(id) ON DELETE SET NULL,
  playtime text,
  reason text NOT NULL,
  accepted_terms boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.team_requests TO authenticated;
GRANT ALL ON public.team_requests TO service_role;
ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own requests select" ON public.team_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "own requests insert" ON public.team_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND accepted_terms = true);
CREATE TRIGGER trg_team_requests_updated BEFORE UPDATE ON public.team_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Trophies
CREATE TABLE public.site_trophies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  url text,
  awarded_to text,
  awarded_at date,
  order_index integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_trophies TO anon, authenticated;
GRANT ALL ON public.site_trophies TO service_role;
ALTER TABLE public.site_trophies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trophies public read" ON public.site_trophies FOR SELECT USING (true);
CREATE TRIGGER trg_site_trophies_updated BEFORE UPDATE ON public.site_trophies
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Markdown docs (rules / terms)
CREATE TABLE public.site_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content_md text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_docs TO anon, authenticated;
GRANT ALL ON public.site_docs TO service_role;
ALTER TABLE public.site_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs public read" ON public.site_docs FOR SELECT USING (true);
CREATE TRIGGER trg_site_docs_updated BEFORE UPDATE ON public.site_docs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.site_docs (slug, title, content_md, order_index) VALUES
('terminos', 'Términos y condiciones', E'# Términos y condiciones\n\n## Reglas\n- Respeta a todos los miembros del team.\n- Prohibido el spam de proyectos (máximo 2 por día).\n\n## Permisos\n- Los miembros aprobados pueden crear y editar proyectos propios.\n\n## Limitaciones\n- Máximo 2 comentarios por día por usuario.\n\n*Editable desde Labs.*', 1);
-- ===== 20260902005814_905228b7-0e69-436c-b639-caadda8990cb.sql =====
CREATE TABLE public.auth_page_settings (
  id boolean NOT NULL PRIMARY KEY DEFAULT true CHECK (id),
  logo_url text,
  title text NOT NULL DEFAULT 'NLab',
  subtitle text NOT NULL DEFAULT 'Plataforma privada de collabs de Geometry Dash',
  background_url text,
  background_gradient text,
  tab_signin_label text NOT NULL DEFAULT 'Iniciar sesión',
  tab_signup_label text NOT NULL DEFAULT 'Crear cuenta',
  identifier_label text NOT NULL DEFAULT 'Usuario o correo',
  identifier_placeholder text NOT NULL DEFAULT 'tu_usuario o correo@dominio',
  password_label text NOT NULL DEFAULT 'Contraseña',
  password_placeholder text NOT NULL DEFAULT '••••••••',
  email_label text NOT NULL DEFAULT 'Correo',
  email_placeholder text NOT NULL DEFAULT 'tucorreo@dominio.com',
  username_label text NOT NULL DEFAULT 'Usuario',
  username_placeholder text NOT NULL DEFAULT 'usuario_gd',
  signin_button text NOT NULL DEFAULT 'Ingresar',
  signup_button text NOT NULL DEFAULT 'Crear cuenta',
  notice text,
  show_back_link boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auth_page_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_page_settings TO authenticated;
GRANT ALL ON public.auth_page_settings TO service_role;

ALTER TABLE public.auth_page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_page_settings_read_all" ON public.auth_page_settings FOR SELECT USING (true);
CREATE POLICY "auth_page_settings_write_admin" ON public.auth_page_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_auth_page_settings_updated BEFORE UPDATE ON public.auth_page_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.auth_page_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.team_requests
  ADD CONSTRAINT team_requests_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
-- ===== 20260904000454_dc42a5f7-1b8a-44fa-b858-8e8d830d5bd5.sql =====

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.push_tokens to authenticated;
grant all on public.push_tokens to service_role;

alter table public.push_tokens enable row level security;

create policy "Users manage own push tokens"
  on public.push_tokens for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_push_tokens_updated before update on public.push_tokens
  for each row execute function public.tg_set_updated_at();

-- helper: notify every member of the team
create or replace function public.notify_everyone(_project_id uuid, _title text, _body text, _link text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.notifications (user_id, project_id, title, body, link)
  select p.id, _project_id, _title, _body, _link
  from public.profiles p
  where p.id is distinct from auth.uid();
end $$;

-- broaden project change notifications
create or replace function public.notify_project_progress()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare parts text[] := '{}';
begin
  if NEW.progress is distinct from OLD.progress then
    parts := parts || ('progreso ' || coalesce(OLD.progress,0) || '% → ' || coalesce(NEW.progress,0) || '%');
  end if;
  if NEW.status is distinct from OLD.status then
    parts := parts || ('estado: ' || NEW.status::text);
  end if;
  if NEW.name is distinct from OLD.name then
    parts := parts || ('nuevo nombre: ' || NEW.name);
  end if;
  if NEW.difficulty is distinct from OLD.difficulty then
    parts := parts || ('dificultad: ' || coalesce(NEW.difficulty,'-'));
  end if;
  if NEW.description is distinct from OLD.description then
    parts := parts || 'descripción actualizada';
  end if;
  if NEW.deadline is distinct from OLD.deadline then
    parts := parts || 'fecha límite actualizada';
  end if;
  if array_length(parts, 1) is null then
    return NEW;
  end if;
  perform public.notify_everyone(NEW.id, 'Proyecto actualizado: ' || NEW.name,
    array_to_string(parts, ' · '), '/projects/' || NEW.id::text);
  return NEW;
end $$;

create or replace function public.notify_new_member()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare pname text; uname text;
begin
  select name into pname from public.projects where id = NEW.project_id;
  select coalesce(display_name, username) into uname from public.profiles where id = NEW.user_id;
  perform public.notify_everyone(NEW.project_id, 'Nuevo integrante en ' || coalesce(pname,'un proyecto'),
    coalesce(uname,'Alguien') || ' se unió al proyecto.', '/projects/' || NEW.project_id::text);
  return NEW;
end $$;

drop trigger if exists trg_notify_new_member on public.project_members;
create trigger trg_notify_new_member after insert on public.project_members
  for each row execute function public.notify_new_member();

create or replace function public.notify_new_comment()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare pname text; uname text;
begin
  select name into pname from public.projects where id = NEW.project_id;
  select coalesce(display_name, username) into uname from public.profiles where id = NEW.user_id;
  perform public.notify_everyone(NEW.project_id, 'Nuevo comentario en ' || coalesce(pname,'un proyecto'),
    coalesce(uname,'Alguien') || ': ' || left(NEW.content, 120), '/projects/' || NEW.project_id::text);
  return NEW;
end $$;

drop trigger if exists trg_notify_new_comment on public.project_comments;
create trigger trg_notify_new_comment after insert on public.project_comments
  for each row execute function public.notify_new_comment();

create or replace function public.notify_task_change()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare pname text;
begin
  select name into pname from public.projects where id = NEW.project_id;
  if TG_OP = 'INSERT' then
    perform public.notify_everyone(NEW.project_id, 'Nueva tarea en ' || coalesce(pname,'un proyecto'),
      NEW.title, '/projects/' || NEW.project_id::text);
  elsif NEW.done is distinct from OLD.done then
    perform public.notify_everyone(NEW.project_id,
      (case when NEW.done then 'Tarea completada en ' else 'Tarea reabierta en ' end) || coalesce(pname,'un proyecto'),
      NEW.title, '/projects/' || NEW.project_id::text);
  end if;
  return NEW;
end $$;

drop trigger if exists trg_notify_task_change on public.project_tasks;
create trigger trg_notify_task_change after insert or update on public.project_tasks
  for each row execute function public.notify_task_change();

-- push delivery:每 notification row triggers an edge function call

-- ===== 20260904000523_0da287cf-433a-4865-87e3-33e5e243812c.sql =====

revoke execute on function public.notify_everyone(uuid, text, text, text) from anon, authenticated, public;
revoke execute on function public.notify_project_progress() from anon, authenticated, public;
revoke execute on function public.notify_new_member() from anon, authenticated, public;
revoke execute on function public.notify_new_comment() from anon, authenticated, public;
revoke execute on function public.notify_task_change() from anon, authenticated, public;
-- ===== 20260905000622_ea9cc5a1-1cce-4481-9c73-27bad77ce2b4.sql =====
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS adsense_client_id text,
  ADD COLUMN IF NOT EXISTS adsense_slot_id text,
  ADD COLUMN IF NOT EXISTS adsense_enabled boolean NOT NULL DEFAULT false;
-- ===== 20260905002914_3139dab7-8bed-4322-b56b-f00777f796d2.sql =====
CREATE TABLE public.ad_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  network text not null default 'adsterra',
  code text not null default '',
  placement text not null default 'dashboard',
  position text not null default 'bottom',
  enabled boolean not null default true,
  order_index integer not null default 100,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.ad_units TO anon;
GRANT SELECT ON public.ad_units TO authenticated;
GRANT ALL ON public.ad_units TO service_role;
ALTER TABLE public.ad_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_units readable by everyone" ON public.ad_units FOR SELECT USING (true);
-- ===== 20260906013028_5c4903b5-57ed-4aa2-a606-2d14d95b9687.sql =====
CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dm_pair_idx ON public.direct_messages (sender_id, recipient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY dm_select ON public.direct_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY dm_insert ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY dm_update ON public.direct_messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY dm_delete ON public.direct_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text,
  image_url text,
  url text,
  url_label text,
  color text,
  pinned boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ann_select ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY ann_admin ON public.announcements FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.announcement_reactions (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.announcement_reactions TO authenticated;
GRANT ALL ON public.announcement_reactions TO service_role;
ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY annr_select ON public.announcement_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY annr_insert ON public.announcement_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY annr_delete ON public.announcement_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_new_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT p.id, 'Nuevo aviso: ' || NEW.title, left(coalesce(NEW.body, ''), 140), '/notify'
  FROM public.profiles p;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_new_announcement() FROM anon, authenticated;
CREATE TRIGGER trg_notify_new_announcement AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_announcement();

CREATE OR REPLACE FUNCTION public.notify_direct_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uname text;
BEGIN
  SELECT coalesce(display_name, username) INTO uname FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (NEW.recipient_id, 'Nuevo correo de ' || coalesce(uname, 'un miembro'), left(NEW.body, 140), '/mail');
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_direct_message() FROM anon, authenticated;
CREATE TRIGGER trg_notify_direct_message AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_direct_message();
-- ===== Propietario: elnevulex@gmail.com recibe los roles SOLO con correo verificado =====
CREATE OR REPLACE FUNCTION public.grant_owner_if_verified() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'elnevulex@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'founder'),(NEW.id,'owner'),(NEW.id,'administrator') ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.profiles SET approved = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.grant_owner_if_verified() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS grant_owner_upd ON auth.users;
CREATE TRIGGER grant_owner_upd AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_owner_if_verified();
DROP TRIGGER IF EXISTS zz_grant_owner_ins ON auth.users;
CREATE TRIGGER zz_grant_owner_ins AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_owner_if_verified();

-- ===== Alta de usuario: crea perfil y rol 'member' en el servidor (nunca desde el navegador) =====
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u text; base text;
BEGIN
  base := lower(regexp_replace(coalesce(nullif(NEW.raw_user_meta_data->>'username',''), split_part(NEW.email,'@',1)), '[^a-zA-Z0-9_.-]', '', 'g'));
  IF base = '' OR length(base) < 2 THEN base := 'user'; END IF;
  u := left(base, 36);
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = u) THEN u := left(u, 30) || '_' || substr(md5(random()::text), 1, 4); END IF;
  INSERT INTO public.profiles (id, username, display_name)
    VALUES (NEW.id, u, coalesce(nullif(NEW.raw_user_meta_data->>'display_name',''), u));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== NLabs: video del Dashboard + Room (chat en tiempo real) =====
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS dashboard_video_url text;
CREATE TABLE IF NOT EXISTS public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  reply_to uuid REFERENCES public.room_messages(id) ON DELETE SET NULL,
  edited_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS room_messages_created_idx ON public.room_messages (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_messages TO authenticated;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY room_select ON public.room_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY room_insert ON public.room_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY room_update ON public.room_messages FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY room_delete ON public.room_messages FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE OR REPLACE FUNCTION public.room_rate_limit() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.room_messages WHERE user_id = NEW.user_id AND created_at > now() - interval '10 seconds') >= 5 THEN
    RAISE EXCEPTION 'Demasiados mensajes, espera unos segundos'; END IF;
  RETURN NEW; END $$;
CREATE TRIGGER trg_room_rate BEFORE INSERT ON public.room_messages FOR EACH ROW EXECUTE FUNCTION public.room_rate_limit();
CREATE TABLE IF NOT EXISTS public.room_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.room_messages(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text CHECK (char_length(reason) <= 300), status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (message_id, reporter_id));
GRANT SELECT, INSERT, UPDATE ON public.room_reports TO authenticated;
ALTER TABLE public.room_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY rr_insert ON public.room_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY rr_select ON public.room_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY rr_update ON public.room_reports FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
