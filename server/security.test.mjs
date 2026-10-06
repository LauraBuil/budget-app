import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const apiEntry = await readFile(new URL('../api/[...path].mjs', import.meta.url), 'utf8')
const server = await readFile(new URL('./index.mjs', import.meta.url), 'utf8')

assert.doesNotMatch(apiEntry, /schemaReady|await\s+schema/)
assert.ok(server.includes('sql.transaction(') && server.includes('pg_advisory_xact_lock'))
assert.doesNotMatch(server, /WITH account_lock AS/)
assert.match(server, /LIMIT \$\{MAX_TRANSACTIONS_PER_RESPONSE}/)
assert.match(server, /if \(process\.env\.VERCEL !== '1'\) \{\s+schemaReady = ensureSchema\(sql\)/)

console.log('Server security boundaries are present')
