import postgres from 'postgres'
import { readFileSync } from 'node:fs'
const sql = postgres(process.env.DATABASE_URL)
await sql.unsafe(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'))
await sql.end()
console.log('schema ok')
