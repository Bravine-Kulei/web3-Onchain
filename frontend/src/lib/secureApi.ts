import { isSupabaseConfigured, supabase } from './supabase'
import { AUTH_BYPASS, edgeFetch } from './siweAuth'
import { getSessionToken } from './siweSession'
import type { TransferRequest, RequestStatus, VerificationRecord } from './db'

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
): Promise<void> {
  const historyEntry = { stage: status, timestamp: new Date().toISOString() }
  const { error } = await supabase.rpc('append_request_history', {
    p_request_id: requestId,
    p_status: status,
    p_history_entry: historyEntry,
    ...extra,
  })
  if (error) throw new SecureWriteError(error.message)
}

async function legacyRecordVerification(
  rec: Omit<VerificationRecord, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase.from('verifications').insert(rec)
  if (error) console.warn('[legacy] recordVerification:', error.message)
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
): Promise<void> {
  if (!isSupabaseConfigured) return

  if (AUTH_BYPASS) {
    await legacyUpdateRequestStatus(requestId, status, extra)
    return
  }

  const session = getSessionToken()
  if (!session) {
    throw new SecureWriteError('Sign in with your wallet to update requests', 'UNAUTHORIZED')
  }

  try {
    await edgeFetch('update-request', {
      method: 'POST',
      session,
      body: JSON.stringify({ request_id: requestId, status, ...extra }),
    })
  } catch (err) {
    throw classifyError(err)
  }
}

export async function secureRecordVerification(
  rec: Omit<VerificationRecord, 'id' | 'created_at'>,
): Promise<void> {
  if (!isSupabaseConfigured) return

  if (AUTH_BYPASS) {
    await legacyRecordVerification(rec)
    return
  }

  const session = getSessionToken()
  if (!session) return

  try {
    await edgeFetch('record-verification', {
      method: 'POST',
      session,
      body: JSON.stringify(rec),
    })
  } catch (err) {
    console.warn('[secureApi] recordVerification:', err)
  }
}
