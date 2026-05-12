import { NextResponse } from 'next/server'

const ARKETA_BASE = 'https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0'

export async function GET() {
  const key = process.env.ARKETA_API_KEY
  const partnerId = process.env.ARKETA_PARTNER_ID

  // Hent purchases filtreret på memberships
  const [membershipsRes, clientRes, classRes] = await Promise.all([
    fetch(`${ARKETA_BASE}/${partnerId}/purchases?type=membership&limit=3`, { headers: { 'Authorization': `Bearer ${key}` } }),
    // Hent én specifik klient for at se detaljer
    fetch(`${ARKETA_BASE}/${partnerId}/clients/ybrHgFENKYg6kOhfdUvq5nlsP6t1`, { headers: { 'Authorization': `Bearer ${key}` } }),
    // Hent reservations på første klasse
    fetch(`${ARKETA_BASE}/${partnerId}/classes/X6DVbaDpp1zlL0wlm00w/reservations?limit=3`, { headers: { 'Authorization': `Bearer ${key}` } }),
  ])

  const [memberships, client, reservations] = await Promise.all([
    membershipsRes.json(),
    clientRes.json(),
    classRes.json(),
  ])

  return NextResponse.json({
    memberships: { count: memberships.items?.length, first: memberships.items?.[0] },
    client_detail: client,
    reservations: { count: reservations.items?.length, first: reservations.items?.[0] },
  })
}