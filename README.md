# NLabs · [NLX]

Plataforma privada del team **[NLX]** de Geometry Dash: proyectos y collabs, arte, música, chat, noticias, notificaciones y un panel de administración (**Shell**).
Administrador principal: **nevulex** · propietario: `elnevulex@gmail.com`.

> Este README es el contexto completo del proyecto (qué hay, cómo está montado, qué falta). Guía corta de despliegue: `DEPLOY.md`.

## 1. Stack
- **Frontend:** React 19 + Vite + TypeScript + Tailwind v4, SPA con `react-router-dom` (sin TanStack Start/Router; solo se usa `@tanstack/react-query` para cargar datos).
- **Backend:** Supabase (Auth, Postgres con RLS, Storage, Realtime, Edge Functions). Proyecto: `rzdpsdlajhblhyzlzvhi` (región us-west-1).
- **Hosting:** Vercel (build `npm run build`, salida `dist`, `vercel.json` con rewrites SPA y un cron diario).
- La app nació de la base **DUCKDUCKGO** (app “NLab”), adaptada a nuestro Supabase. No se usa nada de su base de datos ni de sus variables.

## 2. Configuración visible (sin variables ocultas)
`src/config.ts` contiene la URL de Supabase, la clave **publishable** (pública por diseño), el correo del propietario, los endpoints OAuth y la clave **pública** VAPID. `.env.example` lista overrides opcionales (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
**Nunca** va en el código del navegador: `service_role`, clave privada VAPID, código de Shell.

## 3. Secciones y rutas
| Sección | Ruta | Notas |
|---|---|---|
| Dashboard | `/dashboard` | saludo, estadísticas, video en bucle administrable desde Shell |
| Proyectos | `/projects`, `/projects/:id` | biblioteca, detalle, comentarios, miembros, tareas, galería |
| Perfil | `/account` | datos, avatar, banner, redes |
| Crear | `/createcolab` | hub: editor avanzado, formulario rápido, editar, **Arte**, **Música** |
| Editor avanzado Collab/Level | `/studio`, `/projects/:id/studio` | pestañas General · Geometry Dash · Partes · Equipo y reglas · Recursos · Vista previa |
| Arte | `/studio/arte` | galería con visor, categorías, etiquetas, créditos, visibilidad |
| Música | `/studio/musica` | biblioteca con reproductor (progreso/volumen), BPM, licencia, enlaces externos |
| Miembros / Entrar | `/members`, `/request` | directorio y solicitud de ingreso al team |
| Noticias | `/notify` | avisos oficiales + **preferencias de notificaciones** |
| Links | `/linked` | enlaces oficiales |
| Shell | `/shell` (`/admin` y `/labs` redirigen) | “Labs” y “Shell” son lo mismo. Para no administradores: «Shell está en construcción…» |
| Room | `/room` | chat en tiempo real (respuestas, edición, borrado, reportes, menciones `@usuario`) |
| Correo, Trofeos, Docs, More | `/mail`, `/trophies`, `/docs`, `/more` | heredados de la base |
| OAuth | `/oauth/consent` | pantalla de consentimiento del servidor OAuth 2.1 de Supabase |
| Auth | `/auth`, `/auth/recovery` | inicio de sesión/registro con fondo GIF (ver §9) |

## 4. Identidad visual
Logos del usuario en `public/assets/` (`logo-purple.png`, `logo-blue.png`); favicon = tubo de ensayo (`public/favicon.png`). Pantalla de carga: rombo morado ↔ azul en bucle infinito (en `index.html` y `BrandLoader`). `manifest.webmanifest` permite instalar la app (necesario para push en iPhone).

## 5. Base de datos (Supabase)
Todas las tablas tienen **RLS**. Grupos:
- **Usuarios y roles:** `profiles`, `user_roles` (founder/owner/administrator/moderator/project_manager/host/member/guest), `modalities`, `user_modalities`, `user_socials`, `social_types`, `team_requests`.
- **Proyectos:** `projects` (+ columnas del editor: bpm, level_id, song_id, palette, slots, reglas, `is_draft`…), `project_members`, `project_parts`, `project_part_notes` (notas privadas), `project_comments`(+attachments), `project_tasks`, `project_files`, `project_gallery`, `project_links`, `link_types`, `project_dependencies`, `dependency_types`, `project_chat_messages`, `project_activity`, `project_favorites`, `project_join_requests`, `project_views`, `project_progress_history`, `difficulty_levels`.
- **Contenido:** `artworks`, `music_tracks`, `room_messages`, `room_reports`, `announcements`(+reacciones), `direct_messages`.
- **Sitio:** `site_settings` (logo, favicon, `dashboard_video_url`, AdSense), `text_overrides`, `text_icons`, `site_links`, `site_docs`, `site_versions`, `site_credits`, `site_honors`, `site_dedications`, `site_trophies`, `auth_page_settings`, `ad_units`.
- **Notificaciones:** `notifications` (con `category`), `notification_preferences`, `push_subscriptions`, `push_tokens` (heredada).
- **Seguridad clave:** nadie se asigna roles desde el cliente; `user_roles` solo se escribe desde la Edge Function `admin-actions` (service_role). El rol de propietario/founder/administrator lo recibe **solo** `elnevulex@gmail.com` cuando su correo está **confirmado** (disparador en `auth.users`). Alta de usuario: el disparador `handle_new_user` crea perfil + rol `member`.
- **Storage (todos privados, URLs firmadas):** `branding`, `modality-icons`, `project-media`, `gd-shares`, `art`, `music`. En `art`/`music` solo se escribe en la carpeta propia (`<uid>/…`).
- `supabase/setup.sql` es una copia de referencia del esquema inicial; los cambios 1.2 y posteriores se aplicaron como migraciones en Supabase (la base viva es la fuente de verdad).

## 6. Edge Functions desplegadas
| Función | Para qué |
|---|---|
| `admin-actions` | Operaciones de Shell. Exige sesión + rol admin + **código de Shell** validado en el servidor (se guarda solo su huella SHA-256; token firmado de 1 h; 5 intentos/15 min por instancia). Se puede cambiar el código definiendo el secreto `ADMIN_PANEL_CODE`. |
| `resolve-login` | Entrar con nombre de usuario sin revelar correos. |
| `keepalive` | Consulta real a la BD (botón verde **Reactivar BD** y cron diario de Vercel). |
| `push-dispatch` | Envía Web Push (VAPID) cuando se inserta una notificación (lo llama un disparador con `pg_net` y un secreto compartido). |
(`admin-unlock`, de una fase anterior, queda desplegada pero sin uso.)

## 7. Notificaciones
- **Categorías:** proyectos, comentarios, tareas/partes, integrantes, avisos (noticias), correo, arte, música, menciones en Room, push.
- **Eventos:** proyecto nuevo publicado, progreso/estado/fecha cambiados, comentario nuevo, tarea nueva/completada, parte asignada, integrante nuevo, solicitud de unión recibida/aceptada/rechazada, solicitud de ingreso al team aceptada/rechazada, aviso nuevo, correo nuevo, arte/música nuevos, mención `@usuario` en Room.
- **Preferencias:** cada usuario las ajusta en *Noticias*; el servidor las respeta (`pref_allows`). Quien dispara el evento no se notifica a sí mismo.
- **Dentro de la web:** Realtime sobre `notifications`.
- **Push (pestaña cerrada):** `PushGate` explica el motivo y pide el permiso con un clic (se lee el estado real del navegador) → `public/sw.js` + suscripción en `push_subscriptions` → disparador `dispatch_push` → `push-dispatch`. En iPhone hay que instalar la app en la pantalla de inicio.
- **Importante:** la clave VAPID privada y el secreto de envío están embebidos en el código de `push-dispatch` (solo servidor) porque no pude crear secretos desde aquí. Recomendado: definir en Supabase → Edge Functions → Secrets `VAPID_PRIVATE_KEY` y `PUSH_DISPATCH_SECRET` (y actualizar `dispatch_push`) y rotarlas.

## 8. Despliegue
1. Subir el contenido de la carpeta (no el zip) a GitHub e importarlo en Vercel (Vite, `npm run build`, `dist`) — o `npx vercel --prod`. Detalle en `DEPLOY.md`.
2. Supabase → Authentication → URL Configuration: *Site URL* y *Redirect URLs* = URL de Vercel. Si usas OAuth: OAuth Server activo con *Authorization Path* `/oauth/consent`; **Allow Dynamic OAuth Apps desactivado**; apps registradas a mano.
3. Registrarse con `elnevulex@gmail.com` y confirmar el correo → se activa Shell (código `iamnevulex`).
4. Recomendado en Supabase: activar *Leaked password protection*.

## 9. Pendiente / limitaciones conocidas
- **GIF de fondo del inicio de sesión:** falta el archivo. Copiar el GIF a `public/assets/auth-bg.gif` (sin él se ve un degradado).
- **Nunca se ha ejecutado `npm run build`** ni se ha probado la app en un navegador real (solo revisión de sintaxis con TypeScript y de seguridad con los avisos de Supabase). Es probable que el primer build en Vercel muestre algún error menor.
- No probado de extremo a extremo: push real, función `keepalive`, flujo OAuth.
- **Reactivar BD** evita la pausa por inactividad; no puede despertar un proyecto que ya esté pausado (hay que restaurarlo en el panel de Supabase).
- El detalle de proyecto (`/projects/:id`) todavía no muestra la línea de tiempo de partes; se ve en el editor avanzado y su vista previa.
- Firebase/FCM de la base original ya no se usa (push = Web Push propio). `firebase-messaging-sw.js` y la dependencia `firebase` quedaron sin uso.
- Vercel: la conexión de Claude con Vercel devolvía 403 al crear despliegues; la publicación hay que hacerla desde GitHub/CLI.

## 10. Historial resumido
1. Fase 1 (descartada): app estática propia con Supabase (HTML/JS). Sustituida por la base DUCKDUCKGO.
2. Supabase **NLabs** creado (us-west-1, $0). Proyectos viejos sin tocar: `nerva 22` y `Duckduckgo` (pausados; `nerva 22` hay que borrarlo a mano si se desea).
3. Base DUCKDUCKGO adaptada: config visible, logos y favicon propios, Shell=Labs, Room, video del Dashboard, moderación de Room, OAuth consent.
4. Actualización 1.2: botón Reactivar BD, editor avanzado de Collab/Level, notificaciones con preferencias y push real, GIF de fondo (pendiente el archivo).
5. Actualización 1.3: **Arte** y **Música** completos, notificaciones nuevas (arte, música, menciones, solicitudes) y este README.
