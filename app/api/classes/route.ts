import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start') || new Date().toISOString().split('T')[0]
  const end = searchParams.get('end') || new Date().toISOString().split('T')[0]
  const location = searchParams.get('location') || '48718'

  let allSessions: any[] = []
  let page = 1
  while (true) {
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=${start}&max_date=${end}&location=${location}&per_page=100&page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    if (!data.data?.length) break
    allSessions = [...allSessions, ...data.data]
    if (data.meta?.pagination?.pages <= page) break
    page++
  }

  const sessions = allSessions.map((s: any) => {
    const startDT = new Date(s.attributes.start_datetime)
    const time = startDT.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' })
    return {
      id: s.id,
      date: s.attributes.start_date,
      time,
      class_type: s.attributes.class_type_display,
      instructor: s.attributes.instructor_names?.[0] || '',
      capacity: s.attributes.capacity,
      participants: s.attributes.standard_reservation_user_count || 0,
      location: s.attributes.location_display,
    }
  })

  return NextResponse.json({ sessions, total: sessions.length })
}