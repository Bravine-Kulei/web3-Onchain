import { corsHeaders, jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'
import { getSessionFromRequest, verifySessionToken } from '../_shared/session.ts'

const VALID_RESULTS = new Set(['VERIFIED', 'TAMPERED', 'REVOKED', 'NOT_FOUND', 'CHAIN_ERROR'])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const secret = Deno.env.get('SIWE_SESSION_SECRET')
    if (!secret) return jsonResponse({ error: 'SIWE_SESSION_SECRET not configured' }, 500)

    const wallet = await verifySessionToken(getSessionFromRequest(req), secret)
    if (!wallet) return jsonResponse({ error: 'Unauthorized — sign in with your wallet' }, 401)

    const body = await req.json() as {
      request_id?: string
      transcript_input?: string
      student_name?: string
      source_institution?: string
      result: string
      doc_hash?: string
      tx_hash?: string
    }

    if (!body.result || !VALID_RESULTS.has(body.result)) {
      return jsonResponse({ error: 'Valid result required' }, 400)
    }

    const db = adminClient()
    const { error } = await db.from('verifications').insert({
      request_id: body.request_id ?? null,
      transcript_input: body.transcript_input ?? null,
      verifier_wallet: wallet,
      student_name: body.student_name ?? null,
      source_institution: body.source_institution ?? null,
      result: body.result,
      doc_hash: body.doc_hash ?? null,
      tx_hash: body.tx_hash ?? null,
    })

    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ ok: true })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
  }
})
