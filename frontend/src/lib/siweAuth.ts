import { createSiweMessage } from 'viem/siwe'
import { useAccount, useChainId, useSignMessage } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './supabase'
import {
  clearStoredSession,
  getStoredSession,
  isSessionValidForAddress,
  storeSession,
  type SiweSession,
} from './siweSession'

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true'

function functionsBase(): string {
  return `${supabaseUrl}/functions/v1`
}

async function edgeFetch<T>(
  fn: string,
  init: RequestInit & { session?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    ...(init.headers as Record<string, string>),
  }
  if (init.session) headers['x-session-token'] = init.session

  const res = await fetch(`${functionsBase()}/${fn}`, {
    ...init,
    headers,
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (body as { error?: string }).error ?? `Edge function ${fn} failed (${res.status})`
    throw new Error(msg)
  }
  return body as T
}

export function useSiweAuth() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { signMessageAsync } = useSignMessage()
  const [session, setSession] = useState<SiweSession | null>(() => getStoredSession())
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isConnected || !address) {
      clearStoredSession()
      setSession(null)
      return
    }
    if (!isSessionValidForAddress(address)) {
      clearStoredSession()
      setSession(null)
    } else {
      setSession(getStoredSession())
    }
  }, [isConnected, address])

  const signIn = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase not configured')
      return false
    }
    if (!address || !isConnected) {
      setError('Connect your wallet first')
      return false
    }

    setIsSigningIn(true)
    setError(null)

    try {
      const { nonce } = await edgeFetch<{ nonce: string }>('siwe-nonce', {
        method: 'POST',
        body: JSON.stringify({ address }),
      })

      const message = createSiweMessage({
        address,
        chainId,
        domain: window.location.host,
        nonce,
        uri: window.location.origin,
        version: '1',
        statement: 'Sign in to TransCrypt to submit and manage transcript requests.',
      })

      const signature = await signMessageAsync({ message })

      const result = await edgeFetch<{ token: string; address: string; expiresIn: number }>(
        'siwe-verify',
        {
          method: 'POST',
          body: JSON.stringify({ message, signature }),
        },
      )

      storeSession(result.token, result.address, result.expiresIn)
      const stored = getStoredSession()
      setSession(stored)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed'
      setError(msg)
      return false
    } finally {
      setIsSigningIn(false)
    }
  }, [address, isConnected, chainId, signMessageAsync])

  const signOut = useCallback(() => {
    clearStoredSession()
    setSession(null)
  }, [])

  const isAuthenticated =
    AUTH_BYPASS || (!!session && isConnected && isSessionValidForAddress(address))

  return {
    session,
    isAuthenticated,
    isSigningIn,
    error,
    signIn,
    signOut,
    authBypass: AUTH_BYPASS,
    requiresAuth: isSupabaseConfigured && !AUTH_BYPASS,
  }
}

export { edgeFetch, AUTH_BYPASS }
