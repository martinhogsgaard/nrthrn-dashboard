import { NextResponse } from 'next/server'

const ARKETA_BASE = 'https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0'

export async function GET() {
  const key = process.env.ARKETA_API_KEY
  const partnerId = process.env.ARKETA_PARTNER_ID

  // Hent klasser, klienter og køb parallelt
  const [classesRes, clientsRes, purchasesRes] = await Promise.all([
    fetch(`${ARKETA_BASE}/${partnerId}/classes?startDate=2025-10-01&endDate=2025-10-31&limit=3`, { headers: { 'Authorization': `Bearer ${key}` } }),
    fetch(`${ARKETA_BASE}/${partnerId}/clients?limit=3`, { headers: { 'Authorization': `Bearer ${key}` } }),
    fetch(`${ARKETA_BASE}/${partnerId}/purchases?limit=3`, { headers: { 'Authorization': `Bearer ${key}` } }),
  ])

  const [classes, clients, purchases] = await Promise.all([
    classesRes.json(),
    clientsRes.json(),
    purchasesRes.json(),
  ])

  return NextResponse.json({
    classes: { count: classes.items?.length, first: classes.items?.[0] },
    clients: { count: clients.items?.length, first: clients.items?.[0] },
    purchases: { count: purchases.items?.length, first: purchases.items?.[0] },
  })
}