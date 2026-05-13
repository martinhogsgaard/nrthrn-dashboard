import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const start = '2026-05-01'
  
  // Hent First Timer orders — det er nye medlemmer
  let all: any[] = []
  let page = 1
  while (page <= 5) {
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/orders?min_datetime=${start}&per_page=100&page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    if (!data.data?.length) break
    all = [...all, ...data.data]
    if (data.meta?.pagination?.pages <= page) break
    page++
  }

  const cph = all.filter(o => o.attributes.location === 'Copenhagen' && o.attributes.status === 'Completed')
  
  // First timers = folk der har købt First Timer produkt
  const firstTimers = cph.filter(o => o.attributes.summary?.[0]?.toLowerCase().includes('first timer'))
  
  // Nye abonnementer = folk der har købt abonnement for første gang
  const newMemberships = cph.filter(o => {
    const name = o.attributes.summary?.[0] || ''
    return name.includes('Monthly') || name.includes('Classes') || name.includes('Revival') || name.includes('Warrior')
  })

  return NextResponse.json({
    first_timers: firstTimers.length,
    first_timer_names: firstTimers.map(o => o.attributes.summary?.[0]),
    new_memberships: newMemberships.length,
  })
}