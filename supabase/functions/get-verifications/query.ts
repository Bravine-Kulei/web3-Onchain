export const SAFE_VERIFICATION_COLUMNS = 'id,attempt_id,request_id,result,doc_hash,tx_hash,created_at'

export function verificationHistoryQuery(wallet: string) {
  const normalizedWallet = wallet.trim().toLowerCase()
  if (!/^0x[0-9a-f]{40}$/.test(normalizedWallet)) throw new Error('Valid verifier wallet required')
  return { columns: SAFE_VERIFICATION_COLUMNS, verifierWallet: normalizedWallet }
}
