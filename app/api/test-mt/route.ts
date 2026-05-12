import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.ARKETA_API_KEY
  const partnerId = process.env.ARKETA_PARTNER_ID

  const url = `https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0/${partnerId}/locations`
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${key}` }
  })
  const body = await res.text()

  return NextResponse.json({ 
    url,
    key_length: key?.length,
    key_preview: key?.slice(0, 10) + '...',
    partner_id: partnerId,
    status: res.status,
    body: body.slice(0, 300)
  })
}