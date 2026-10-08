import { Client } from '@neondatabase/serverless'

export async function withAccountTransaction(connectionString, uid, work) {
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query('BEGIN')
    await client.query("SET LOCAL statement_timeout = '20s'")
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [uid])
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { await client.end() }
}
