import { NextRequest } from 'next/server'
import { getPgClient } from '@/lib/db'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')?.toLowerCase()
  const token = searchParams.get('token')
  if (!username || !token) {
    return new Response('<h2>Invalid verification link.</h2>', { status: 400, headers: { 'Content-Type': 'text/html' } })
  }
  const secret = process.env.AFFILIATE_VERIFY_SECRET || 'changeme'
  const expected = crypto.createHmac('sha256', secret).update(username).digest('hex')
  if (token !== expected) {
    return new Response('<h2>Invalid or expired verification token.</h2>', { status: 403, headers: { 'Content-Type': 'text/html' } })
  }
  const client = getPgClient()
  await client.connect()
  const result = await client.query('UPDATE affiliates SET is_verified = true WHERE username = $1 RETURNING id', [username])
  await client.end()
  if (result.rowCount === 0) {
    return new Response('<h2>Affiliate not found.</h2>', { status: 404, headers: { 'Content-Type': 'text/html' } })
  }
  return new Response('<h2>Affiliate verified successfully!</h2><p>You can now close this tab.</p>', { status: 200, headers: { 'Content-Type': 'text/html' } })
} 