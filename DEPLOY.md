# NLabs · despliegue (Vercel + Supabase propio)

Base: app DUCKDUCKGO (React + Vite, SPA con react-router). Conectada a **nuestro** Supabase `rzdpsdlajhblhyzlzvhi`.
La URL y la clave pública están visibles en `src/config.ts`; no hay variables ocultas ni se usa nada del proyecto anterior.
Nunca pongas en el código: `service_role`, claves privadas ni el código de administrador.

## Ya hecho en Supabase (no repetir)
- Esquema, RLS, buckets y disparadores aplicados (`supabase/setup.sql` es la copia de referencia).
- Edge Functions desplegadas: `admin-actions` (Shell) y `resolve-login` (entrar con usuario).
- Tablas nuevas: `room_messages`, `room_reports` y la columna `site_settings.dashboard_video_url`.
- El código de Shell se valida en el servidor (se guarda solo su huella SHA-256). Para cambiarlo, define el secreto `ADMIN_PANEL_CODE` en Supabase → Edge Functions → Secrets.

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
