import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch(
    'https://nrthrnstrong.marianatek.com/api/class_sessions',
    {
      headers: {
        'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const text = await res.text()
  return NextResponse.json({ status: res.status, body: text.slice(0, 2000) })
}