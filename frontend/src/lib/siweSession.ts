const SESSION_KEY = 'transcrypt_session'
const SESSION_ADDRESS_KEY = 'transcrypt_session_address'

export interface SiweSession {
  token: string
  address: string
  expiresAt: number
}

export function getStoredSession(): SiweSession | null {
  try {
    const token = localStorage.getItem(SESSION_KEY)
    const address = localStorage.getItem(SESSION_ADDRESS_KEY)
    const expiresAt = Number(localStorage.getItem(`${SESSION_KEY}_exp`) || 0)
    if (!token || !address || expiresAt < Date.now()) {
      clearStoredSession()
      return null
    }
    return { token, address: address.toLowerCase(), expiresAt }
  } catch {
    return null
  }
}

export function storeSession(token: string, address: string, expiresInSec = 86400): void {
  const expiresAt = Date.now() + expiresInSec * 1000
  localStorage.setItem(SESSION_KEY, token)
  localStorage.setItem(SESSION_ADDRESS_KEY, address.toLowerCase())
  localStorage.setItem(`${SESSION_KEY}_exp`, String(expiresAt))
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(SESSION_ADDRESS_KEY)
  localStorage.removeItem(`${SESSION_KEY}_exp`)
}

export function getSessionToken(): string | null {
  return getStoredSession()?.token ?? null
}

export function isSessionValidForAddress(address: string | undefined): boolean {
  if (!address) return false
  const session = getStoredSession()
  return !!session && session.address === address.toLowerCase()
}
