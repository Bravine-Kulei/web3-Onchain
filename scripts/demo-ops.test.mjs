import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import { runDemoReset } from './demo-reset.mjs'

test('demo reset checks the environment and only prints manual recovery steps', () => {
  const calls = []
  const output = []
  const exitCode = runDemoReset({
    spawn: (...args) => {
      calls.push(args)
      return { status: 0 }
    },
    log: (line) => output.push(line),
    error: (line) => output.push(line),
    command: 'pnpm',
  })

  assert.equal(exitCode, 0)
  assert.deepEqual(calls, [['pnpm', ['check:env'], { stdio: 'inherit', shell: false }]])
  assert.match(output.join('\n'), /Restart the Hardhat node/)
  assert.match(output.join('\n'), /pnpm deploy:local/)
  assert.match(output.join('\n'), /\/setup/)
  assert.doesNotMatch(output.join('\n'), /delete|kill|truncate|reset database/i)
})

test('demo reset stops when the environment check fails', () => {
  const output = []
  const exitCode = runDemoReset({
    spawn: () => ({ status: 7 }),
    log: (line) => output.push(line),
    error: (line) => output.push(line),
    command: 'pnpm',
  })

  assert.equal(exitCode, 7)
  assert.match(output.join('\n'), /Fix the reported checks/)
  assert.doesNotMatch(output.join('\n'), /deploy:local|\/setup/)
})

test('demo commands check environment before verification and use the safe coordinator', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

  assert.equal(pkg.packageManager, 'pnpm@11.0.9')
  assert.equal(pkg.scripts['demo:check'], 'pnpm run check:env && pnpm run verify')
  assert.equal(pkg.scripts['demo:reset'], 'node scripts/demo-reset.mjs')
})

test('canonical setup and presenter docs use the package scripts consistently', () => {
  const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  const presenter = fs.readFileSync(new URL('../docs/demo-script.md', import.meta.url), 'utf8')

  for (const command of ['pnpm install', 'pnpm node', 'pnpm deploy:local', 'pnpm dev:frontend']) {
    assert.match(readme, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  for (const functionName of ['get-verifications', 'record-verification', 'update-request']) {
    assert.match(readme, new RegExp(functionName))
  }
  assert.match(readme, /verification-audit\.acceptance\.sql.*rollback-only/i)
  assert.match(readme, /SIWE_DOMAIN=localhost:5173/)
  assert.match(readme, /chain-confirmed.*sync-pending/i)
  assert.match(readme, /pnpm approve-builds/)
  assert.match(presenter, /7[–-]10 minute/i)
  assert.match(presenter, /\[ \].*switch.*wallet/i)
  assert.match(presenter, /\[ \].*signature/i)
  assert.match(presenter, /\[ \].*status/i)
  assert.match(presenter, /\[ \].*recover/i)
})
