import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('pnpm build policy narrowly allows required native dependencies', () => {
  const workspace = fs.readFileSync(new URL('../pnpm-workspace.yaml', import.meta.url), 'utf8')
  const allowed = Object.fromEntries(
    [...workspace.matchAll(/^  ([^:\s]+):\s*(.+)$/gm)].map(([, name, value]) => [name, value.trim()]),
  )

  assert.deepEqual(allowed, {
    esbuild: 'true',
    keccak: 'true',
    secp256k1: 'true',
  })
})

test('root sync compiles once and contract sync skips Hardhat compilation', () => {
  const rootPackage = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const contractsPackage = JSON.parse(fs.readFileSync(new URL('../contracts/package.json', import.meta.url), 'utf8'))

  assert.equal(rootPackage.scripts.sync, 'pnpm run compile && pnpm --filter contracts sync')
  assert.equal(contractsPackage.scripts.sync, 'hardhat run --no-compile scripts/sync-artifacts.ts')
})

test('root deployment scripts explicitly run package scripts instead of pnpm deploy', () => {
  const rootPackage = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

  assert.equal(rootPackage.scripts['deploy:local'], 'cross-env SEED=true pnpm --filter contracts run deploy')
  assert.equal(rootPackage.scripts['deploy:amoy'], 'pnpm --filter contracts run deploy:amoy')
})
