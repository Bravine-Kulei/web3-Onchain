import { supabase, isSupabaseConfigured } from './supabase'
import { REQUESTS } from '../data/mockData'

export type RequestStatus =
  | 'Pending'
  | 'Under Review'
  | 'Approved'
  | 'Anchored'
  | 'Available'
  | 'Verified'
  | 'Revoked'
  | 'Tampered'

export interface TransferRequest {
  id: string
  request_id: string
  student_wallet?: string
  student_name: string
  student_id: string
  program: string
  source_institution: string
  source_institution_address?: string
  dest_institution: string
  dest_institution_address?: string
  status: RequestStatus
  submitted_at: string
  tx_hash?: string
  block_number?: number
  document_hash?: string
  ipfs_cid?: string
  issue_date?: string
  history: { stage: string; timestamp: string }[]
}

// ── Requests ────────────────────────────────────────────────

export async function createRequest(req: Omit<TransferRequest, 'id'>): Promise<TransferRequest | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('requests')
    .insert(req)
    .select()
    .single()
  if (error) { console.error('[DB] createRequest:', error); return null }
  return data
}

export async function getRequests(filters?: {
  status?: RequestStatus | RequestStatus[]
  sourceInstitution?: string
  destInstitution?: string
  studentWallet?: string
}): Promise<TransferRequest[]> {
  if (!isSupabaseConfigured) {
    // fall back to mock data
    return REQUESTS.map(r => ({
      id: r.id,
      request_id: r.id,
      student_name: r.student.name,
      student_id: r.student.studentId,
      program: r.program,
      source_institution: r.sourceUni.name,
      source_institution_address: r.sourceUni.address,
      dest_institution: r.destUni.name,
      dest_institution_address: r.destUni.address,
      status: r.status as RequestStatus,
      submitted_at: r.submittedAt,
      tx_hash: r.txHash,
      block_number: r.blockNumber,
      document_hash: r.fingerprint,
      history: r.history,
    })) as TransferRequest[]
  }

  let query = supabase.from('requests').select('*').order('submitted_at', { ascending: false })

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status)
    } else {
      query = query.eq('status', filters.status)
    }
  }
  if (filters?.sourceInstitution) query = query.eq('source_institution', filters.sourceInstitution)
  if (filters?.destInstitution) query = query.eq('dest_institution', filters.destInstitution)
  if (filters?.studentWallet) query = query.eq('student_wallet', filters.studentWallet)

  const { data, error } = await query
  if (error) { console.error('[DB] getRequests:', error); return [] }
  return data ?? []
}

export async function getRequestById(requestId: string): Promise<TransferRequest | null> {
  if (!isSupabaseConfigured) {
    const r = REQUESTS.find(r => r.id === requestId)
    if (!r) return null
    return {
      id: r.id,
      request_id: r.id,
      student_name: r.student.name,
      student_id: r.student.studentId,
      program: r.program,
      source_institution: r.sourceUni.name,
      dest_institution: r.destUni.name,
      status: r.status as RequestStatus,
      submitted_at: r.submittedAt,
      tx_hash: r.txHash,
      block_number: r.blockNumber,
      document_hash: r.fingerprint,
      history: r.history,
    }
  }
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('request_id', requestId)
    .single()
  if (error) { console.error('[DB] getRequestById:', error); return null }
  return data
}

export async function getRequestByHash(documentHash: string): Promise<TransferRequest | null> {
  if (!isSupabaseConfigured) {
    const r = REQUESTS.find(r => r.fingerprint?.toLowerCase() === documentHash.toLowerCase())
    if (!r) return null
    return {
      id: r.id,
      request_id: r.id,
      student_name: r.student.name,
      student_id: r.student.studentId,
      program: r.program,
      source_institution: r.sourceUni.name,
      dest_institution: r.destUni.name,
      status: r.status as RequestStatus,
      submitted_at: r.submittedAt,
      tx_hash: r.txHash,
      block_number: r.blockNumber,
      document_hash: r.fingerprint,
      history: r.history,
    }
  }
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .ilike('document_hash', documentHash)
    .limit(1)
    .maybeSingle()
  if (error) { console.error('[DB] getRequestByHash:', error); return null }
  return data
}

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  extra?: { tx_hash?: string; block_number?: number; document_hash?: string; ipfs_cid?: string; issue_date?: string }
): Promise<void> {
  if (!isSupabaseConfigured) return
  const historyEntry = { stage: status, timestamp: new Date().toISOString() }
  const { error } = await supabase.rpc('append_request_history', {
    p_request_id: requestId,
    p_status: status,
    p_history_entry: historyEntry,
    ...extra,
  })
  if (error) {
    // Fallback: direct update
    await supabase
      .from('requests')
      .update({ status, ...extra })
      .eq('request_id', requestId)
  }
}

// ── Verifications ───────────────────────────────────────────

export type VerifyResultValue = 'VERIFIED' | 'TAMPERED' | 'REVOKED' | 'NOT_FOUND'

export interface VerificationRecord {
  id: string
  request_id?: string
  transcript_input?: string
  verifier_wallet?: string
  student_name?: string
  source_institution?: string
  result: VerifyResultValue
  doc_hash?: string
  tx_hash?: string
  created_at: string
}

export async function recordVerification(
  rec: Omit<VerificationRecord, 'id' | 'created_at'>
): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('verifications').insert(rec)
  if (error) console.error('[DB] recordVerification:', error)
}

export async function getVerifications(): Promise<VerificationRecord[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('[DB] getVerifications:', error); return [] }
  return data ?? []
}

export function subscribeToRequests(
  onUpdate: (req: TransferRequest) => void,
  _filter?: { sourceInstitution?: string; destInstitution?: string }
) {
  if (!isSupabaseConfigured) return () => {}
  const channel = supabase
    .channel('requests-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'requests' },
      payload => onUpdate(payload.new as TransferRequest)
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
