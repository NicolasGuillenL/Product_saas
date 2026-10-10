// Web Crypto: funciona igual em Node 18+, Vercel Edge e Cloudflare Workers.
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toB64Url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toB64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))));
}

/** Assina um payload JSON. Evita que alguém use o /go como redirecionador aberto. */
export async function signToken(payload: unknown, secret: string): Promise<string> {
  const body = toB64Url(enc.encode(JSON.stringify(payload)));
  return `${body}.${await hmac(secret, body)}`;
}

export async function verifyToken<T>(token: string, secret: string): Promise<T | null> {
  const [body, sig] = token.split('.');
  if (!body || !sig || (await hmac(secret, body)) !== sig) return null;
  try {
    return JSON.parse(new TextDecoder().decode(fromB64Url(body))) as T;
  } catch {
    return null;
  }
}
