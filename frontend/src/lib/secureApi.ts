import { isSupabaseConfigured, supabase } from './supabase'
import { AUTH_BYPASS, edgeFetch } from './siweAuth'
import { getSessionToken } from './siweSession'
import type { TransferRequest, RequestStatus, RequestUpdateResult, VerificationRecord } from './db'

export class SecureWriteError extends Error {
  constructor(message: string, public readonly code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NETWORK' | 'UNKNOWN' = 'UNKNOWN') {
    super(message)
    this.name = 'SecureWriteError'
  }
}

function classifyError(err: unknown): SecureWriteError {
  const msg = err instanceof Error ? err.message : 'Request failed'
  if (msg.includes('Unauthorized') || msg.includes('sign in')) {
    return new SecureWriteError(msg, 'UNAUTHORIZED')
  }
  if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('Only the issuing')) {
    return new SecureWriteError(msg, 'FORBIDDEN')
  }
  if (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('404')) {
    return new SecureWriteError(msg, 'NETWORK')
  }
  return new SecureWriteError(msg)
}

/** Legacy direct write — only when VITE_AUTH_BYPASS=true (local dev without Edge Functions). */
async function legacyCreateRequest(req: Omit<TransferRequest, 'id'>): Promise<TransferRequest> {
  const { data, error } = await supabase.from('requests').insert(req).select().single()
  if (error) throw new SecureWriteError(error.message)
  return data
}

async function legacyUpdateRequestStatus(
  requestId: string,
  status: RequestStatus,
  extra?: Record<string, unknown>,
): Promise<RequestUpdateResult> {
  const syncedAt = new Date().toISOString()
  const historyEntry = { stage: status, timestamp: syncedAt }
  const { data: current, error: currentError } = await supabase
    .from('requests').select('status').eq('request_id', requestId).single()
  if (currentError) throw new SecureWriteError(currentError.message)
  if (current.status === status) return { requestId, status, syncedAt }
  const { data, error } = await supabase.rpc('append_request_history', {
    p_request_id: requestId,
    p_status: status,
    p_expected_status: current.status,
    p_history_entry: historyEntry,
    p_tx_hash: extra?.tx_hash ?? null,
    p_block_number: extra?.block_number ?? null,
    p_document_hash: extra?.document_hash ?? null,
    p_ipfs_cid: extra?.ipfs_cid ?? null,
    p_issue_date: extra?.issue_date ?? null,
  })
  if (error) throw new SecureWriteError(error.message)
  if (!data?.length) throw new SecureWriteError('Request changed while it was being updated')
  return { requestId, status, syncedAt }
}

function normalizeUpdateResult(
  response: unknown,
  requestId: string,
  status: RequestStatus,
): RequestUpdateResult {
  const allowedStatuses = new Set<RequestStatus>([
    'Pending',
    'Under Review',
    'Approved',
    'Anchored',
    'Available',
    'Verified',
    'Revoked',
    'Rejected',
    'Tampered',
  ])

  let value = response
  while (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const nested = record.data ?? record.result ?? record.updated ?? record.request
    if (nested === undefined || nested === value) break
    value = nested
  }
  if (Array.isArray(value)) value = value[0]
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SecureWriteError('Malformed update response')
  }

  const row = value as Record<string, unknown>
  const normalizedRequestId = row.requestId ?? row.request_id
  const normalizedStatus = row.status
  const normalizedSyncedAt = row.syncedAt ?? row.synced_at ?? row.updated_at
  if (
    typeof normalizedRequestId !== 'string' || !normalizedRequestId ||
    normalizedRequestId !== requestId ||
    typeof normalizedStatus !== 'string' || !allowedStatuses.has(normalizedStatus as RequestStatus) ||
    normalizedStatus !== status ||
    typeof normalizedSyncedAt !== 'string' || Number.isNaN(Date.parse(normalizedSyncedAt))
  ) {
    throw new SecureWriteError('Malformed update response')
  }

  return {
    requestId: normalizedRequestId,
    status: normalizedStatus as RequestStatus,
    syncedAt: normalizedSyncedAt,
  }
}

async function legacyRecordVerification(
  rec: Omit<VerificationRecord, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase.from('verifications').upsert(rec, { onConflict: 'attempt_id', ignoreDuplicates: true })
  if (error) throw new SecureWriteError(error.message)
}

export async function secureCreateRequest(
  req: Omit<TransferRequest, 'id'>,
): Promise<TransferRequest> {
  if (!isSupabaseConfigured) {
    throw new SecureWriteError('Supabase not configured')
  }

  if (AUTH_BYPASS) {
    return legacyCreateRequest(req)
  }

  const session = getSessionToken()
  if (!session) {
    throw new SecureWriteError('Sign in with your wallet to submit requests', 'UNAUTHORIZED')
  }

  try {
    const result = await edgeFetch<{ data: TransferRequest }>('create-request', {
      method: 'POST',
      session,
      body: JSON.stringify(req),
    })
    return result.data
  } catch (err) {
    throw classifyError(err)
  }
}

export async function secureUpdateRequestStatus(
  requestId: string,
  status: RequestStatus,
  extra?: {
    tx_hash?: string
    block_number?: number
    document_hash?: string
    ipfs_cid?: string
    issue_date?: string
  },
): Promise<RequestUpdateResult> {
  if (!isSupabaseConfigured) {
    return { requestId, status, syncedAt: new Date().toISOString() }
  }

  if (AUTH_BYPASS) {
    return legacyUpdateRequestStatus(requestId, status, extra)
  }

  const session = getSessionToken()
  if (!session) {
    throw new SecureWriteError('Sign in with your wallet to update requests', 'UNAUTHORIZED')
  }

  try {
    const response = await edgeFetch<unknown>('update-request', {
      method: 'POST',
      session,
      body: JSON.stringify({ request_id: requestId, status, ...extra }),
    })
    return normalizeUpdateResult(response, requestId, status)
  } catch (err) {
    throw classifyError(err)
  }
}

export async function secureRecordVerification(
  rec: Omit<VerificationRecord, 'id' | 'created_at'>,
): Promise<void> {
  if (!isSupabaseConfigured) throw new SecureWriteError('Supabase not configured')

  if (AUTH_BYPASS) {
    await legacyRecordVerification(rec)
    return
  }

  const session = getSessionToken()
  if (!session) throw new SecureWriteError('Sign in with your wallet to record the audit log', 'UNAUTHORIZED')

  try {
    const response = await edgeFetch<{ ok?: boolean; attempt_id?: string }>('record-verification', {
      method: 'POST',
      session,
      body: JSON.stringify(rec),
    })
    if (!response?.ok || response.attempt_id !== rec.attempt_id) {
      throw new SecureWriteError('Malformed audit acknowledgement')
    }
  } catch (err) {
    throw classifyError(err)
  }
}
