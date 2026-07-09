const encoder = new TextEncoder()

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

export async function createSessionToken(
  address: string,
  secret: string,
  ttlMs = 24 * 60 * 60 * 1000,
): Promise<string> {
  const payload = { address: address.toLowerCase(), exp: Date.now() + ttlMs }
  const data = btoa(JSON.stringify(payload))
  const sig = await hmacSign(data, secret)
  return `${data}.${sig}`
}

export async function verifySessionToken(
  token: string | null,
  secret: string,
): Promise<string | null> {
  if (!token) return null
  const [data, sig] = token.split('.')
  if (!data || !sig) return null

  const expected = await hmacSign(data, secret)
  if (sig !== expected) return null

  try {
    const payload = JSON.parse(atob(data)) as { address: string; exp: number }
    if (!payload.address || payload.exp < Date.now()) return null
    return payload.address.toLowerCase()
  } catch {
    return null
  }
}

export function getSessionFromRequest(req: Request): string | null {
  return req.headers.get('x-session-token')
}
