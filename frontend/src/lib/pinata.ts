import { PinataSDK } from 'pinata'

const pinataJwt = import.meta.env.VITE_PINATA_JWT as string
const pinataGateway = import.meta.env.VITE_PINATA_GATEWAY as string || 'gateway.pinata.cloud'

export const isPinataConfigured = !!pinataJwt

export const pinata = new PinataSDK({
  pinataJwt: pinataJwt || 'placeholder',
  pinataGateway,
})

export async function uploadToIPFS(file: File): Promise<{ cid: string; url: string }> {
  if (!isPinataConfigured) {
    console.warn('[Pinata] Not configured — skipping IPFS upload')
    return { cid: '', url: '' }
  }
  const upload = await pinata.upload.public.file(file)
  return {
    cid: upload.cid,
    url: `https://${pinataGateway}/ipfs/${upload.cid}`,
  }
}

export function getIPFSUrl(cid: string): string {
  return `https://${pinataGateway}/ipfs/${cid}`
}
