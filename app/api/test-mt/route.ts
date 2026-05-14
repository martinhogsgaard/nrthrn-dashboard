import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=2026-05-13&max_date=2026-05-13&location=48718&per_page=50`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()
  
  for (const session of data.data || []) {
    const reservationIds = session?.relationships?.reservations?.data?.map((r: any) => r.id) || []
    
    for (const id of reservationIds) {
      const r = await fetch(`https://nrthrnstrong.marianatek.com/api/reservations/${id}?include=tags`, { headers: MT_HEADERS })
      const d = await r.json()
      const tags = d.included?.map((t: any) => t.attributes?.name) || []
      
      if (tags.includes('First Reservation')) {
        const userId = d.data?.relationships?.user?.data?.id
        const ur = await fetch(`https://nrthrnstrong.marianatek.com/api/users/${userId}`, { headers: MT_HEADERS })
        const ud = await ur.json()
        return NextResponse.json({
          reservation_id: id,
          tags,
          user: {
            id: userId,
            name: ud.data?.attributes?.full_name,
            email: ud.data?.attributes?.email,
            birth_date: ud.data?.attributes?.birth_date,
          }
        })
      }
    }
  }
  
  return NextResponse.json({ message: 'Ingen First Reservation fundet' })
}