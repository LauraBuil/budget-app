import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildTransactionListQuery } from './transactions/list-query.mjs'

const apiEntry = await readFile(new URL('../api/[...path].mjs', import.meta.url), 'utf8')
const server = await readFile(new URL('./index.mjs', import.meta.url), 'utf8')
const transactionDatabase = await readFile(new URL('./transactions/database.mjs', import.meta.url), 'utf8')

assert.doesNotMatch(apiEntry, /schemaReady|await\s+schema/)
assert.ok(transactionDatabase.includes('pg_advisory_xact_lock'))
assert.ok(transactionDatabase.includes("query('BEGIN')") && transactionDatabase.includes("query('ROLLBACK')"))
assert.doesNotMatch(server, /WITH account_lock AS/)
assert.match(server, /buildTransactionListQuery\(request.user.uid, request.query, firstMonth, lastMonth, MAX_TRANSACTIONS_PER_RESPONSE\)/)
const listing = buildTransactionListQuery('security-test', {}, undefined, undefined)
assert.match(listing.text, /LIMIT \$\d+ OFFSET \$\d+/)
assert.deepEqual(listing.values.slice(-2), [1000, 0])
assert.match(server, /if \(process\.env\.VERCEL !== '1'\) \{\s+schemaReady = ensureSchema\(sql\)/)

console.log('Server security boundaries are present')
