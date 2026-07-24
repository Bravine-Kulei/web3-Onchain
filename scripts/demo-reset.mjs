#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function runDemoReset({
  spawn = spawnSync,
  log = console.log,
  error = console.error,
  command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
} = {}) {
  const result = spawn(command, ['check:env'], { stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    error('Environment is not ready. Fix the reported checks before resetting the demo.')
    return result.status ?? 1
  }

  log('Environment ready.')
  log('Restart the Hardhat node, then run: pnpm deploy:local')
  log('Open /setup and confirm all required checks are green before presenting.')
  return 0
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) process.exitCode = runDemoReset()
