import { NextRequest, NextResponse } from 'next/server'
import { getPgClient } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const {
      name,
      username,
      email,
      website,
      audience,
      payoutEmail,
      message,
    } = data

    // Basic validation
    if (!name || !username || !email || !audience || !payoutEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const usernameClean = String(username).toLowerCase()
    if (!/^[a-z0-9_-]{3,20}$/.test(usernameClean)) {
      return NextResponse.json({ error: 'Invalid username format' }, { status: 400 })
    }

    const client = getPgClient()
    await client.connect()

    // Check for unique username
    const check = await client.query('SELECT id FROM affiliates WHERE username = $1', [usernameClean])
    if (check.rows.length > 0) {
      await client.end()
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
    }

    // Insert affiliate
    const insert = await client.query(
      `INSERT INTO affiliates (name, username, email, website, audience, payout_email, message, is_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW()) RETURNING id`,
      [name, usernameClean, email, website, audience, payoutEmail, message]
    )
    await client.end()

    // Generate a simple secure token (HMAC of username + secret)
    const secret = process.env.AFFILIATE_VERIFY_SECRET || 'changeme'
    const token = crypto.createHmac('sha256', secret).update(usernameClean).digest('hex')
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://resumepilot.ca'}/api/affiliate/verify?username=${encodeURIComponent(usernameClean)}&token=${token}`

    // Send notification email to admin
    await sendEmail({
      to: 'jatoujoseph@gmail.com',
      subject: `New Affiliate Application: ${name} (${usernameClean})`,
      html: `
        <h2>New Affiliate Application</h2>
        <ul>
          <li><b>Name:</b> ${name}</li>
          <li><b>Username:</b> ${usernameClean}</li>
          <li><b>Email:</b> ${email}</li>
          <li><b>Website:</b> ${website || '-'}</li>
          <li><b>Audience:</b> ${audience}</li>
          <li><b>Payout Email:</b> ${payoutEmail}</li>
          <li><b>Message:</b> ${message || '-'}</li>
        </ul>
        <p><a href="${verifyUrl}" style="background:#22c55e;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Verify Affiliate</a></p>
        <p>Or log in to the <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://resumepilot.ca'}/admin">Admin Dashboard</a> to manage affiliates.</p>
      `
    })

    return NextResponse.json({
      success: true,
      referralLink: `https://resumepilot.ca/ref/${usernameClean}`,
    })
  } catch (err) {
    console.error('Affiliate apply error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 