import { corsHeaders, jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'
import { getSessionFromRequest, verifySessionToken } from '../_shared/session.ts'
import { validateVerificationInput, verificationUpsert, type VerificationInput } from './audit.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const secret = Deno.env.get('SIWE_SESSION_SECRET')
    if (!secret) return jsonResponse({ error: 'SIWE_SESSION_SECRET not configured' }, 500)

    const wallet = await verifySessionToken(getSessionFromRequest(req), secret)
    if (!wallet) return jsonResponse({ error: 'Unauthorized — sign in with your wallet' }, 401)

    const body = await req.json() as VerificationInput
    const validationError = validateVerificationInput(body)
    if (validationError) return jsonResponse({ error: validationError }, 400)

    const db = adminClient()
    const upsert = verificationUpsert(body, wallet)
    const { error } = await db.from('verifications').upsert(upsert.row, upsert.options)

    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ ok: true, attempt_id: body.attempt_id })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
  }
})
