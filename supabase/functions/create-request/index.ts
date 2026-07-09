import { corsHeaders, jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'
import { getSessionFromRequest, verifySessionToken } from '../_shared/session.ts'

const VALID_STATUSES = ['Pending'] as const

function generateRequestId(): string {
  const time = Date.now().toString(36).toUpperCase().slice(-4)
  const rand = Math.floor(Math.random() * 36 ** 3).toString(36).toUpperCase().padStart(3, '0')
  return `REQ-${time}${rand}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const secret = Deno.env.get('SIWE_SESSION_SECRET')
    if (!secret) return jsonResponse({ error: 'SIWE_SESSION_SECRET not configured' }, 500)

    const wallet = await verifySessionToken(getSessionFromRequest(req), secret)
    if (!wallet) return jsonResponse({ error: 'Unauthorized — sign in with your wallet' }, 401)

    const body = await req.json() as Record<string, unknown>
    const studentWallet = (body.student_wallet as string | undefined)?.toLowerCase()

    if (!studentWallet || studentWallet !== wallet) {
      return jsonResponse({ error: 'student_wallet must match your signed-in wallet' }, 403)
    }

    if (body.status && body.status !== 'Pending') {
      return jsonResponse({ error: 'New requests must start as Pending' }, 400)
    }

    const db = adminClient()
    let requestId = (body.request_id as string) || generateRequestId()

    for (let i = 0; i < 5; i++) {
      const row = {
        request_id: requestId,
        student_wallet: studentWallet,
        student_name: body.student_name,
        student_id: body.student_id,
        program: body.program,
        source_institution: body.source_institution,
        source_institution_address: body.source_institution_address ?? null,
        dest_institution: body.dest_institution,
        dest_institution_address: body.dest_institution_address ?? null,
        status: 'Pending',
        submitted_at: body.submitted_at ?? new Date().toISOString(),
        history: body.history ?? [{ stage: 'Requested', timestamp: new Date().toISOString() }],
      }

      const { data, error } = await db.from('requests').insert(row).select().single()
      if (!error) return jsonResponse({ data })

      if (error.code === '23505') {
        requestId = generateRequestId()
        continue
      }
      return jsonResponse({ error: error.message }, 500)
    }

    return jsonResponse({ error: 'Could not generate unique request_id' }, 500)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
  }
})
