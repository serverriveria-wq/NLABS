# NLabs · despliegue (Vercel + Supabase propio)

Base: app DUCKDUCKGO (React + Vite, SPA con react-router). Conectada a **nuestro** Supabase `rzdpsdlajhblhyzlzvhi`.
La URL y la clave pública están visibles en `src/config.ts`; no hay variables ocultas ni se usa nada del proyecto anterior.
Nunca pongas en el código: `service_role`, claves privadas ni el código de administrador.

## Ya hecho en Supabase (no repetir)
- Esquema, RLS, buckets y disparadores aplicados (`supabase/setup.sql` es la copia de referencia).
- Edge Functions desplegadas: `admin-actions` (Shell) y `resolve-login` (entrar con usuario).
- Tablas nuevas: `room_messages`, `room_reports` y la columna `site_settings.dashboard_video_url`.
- El código de Shell se valida en el servidor (se guarda solo su huella SHA-256). Para cambiarlo, define el secreto `ADMIN_PANEL_CODE` en Supabase → Edge Functions → Secrets.

## Actualización 1.2
- **Shell = Labs**: una sola sección en `/shell` (`/admin` y `/labs` redirigen).
- **Reactivar BD**: botón verde en Shell. Hace una consulta real (Edge Function `keepalive`). Además `vercel.json` programa un cron diario (`/api/keepalive`) para que Supabase no pause el proyecto.
- **Editor avanzado de Collab/Level**: `/studio` y `/projects/:id/studio` (partes con arrastrar y soltar, equipo, recursos, vista previa, publicar).
- **Notificaciones**: preferencias por categoría (página Noticias), pantalla de permiso, Service Worker `public/sw.js` y push real con Web Push (Edge Function `push-dispatch` + disparador en la base de datos). La clave VAPID privada y el secreto de envío están en la función; puedes sustituirlos definiendo los secretos `VAPID_PRIVATE_KEY` y `PUSH_DISPATCH_SECRET` (y la clave pública en `src/config.ts`).
- **GIF de fondo** del inicio de sesión: copia tu GIF como `public/assets/auth-bg.gif` (sin ese archivo se ve un degradado).
- Nota: `supabase/setup.sql` es una copia de referencia del esquema inicial; los cambios 1.2 se aplicaron como migraciones directamente en Supabase.

## Actualización 1.3
- **Arte** (`/studio/arte`) y **Música** (`/studio/musica`): galería con visor y biblioteca con reproductor, desde la pantalla Crear.
- Notificaciones nuevas: arte, música, menciones `@usuario` en Room, solicitudes de unión y de ingreso al team (con preferencias por categoría).
- Contexto completo del proyecto en `README.md`.

## Pasos que faltan (manuales)
1. **Vercel**: importa la carpeta/repositorio. Framework: Vite. Build: `npm run build`. Salida: `dist`. (`vercel.json` ya reescribe las rutas a `index.html`.)
2. **Supabase → Authentication → URL Configuration**: Site URL y Redirect URLs = la URL de Vercel (y `/auth/recovery`). Sin esto, no funcionan los correos de confirmación.
3. **Propietario**: regístrate con `elnevulex@gmail.com` y confirma el correo: recibe founder/owner/administrator automáticamente y se activa Shell.
4. **Push** (opcional): requiere tu propio proyecto de Firebase. Rellena las variables `VITE_FIREBASE_*` de `.env.example`. `supabase/functions/send-push` depende del gateway de Lovable y NO funciona aquí; hasta entonces la app muestra «push pendiente de configuración».

## Secciones
Dashboard · Proyectos · Perfil · Crear · Miembros · Noticias · Links · Shell · Room (+ Entrar, Correo, Trofeos, More).

