import { NextResponse } from 'next/server'

const ARKETA_BASE = 'https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0'

export async function GET() {
  const key = process.env.ARKETA_API_KEY
  const partnerId = process.env.ARKETA_PARTNER_ID

  const res = await fetch(
    `${ARKETA_BASE}/${partnerId}/locations`,
    { headers: { 'Authorization': `Bearer ${key}` } }
  )
  const data = await res.json()
  return NextResponse.json({ data })
}