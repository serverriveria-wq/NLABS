const encoder = new TextEncoder();
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const fromBase64 = (text: string) => Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));

async function key(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export function matchesAdminCode(given: unknown, expected: string): boolean {
  return typeof given === 'string' && given.trim().toLowerCase() === expected.trim().toLowerCase();
}

export async function issueGateToken(userId: string, secret: string, now = Date.now()): Promise<string> {
  const payload = toBase64(encoder.encode(JSON.stringify({ sub: userId, expires: now + 12 * 60 * 60 * 1000 })));
  const signature = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload));
  return `${payload}.${toBase64(new Uint8Array(signature))}`;
}

export async function verifyGateToken(token: string, userId: string, secret: string, now = Date.now()): Promise<boolean> {
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return false;
    if (!(await crypto.subtle.verify('HMAC', await key(secret), fromBase64(signature), encoder.encode(payload)))) return false;
    const claims = JSON.parse(new TextDecoder().decode(fromBase64(payload)));
    return claims.sub === userId && typeof claims.expires === 'number' && claims.expires > now;
  } catch { return false; }
}