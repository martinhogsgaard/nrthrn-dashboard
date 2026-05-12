import { NextResponse } from 'next/server'

const ARKETA_BASE = 'https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0'

export async function GET() {
  const key = process.env.ARKETA_API_KEY
  const partnerId = process.env.ARKETA_PARTNER_ID

  const res = await fetch(
    `${ARKETA_BASE}/${partnerId}/classes?startDate=2025-11-01&endDate=2025-11-30&limit=3`,
    { headers: { 'Authorization': `Bearer ${key}` } }
  )
  const data = await res.json()

  return NextResponse.json({ 
    status: res.status,
    count: data.items?.length,
    pagination: data.pagination,
    first: data.items?.[0]
  })
}