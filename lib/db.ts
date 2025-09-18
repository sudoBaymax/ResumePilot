import { Client } from 'pg'

export function getPgClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })
  return client
} 