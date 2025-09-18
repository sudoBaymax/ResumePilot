import { NextRequest, NextResponse } from 'next/server'
import { getPgClient } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { verificationCode } = await req.json()
    
    if (!verificationCode) {
      return NextResponse.json({ error: 'Verification code required' }, { status: 400 })
    }

    const client = getPgClient()
    await client.connect()

    // Find affiliate by verification code (last 4 chars of username + 2 digits)
    const result = await client.query(
      `SELECT id, username, name FROM affiliates 
       WHERE is_verified = false 
       AND username LIKE $1`,
      [`%${verificationCode.slice(0, 4)}`]
    )

    if (result.rows.length === 0) {
      await client.end()
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 404 })
    }

    // Verify the affiliate
    const affiliate = result.rows[0]
    await client.query(
      'UPDATE affiliates SET is_verified = true WHERE id = $1',
      [affiliate.id]
    )
    await client.end()

    return NextResponse.json({ 
      success: true, 
      message: `Affiliate ${affiliate.name} (${affiliate.username}) verified successfully` 
    })

  } catch (error) {
    console.error('SMS verification error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 