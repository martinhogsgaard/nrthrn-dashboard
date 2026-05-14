import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/reservations/5344`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()
  return NextResponse.json(data.data)
}