import { recoverMessageAddress } from 'npm:viem@2.52.2'
import { parseSiweMessage, validateSiweMessage } from 'npm:viem@2.52.2/siwe'
import { corsHeaders, jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'
import { createSessionToken } from '../_shared/session.ts'
import { getSiweHealth } from './health.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const body = await req.json() as {
      health?: boolean
      expectedDomain?: string
      message?: string
      signature?: `0x${string}`
    }
    const secret = Deno.env.get('SIWE_SESSION_SECRET')
    const domain = Deno.env.get('SIWE_DOMAIN')

    if (body.health === true) {
      return jsonResponse(getSiweHealth(secret, domain, body.expectedDomain))
    }

    const { message, signature } = body

    if (!message || !signature) {
      return jsonResponse({ error: 'message and signature required' }, 400)
    }

    if (!secret) return jsonResponse({ error: 'SIWE_SESSION_SECRET not configured' }, 500)

    const parsed = parseSiweMessage(message)
    const recoveredAddress = await recoverMessageAddress({ message, signature })
    const valid = validateSiweMessage({
      message: parsed,
      address: recoveredAddress,
      ...(domain ? { domain } : {}),
    })

    if (!valid) return jsonResponse({ error: 'Invalid SIWE signature' }, 401)

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
