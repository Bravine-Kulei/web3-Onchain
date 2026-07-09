import { createConfig, http } from 'wagmi'
import { hardhat, polygonAmoy } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'
import { CHAIN_NAMES, HARDHAT_RPC, resolveExpectedChainId } from '@transcrypt/shared/chains'

const chainEnv = import.meta.env.VITE_CHAIN

export const expectedChainId = resolveExpectedChainId(chainEnv)

export const wagmiConfig = createConfig({
  chains: [hardhat, polygonAmoy],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [hardhat.id]: http(HARDHAT_RPC),
    [polygonAmoy.id]: http(),
  },
})

export const expectedChainName = CHAIN_NAMES[expectedChainId] ?? 'Unknown network'
