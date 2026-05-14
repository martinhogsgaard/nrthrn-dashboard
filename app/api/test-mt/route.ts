import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/reports`,
    { headers: MT_HEADERS }
  )
  return NextResponse.json({ status: res.status, body: await res.text().then(t => t.slice(0, 300)) })
}