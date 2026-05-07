import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  
  // Hent dagens sessions i København
  const sessRes = await fetch(
    `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=${today}&max_date=${today}&location=48718&per_page=10`,
    { headers: MT_HEADERS }
  )
  const sessData = await sessRes.json()
  
  // Find første session med reservationer
  const sessionWithRes = sessData.data?.find((s: any) => 
    s.relationships?.reservations?.data?.length > 0
  )
  
  if (!sessionWithRes) return NextResponse.json({ error: 'Ingen sessions med reservationer i dag' })
  
  const reservationIds = sessionWithRes.relationships.reservations.