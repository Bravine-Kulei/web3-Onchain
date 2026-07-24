const pinataGateway = import.meta.env.VITE_PINATA_GATEWAY as string || 'gateway.pinata.cloud'

// Public, read-only gateway helper. Uploads require a future authenticated server endpoint.
export function getIPFSUrl(cid: string): string {
  return `https://${pinataGateway}/ipfs/${cid}`
}
