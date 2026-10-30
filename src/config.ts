// Configuración PÚBLICA de NLabs (visible a propósito, sin variables ocultas).
// Estos dos valores son públicos por diseño: la seguridad la dan las políticas RLS de Supabase.
// NUNCA pongas aquí la clave service_role, la clave privada de Firebase/VAPID ni el código de administrador.
// Puedes sobrescribirlos con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en Vercel.
export const SUPABASE_URL = "https://rzdpsdlajhblhyzlzvhi.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DgeuiNfwVNHmowy_AHKS-g_nzBCt_f-";
export const OWNER_EMAIL = "elnevulex@gmail.com";

// Servidor OAuth 2.1 / OIDC de Supabase (públicos). La pantalla de consentimiento de la app es /oauth/consent.
const AUTH_V1 = `${SUPABASE_URL}/auth/v1`;
export const OAUTH_ENDPOINTS = {
  authorization: `${AUTH_V1}/oauth/authorize`,
  token: `${AUTH_V1}/oauth/token`,
  jwks: `${AUTH_V1}/.well-known/jwks.json`,
  discovery: `${AUTH_V1}/.well-known/openid-configuration`,
  consentPath: "/oauth/consent",
} as const;

// Clave PÚBLICA de Web Push (VAPID). La clave privada vive solo en la Edge Function `push-dispatch`.
export const VAPID_PUBLIC_KEY = "BGJYqPLhxivBLb8-R2TAMK44GELQEnN8Wvb3sVH-NcxNgQ__T5RIg7p_W_7pXXyTsa-JxHX2zLjDUfhiR2jY4HU";
