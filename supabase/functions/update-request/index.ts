import { corsHeaders, jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'
import { getSessionFromRequest, verifySessionToken } from '../_shared/session.ts'

const ISSUER_STATUSES = new Set(['Under Review', 'Approved', 'Anchored', 'Available', 'Rejected', 'Revoked'])
const STUDENT_STATUSES = new Set<string>() // students cannot update status directly

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const secret = Deno.env.get('SIWE_SESSION_SECRET')
    if (!secret) return jsonResponse({ error: 'SIWE_SESSION_SECRET not configured' }, 500)

    const wallet = await verifySessionToken(getSessionFromRequest(req), secret)
    if (!wallet) return jsonResponse({ error: 'Unauthorized — sign in with your wallet' }, 401)

    const body = await req.json() as {
      request_id: string
      status: string
      tx_hash?: string
      block_number?: number
      document_hash?: string
      ipfs_cid?: string
      issue_date?: string
    }

    if (!body.request_id || !body.status) {
      return jsonResponse({ error: 'request_id and status required' }, 400)
    }

    const db = adminClient()
    const { data: existing, error: fetchErr } = await db
      .from('requests')
      .select('status, student_wallet, source_institution_address')
      .eq('request_id', body.request_id)
      .maybeSingle()

    if (fetchErr || !existing) {
      return jsonResponse({ error: 'Request not found' }, 404)
    }

    const sourceAddr = (existing.source_institution_address as string | null)?.toLowerCase()
    const studentAddr = (existing.student_wallet as string | null)?.toLowerCase()

    const isIssuerAction = ISSUER_STATUSES.has(body.status)
    const isStudent = studentAddr === wallet

    if (isIssuerAction) {
      if (!sourceAddr || sourceAddr !== wallet) {
        return jsonResponse({ error: 'Only the issuing institution wallet can update this request' }, 403)
      }
    } else if (STUDENT_STATUSES.has(body.status)) {
      if (!isStudent) return jsonResponse({ error: 'Forbidden' }, 403)
    } else {
      return jsonResponse({ error: `Status transition to "${body.status}" not allowed` }, 400)
    }

    // Prevent re-processing terminal states
    const terminal = new Set(['Anchored', 'Rejected', 'Revoked', 'Verified'])
    if (terminal.has(existing.status as string) && body.status !== 'Revoked') {
      if (existing.status === 'Anchored' && body.status === 'Revoked') {
        // allow revoke after anchor
      } else if (existing.status !== body.status) {
        return jsonResponse({ error: `Request is already ${existing.status}` }, 409)
      }
    }

    const historyEntry = { stage: body.status, timestamp: new Date().toISOString() }
    const { error } = await db.rpc('append_request_history', {
      p_request_id: body.request_id,
      p_status: body.status,
      p_history_entry: historyEntry,
      p_tx_hash: body.tx_hash ?? null,
      p_block_number: body.block_number ?? null,
      p_document_hash: body.document_hash ?? null,
      p_ipfs_cid: body.ipfs_cid ?? null,
      p_issue_date: body.issue_date ?? null,
    })

    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ ok: true })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
  }
})
