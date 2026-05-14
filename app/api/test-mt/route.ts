import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const start = '2026-05-01'
  
  // Hent alle reservationer med first timer tag
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/reservations?tag=first-timer&min_datetime=${start}&per_page=10`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()

  // Prøv også andre mulige tag navne
  const res2 = await fetch(
    `https://nrthrnstrong.marianatek.com/api/reservations?tag=first_timer&min_datetime=${start}&per_page=5`,
    { headers: MT_HEADERS }
  )
  const data2 = await res2.json()

  return NextResponse.json({ 
    first_timer_tag: { status: res.status, count: data.meta?.pagination?.count },
    first_timer_underscore: { status: res2.status, count: data2.meta?.pagination?.count },
  })
}