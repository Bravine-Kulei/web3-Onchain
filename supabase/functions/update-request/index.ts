import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'
import { getSessionFromRequest, verifySessionToken } from '../_shared/session.ts'
import { canTransition, isSameState } from '../_shared/request-status.ts'
import {
  type RequestUpdatePayload,
  updatedRowFromRpc,
  validateAnchorRequirements,
  validateUpdatePayload,
} from '../_shared/request-update.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const secret = Deno.env.get('SIWE_SESSION_SECRET')
    if (!secret) return jsonResponse({ error: 'SIWE_SESSION_SECRET not configured' }, 500)

    const wallet = await verifySessionToken(getSessionFromRequest(req), secret)
    if (!wallet) return jsonResponse({ error: 'Unauthorized — sign in with your wallet' }, 401)

    const rawBody: unknown = await req.json()
    const validationError = validateUpdatePayload(rawBody)
    if (validationError) return jsonResponse({ error: validationError }, 400)
    const body = rawBody as RequestUpdatePayload

    const db = adminClient()
    const { data: existing, error: fetchErr } = await db
      .from('requests')
      .select('request_id, status, updated_at, source_institution_address')
      .eq('request_id', body.request_id)
      .maybeSingle()

    if (fetchErr || !existing) {
      return jsonResponse({ error: 'Request not found' }, 404)
    }

    const sourceAddr = (existing.source_institution_address as string | null)?.toLowerCase()
    if (!sourceAddr || sourceAddr !== wallet) {
      return jsonResponse({ error: 'Only the issuing institution wallet can update this request' }, 403)
    }

    const currentStatus = existing.status as string
    if (!canTransition(currentStatus, body.status)) {
      return jsonResponse({ error: `Invalid status transition from "${currentStatus}" to "${body.status}"` }, 409)
    }
    if (isSameState(currentStatus, body.status)) {
      return jsonResponse({ data: existing, syncedAt: existing.updated_at })
    }
    const anchorRequirementError = validateAnchorRequirements(body)
    if (anchorRequirementError) return jsonResponse({ error: anchorRequirementError }, 400)

    const historyEntry = { stage: body.status, timestamp: new Date().toISOString() }
    const { data: updatedRows, error } = await db.rpc('append_request_history', {
      p_request_id: body.request_id,
      p_status: body.status,
      p_expected_status: currentStatus,
      p_history_entry: historyEntry,
      p_tx_hash: body.tx_hash ?? null,
      p_block_number: body.block_number ?? null,
      p_document_hash: body.document_hash ?? null,
      p_ipfs_cid: body.ipfs_cid ?? null,
      p_issue_date: body.issue_date ?? null,
    })

    if (error) return jsonResponse({ error: error.message }, 500)
    const updated = updatedRowFromRpc(updatedRows)
    if (!updated) return jsonResponse({ error: 'Request changed while it was being updated' }, 409)

    return jsonResponse({ data: updated, syncedAt: updated.updated_at })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
  }
})
