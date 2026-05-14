import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  // Hent sessions fra 13. maj og deres reservationer med tags
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=2026-05-13&max_date=2026-05-13&location=48718&per_page=50`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()

  let allTags: Record<string, number> = {}
  let bruceCount = 0
  let firstTimerCount = 0
  let unconvertedCount = 0

  for (const session of data.data || []) {
    const reservationIds = session.relationships?.reservations?.data?.map((r: any) => r.id) || []
    
    for (const resId of reservationIds) {
      const r = await fetch(
        `https://nrthrnstrong.marianatek.com/api/reservations/${resId}?include=tags`,
        { headers: MT_HEADERS }
      )
      const rd = await r.json()
      
      const brokerId = rd.data?.relationships?.broker?.data?.id
      const tags = rd.included?.map((t: any) => t.attributes?.name) || []
      
      if (brokerId === '53027') bruceCount++
      tags.forEach((t: string) => {
        allTags[t] = (allTags[t] || 0) + 1
        if (t.toLowerCase().includes('first')) firstTimerCount++
        if (t.toLowerCase().includes('unconverted')) unconvertedCount++
      })
    }
  }

  return NextResponse.json({ 
    sessions: data.data?.length,
    bruce: bruceCount,
    first_timer_tags: firstTimerCount,
    unconverted_tags: unconvertedCount,
    all_tags: allTags
  })
}