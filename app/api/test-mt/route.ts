import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  // Hent første session 13. maj
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=2026-05-13&max_date=2026-05-13&location=48718&per_page=1`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()
  const session = data.data?.[0]
  const reservationIds = session?.relationships?.reservations?.data?.map((r: any) => r.id).slice(0, 5) || []

  const reservations = await Promise.all(
    reservationIds.map(async (id: string) => {
      const r = await fetch(`https://nrthrnstrong.marianatek.com/api/reservations/${id}?include=tags`, { headers: MT_HEADERS })
      const d = await r.json()
      return {
        id,
        broker: d.data?.relationships?.broker?.data?.id,
        is_bruce: d.data?.relationships?.broker?.data?.id === '53027',
        guest_name: d.data?.attributes?.guest_name,
        tags: d.included?.map((t: any) => t.attributes?.name) || []
      }
    })
  )

  return NextResponse.json({ session_id: session?.id, reservations })
}