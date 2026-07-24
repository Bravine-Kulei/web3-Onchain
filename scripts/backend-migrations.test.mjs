import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const migrationsDirectory = new URL('../supabase/migrations/', import.meta.url)

const normalizeSql = (sql) => sql.replace(/\r\n/g, '\n').trim()

test('ordered migrations exactly mirror the canonical schema and hardening SQL', async () => {
  const migrationNames = (await readdir(migrationsDirectory)).filter((name) => name.endsWith('.sql')).sort()
  assert.deepEqual(migrationNames, [
    '202607200001_initial_schema.sql',
    '202607200002_harden_schema.sql',
  ])

  const pairs = [
    ['supabase/schema.sql', `supabase/migrations/${migrationNames[0]}`],
    ['supabase/schema-harden.sql', `supabase/migrations/${migrationNames[1]}`],
  ]

  for (const [sourcePath, migrationPath] of pairs) {
    const source = await readFile(new URL(sourcePath, root), 'utf8')
    const migration = await readFile(new URL(migrationPath, root), 'utf8')
    assert.equal(normalizeSql(migration), normalizeSql(source), `${migrationPath} drifted from ${sourcePath}`)
    assert.doesNotMatch(migration, /^\s*\\(i|include|ir)\b/m, `${migrationPath} must be self-contained`)
  }
})

test('backend deploys functions before applying the initial and hardening migrations', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
  assert.equal(pkg.scripts['test:backend'], 'node --test scripts/backend-migrations.test.mjs')
  assert.equal(pkg.scripts['deploy:backend'], 'supabase functions deploy && supabase db push')

  const config = await readFile(new URL('supabase/config.toml', root), 'utf8')
  assert.match(config, /^project_id = "[^"]+"$/m, 'Supabase CLI config must have a non-empty local project ID')
})

test('legacy text attempt IDs sanitize invalid values before conversion to UUID', async () => {
  for (const path of ['supabase/schema.sql', 'supabase/schema-harden.sql']) {
    const sql = await readFile(new URL(path, root), 'utf8')
    assert.match(sql, /data_type = 'text'/, `${path} must only run text conversion for a text column`)
    assert.ok(
      sql.includes("when attempt_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then attempt_id::uuid"),
      `${path} must recognize every syntactically valid UUID text`,
    )
    assert.match(sql, /else gen_random_uuid\(\)/, `${path} must replace invalid legacy values`)
    assert.match(sql, /alter column attempt_id type uuid/, `${path} must convert the sanitized column`)
  }
})

test('backend deployment artifacts contain placeholders, not committed secrets', async () => {
  const paths = [
    'README.md',
    'supabase/functions/README.md',
    'supabase/schema.sql',
    'supabase/schema-harden.sql',
    'package.json',
  ]
  const contents = await Promise.all(paths.map(async (path) => [path, await readFile(new URL(path, root), 'utf8')]))

  for (const [path, content] of contents) {
    assert.doesNotMatch(content, /(?:service_role|SIWE_SESSION_SECRET)\s*=\s*(?!YOUR_|your_)[^\s`]+/i, `${path} may contain a secret`)
    assert.doesNotMatch(content, /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, `${path} may contain a JWT`)
  }
})

test('SIWE verifier imports SIWE utilities from the supported viem subpath', async () => {
  const source = await readFile(new URL('supabase/functions/siwe-verify/index.ts', root), 'utf8')

  assert.match(
    source,
    /from 'npm:viem@2\.52\.2\/siwe'/,
    'SIWE utilities must come from viem/siwe so the Edge Function can boot',
  )
  assert.doesNotMatch(
    source,
    /import\s*\{[^}]*(?:parseSiweMessage|verifySiweMessage)[^}]*\}\s*from 'npm:viem@2\.52\.2'/,
    'SIWE helpers are not exported by the root viem module',
  )
  assert.match(source, /recoverMessageAddress/, 'EOA signatures must be recovered with an exported viem utility')
  assert.match(source, /validateSiweMessage/, 'parsed SIWE fields must be validated')
})

test('request state machine supports the registrar one-click issuance flow', async () => {
  const source = await readFile(new URL('supabase/functions/_shared/request-status.ts', root), 'utf8')
  assert.match(
    source,
    /'Pending': new Set\(\[[^\]]*'Anchored'/,
    'Approve & Issue moves a newly submitted Pending request directly to Anchored after chain confirmation',
  )
})
