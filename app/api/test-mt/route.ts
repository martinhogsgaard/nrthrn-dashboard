import { NextResponse } from 'next/server'

const ARKETA_BASE = 'https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0'

export async function GET() {
  const key = process.env.ARKETA_API_KEY
  const partnerId = process.env.ARKETA_PARTNER_ID

  // Hent reservations for første klasse
  const res = await fetch(
    `${ARKETA_BASE}/${partnerId}/classes/X6DVbaDpp1zlL0wlm00w/reservations?limit=5`,
    { headers: { 'Authorization': `Bearer ${key}` } }
  )
  const body = await res.json()
  
  return NextResponse.json({ status: res.status, body })
}