import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('frontend never reads or bundles a Pinata JWT', () => {
  const files = [
    '.env.example',
    'frontend/src/lib/envCheck.ts',
    'frontend/src/lib/pinata.ts',
    'frontend/src/pages/Setup.tsx',
    'frontend/src/pages/registrar/RequestReview.tsx',
  ]
  for (const file of files) {
    const source = read(file)
    assert.doesNotMatch(source, /import\.meta\.env\.VITE_PINATA_JWT/, file)
    assert.doesNotMatch(source, /^\s*VITE_PINATA_JWT\s*=/m, file)
  }
  assert.match(read('README.md'), /IPFS upload.*server-side/i)
})

test('user-facing setup guidance consistently uses pnpm', () => {
  const files = [
    'frontend/src/lib/envCheck.ts',
    'frontend/src/pages/Setup.tsx',
    'frontend/src/pages/PublicVerify.tsx',
    'supabase/functions/README.md',
  ]
  for (const file of files) {
    assert.doesNotMatch(read(file), /(?<!p)npm (?:run|install)|\bnpx\b/, file)
  }
})

test('SIWE verify exposes an explicit health request without exposing its secret', () => {
  const source = read('supabase/functions/siwe-verify/index.ts')
  assert.match(source, /getSiweHealth/)
  assert.match(source, /body\.health/)
  assert.doesNotMatch(source, /jsonResponse\(\s*\{[^}]*\b(?:secret|domain)\b/)
})
