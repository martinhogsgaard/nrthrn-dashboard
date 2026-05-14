import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/reservations?tag=first-timer&per_page=3&include=class_session`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()
  
  return NextResponse.json({
    reservation: data.data?.[0]?.attributes,
    session_included: data.included?.[0]?.attributes,
  })
}