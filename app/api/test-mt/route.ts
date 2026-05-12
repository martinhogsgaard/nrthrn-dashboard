import { NextResponse } from 'next/server'

const ARKETA_BASE = 'https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0'

export async function GET() {
  const key = process.env.ARKETA_API_KEY
  const partnerId = process.env.ARKETA_PARTNER_ID

  const url = `${ARKETA_BASE}/${partnerId}/classes?startDate=2025-10-01&endDate=2025-10-03&limit=5`
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${key}` }
  })
  const body = await res.json()
  
  return NextResponse.json({ 
    url,
    status: res.status,
    body
  })
}