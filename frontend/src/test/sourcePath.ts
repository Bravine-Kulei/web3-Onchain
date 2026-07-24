import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function frontendSourcePath(relativePath: string): string {
  const candidates = [
    resolve(process.cwd(), 'src', relativePath),
    resolve(process.cwd(), 'frontend', 'src', relativePath),
  ]
  const match = candidates.find(existsSync)
  if (!match) {
    throw new Error(`Frontend source file not found: ${relativePath}`)
  }
  return match
}
