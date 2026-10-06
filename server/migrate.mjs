import dotenv from 'dotenv'
import { neon } from '@neondatabase/serverless'
import { ensureSchema } from './schema.mjs'

dotenv.config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is missing from .env.local')

await ensureSchema(neon(databaseUrl))
console.log('Neon schema is ready')