## OAuth 2.1 / OIDC de Supabase (pantalla `/oauth/consent`)
En Supabase → Authentication → OAuth Server: actívalo y en *Authorization Path* pon `/oauth/consent`.
Endpoints (públicos): authorize `…/auth/v1/oauth/authorize` · token `…/auth/v1/oauth/token` · JWKS `…/auth/v1/.well-known/jwks.json` · discovery `…/auth/v1/.well-known/openid-configuration`.
Registra cada aplicación a mano en Authentication → OAuth Apps. **Allow Dynamic OAuth Apps: déjalo desactivado** salvo que necesites que apps externas se registren solas.

---

## Actualización v2 (pasos obligatorios)

1. **Supabase → SQL Editor**: pega y ejecuta `supabase/migration_v2.sql` (una sola vez; es idempotente).
   Arregla `permission denied for table site_settings`, activa Noticias y crea stickers, GitHub, herramientas y «Eliminar cuenta».
2. **Redespliega la Edge Function `admin-actions`** (cambió: stickers, nuevos ajustes y duración del código Shell de 12 h).
   - Secreto obligatorio en Edge Functions → Secrets: `ADMIN_PANEL_CODE` (el código de Shell). `ADMIN_GATE_SIGNING_KEY` es opcional: si no existe se usa la service key del proyecto.
3. Sube el código a GitHub; Vercel despliega solo.
4. En Shell → Branding puedes poner el fondo de la vista previa de GD y el icono de GitHub; en Shell → Stickers subes los stickers del Room.

## Actualización v4
1. **Supabase → SQL Editor**: ejecuta el contenido de `supabase/migration_v4.sql` (añade `section_icons`).
2. Redespliega la función `admin-actions` (acepta `section_icons`).
3. Sube a GitHub; Vercel publica también `api/gdlevel.js` (puente a GDHistory para la vista previa de niveles).
4. Shell → Branding → «Iconos de secciones»: sube un icono para General, Geometry Dash, Partes, Participantes, etc.

## Actualización v5
1. **Supabase → SQL Editor**: ejecuta el CONTENIDO de `supabase/migration_v5.sql` (buckets de Arte/Música, página pública, botones de Crear).
2. Redespliega `admin-actions` (acepta `create_buttons`).
3. Sube a GitHub. Proyectos públicos: `https://TU-DOMINIO/public/<slug o id>`.

## Actualización v6
1. Ejecuta el CONTENIDO de `supabase/migration_v6.sql` en SQL Editor (columna `gd_theme`).
2. Redespliega `admin-actions`.
3. Shell → Branding → «Estilo del editor GD»: sube la fuente y los marcos de tu juego.

## Actualización v8
Editor avanzado con diseño normal y bordes degradados animados (claro: azul→violeta→rojo, oscuro: violeta→azul, dorado: oro→ámbar→cobre).
Shell → Branding → «Fuente del editor avanzado (.ttf)». Redespliega `admin-actions`. Sin SQL nuevo.

## Actualización v9
Arte y Música: formularios como páginas propias (`/studio/arte/nuevo`, `/studio/arte/:id/editar`, `/studio/musica/nuevo`, `/studio/musica/:id/editar`) con borde degradado animado.
«Botones de Crear» ahora comprueba que el servidor guardó icono/fondo y avisa si hay que redesplegar `admin-actions`.

## v10 · Correos de confirmación
- Si no llegan los correos: Supabase → Authentication → SMTP Settings (SMTP propio; el de Supabase solo envía a miembros del equipo y con límite muy bajo).
- Usuarios atascados: `UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'correo@ejemplo.com' AND email_confirmed_at IS NULL;`
- La pantalla de acceso ahora avisa «correo sin confirmar» y permite reenviar el correo.

## v11 · Inicio de sesión con Google
1. Google Cloud Console → Credenciales → ID de cliente OAuth (Aplicación web). URI de redireccionamiento autorizado: `https://<TU-REF>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Sign In / Providers → Google: activar y pegar Client ID y Client Secret.
3. Supabase → Authentication → URL Configuration: Site URL `https://nlabgd.vercel.app` y en Redirect URLs `https://nlabgd.vercel.app/**`.
4. Ejecutar el CONTENIDO de `supabase/migration_v11.sql`.
