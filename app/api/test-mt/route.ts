import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const start = '2026-05-01'
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/reservations?tag=first-timer&min_datetime=${start}&per_page=1`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()
  return NextResponse.json({ 
    total: data.meta?.pagination?.count,
    pages: data.meta?.pagination?.pages
  })
}