import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=2026-05-13&max_date=2026-05-13&location=48718&per_page=1`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()
  const session = data.data?.[0]
  const reservationIds = session?.relationships?.reservations?.data?.map((r: any) => r.id) || []

  const reservations = await Promise.all(
    reservationIds.map(async (id: string) => {
      const r = await fetch(`https://nrthrnstrong.marianatek.com/api/reservations/${id}?include=tags`, { headers: MT_HEADERS })
      const d = await r.json()
      const tags = d.included?.map((t: any) => t.attributes?.name) || []
      if (!tags.includes('First Reservation')) return null
      return {
        id,
        broker: d.data?.relationships?.broker?.data?.id,
        is_bruce: d.data?.relationships?.broker?.data?.id === '53027',
        guest_name: d.data?.attributes?.guest_name,
        guest_email: d.data?.attributes?.guest_email,
        user_id: d.data?.relationships?.user?.data?.id,
        tags,
      }
    })
  )

  return NextResponse.json({ 
    first_reservation: reservations.filter(Boolean)
  })
}