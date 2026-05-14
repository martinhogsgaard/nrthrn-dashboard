import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=${tomorrow}&max_date=${tomorrow}&location=48718&per_page=50`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()

  // Find Sculpt hold
  const sculptSessions = data.data?.filter((s: any) => 
    s.attributes.class_type_display?.toLowerCase().includes('sculpt')
  )

  // Hent reservationer på Sculpt kl. 10
  const target = sculptSessions?.find((s: any) => 
    s.attributes.start_datetime?.includes('T08') || s.attributes.start_datetime?.includes('T09')
  )

  if (!target) return NextResponse.json({ sculpt_sessions: sculptSessions?.map((s: any) => ({ id: s.id, time: s.attributes.start_datetime })) })

  const reservationIds = target.relationships?.reservations?.data?.map((r: any) => r.id) || []
  
  const reservations = await Promise.all(
    reservationIds.slice(0, 20).map(async (id: string) => {
      const r = await fetch(
        `https://nrthrnstrong.marianatek.com/api/reservations/${id}?include=tags`,
        { headers: MT_HEADERS }
      )
      const d = await r.json()
      const userId = d.data?.relationships?.user?.data?.id
      const brokerId = d.data?.relationships?.broker?.data?.id
      const tags = d.included?.map((t: any) => t.attributes?.name) || []

      // Hent user navn
      let userName = null
      if (userId) {
        const ur = await fetch(`https://nrthrnstrong.marianatek.com/api/users/${userId}`, { headers: MT_HEADERS })
        const ud = await ur.json()
        userName = ud.data?.attributes?.full_name
      }

      return { id, user: userName, broker_id: brokerId, is_bruce: brokerId === '53027', tags }
    })
  )

  return NextResponse.json({ 
    session: { id: target.id, time: target.attributes.start_datetime },
    reservations
  })
}