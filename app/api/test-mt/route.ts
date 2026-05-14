import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  
  // Hent dagens sessions
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=${today}&max_date=${today}&location=48718&per_page=20`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()
  
  // Find en session med Bruce-kunder
  const sessionWithBruce = data.data?.find((s: any) => 
    s.attributes.standard_reservation_user_count > 0
  )
  
  if (!sessionWithBruce) return NextResponse.json({ message: 'Ingen sessions i dag' })
  
  // Hent reservationer med tags
  const reservationIds = sessionWithBruce.relationships?.reservations?.data?.map((r: any) => r.id) || []
  
  const reservations = await Promise.all(
    reservationIds.slice(0, 10).map(async (id: string) => {
      const r = await fetch(
        `https://nrthrnstrong.marianatek.com/api/reservations/${id}?include=tags`,
        { headers: MT_HEADERS }
      )
      const d = await r.json()
      const brokerId = d.data?.relationships?.broker?.data?.id
      const tags = d.included?.map((t: any) => t.attributes?.name) || []
      return { id, broker_id: brokerId, is_bruce: brokerId === '53027', tags }
    })
  )

  const bruceReservations = reservations.filter(r => r.is_bruce)
  
  return NextResponse.json({ 
    total: reservations.length,
    bruce_count: bruceReservations.length,
    bruce_reservations: bruceReservations,
    all_tags: [...new Set(reservations.flatMap(r => r.tags))]
  })
}