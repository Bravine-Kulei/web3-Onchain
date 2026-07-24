import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'
import { getSessionFromRequest, verifySessionToken } from '../_shared/session.ts'
import { verificationHistoryQuery } from './query.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const secret = Deno.env.get('SIWE_SESSION_SECRET')
    if (!secret) return jsonResponse({ error: 'SIWE_SESSION_SECRET not configured' }, 500)
    const wallet = await verifySessionToken(getSessionFromRequest(req), secret)
    if (!wallet) return jsonResponse({ error: 'Unauthorized — sign in with your wallet' }, 401)
    const query = verificationHistoryQuery(wallet)

    const { data, error } = await adminClient()
      .from('verifications')
      .select(query.columns)
      .eq('verifier_wallet', query.verifierWallet)
      .order('created_at', { ascending: false })
    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ verifications: data ?? [] })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
  }
})
