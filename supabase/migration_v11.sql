-- NLabs v11: el perfil se crea con el nombre y la foto de Google (ejecútalo UNA vez; es idempotente)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u text; base text; shown text;
BEGIN
  base := lower(regexp_replace(coalesce(nullif(NEW.raw_user_meta_data->>'username',''), split_part(NEW.email,'@',1)), '[^a-zA-Z0-9_.-]', '', 'g'));
  IF base = '' OR length(base) < 2 THEN base := 'user'; END IF;
  u := left(base, 36);
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = u) THEN u := left(u, 30) || '_' || substr(md5(random()::text), 1, 4); END IF;
  shown := coalesce(nullif(NEW.raw_user_meta_data->>'display_name',''), nullif(NEW.raw_user_meta_data->>'full_name',''), nullif(NEW.raw_user_meta_data->>'name',''), u);
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (NEW.id, u, left(shown, 60), nullif(coalesce(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'), ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
