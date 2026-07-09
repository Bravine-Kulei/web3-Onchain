import { verifySiweMessage, parseSiweMessage } from 'npm:viem@2.52.2'
import { corsHeaders, jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'
import { createSessionToken } from '../_shared/session.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const { message, signature } = await req.json() as {
      message?: string
      signature?: `0x${string}`
    }

    if (!message || !signature) {
      return jsonResponse({ error: 'message and signature required' }, 400)
    }

    const secret = Deno.env.get('SIWE_SESSION_SECRET')
    if (!secret) return jsonResponse({ error: 'SIWE_SESSION_SECRET not configured' }, 500)

    const domain = Deno.env.get('SIWE_DOMAIN')
    const valid = await verifySiweMessage({
      message,
      signature,
      ...(domain ? { domain } : {}),
    })

    if (!valid) return jsonResponse({ error: 'Invalid SIWE signature' }, 401)

    const parsed = parseSiweMessage(message)
    const address = parsed.address.toLowerCase()
    const nonce = parsed.nonce

    const db = adminClient()
    const { data: nonceRow, error: nonceErr } = await db
      .from('siwe_nonces')
      .select('nonce, expires_at')
      .eq('address', address)
      .eq('nonce', nonce)
      .maybeSingle()

    if (nonceErr || !nonceRow) {
      return jsonResponse({ error: 'Nonce not found or already used' }, 401)
    }

    if (new Date(nonceRow.expires_at).getTime() < Date.now()) {
      await db.from('siwe_nonces').delete().eq('nonce', nonce)
      return jsonResponse({ error: 'Nonce expired' }, 401)
    }

    // One-time nonce
    await db.from('siwe_nonces').delete().eq('nonce', nonce)

    const token = await createSessionToken(address, secret)
    return jsonResponse({ token, address, expiresIn: 86400 })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Verification failed' }, 500)
  }
})
