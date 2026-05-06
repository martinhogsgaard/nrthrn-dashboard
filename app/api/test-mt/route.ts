import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start') || '2026-05-01'
  const end = searchParams.get('end') || '2026-05-06'

  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/employees`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const text = await res.text()
  return NextResponse.json({ status: res.status, body: text.slice(0, 3000) })
}