import { corsHeaders, jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'

function randomNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const { address } = await req.json() as { address?: string }
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return jsonResponse({ error: 'Valid Ethereum address required' }, 400)
    }

    const nonce = randomNonce()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const db = adminClient()

    // One active nonce per address — replace previous
    await db.from('siwe_nonces').delete().eq('address', address.toLowerCase())
    const { error } = await db.from('siwe_nonces').insert({
      address: address.toLowerCase(),
      nonce,
      expires_at: expiresAt,
    })

    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ nonce })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
  }
})
