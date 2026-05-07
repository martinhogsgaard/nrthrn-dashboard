import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start') || '2026-05-07'
  const end = searchParams.get('end') || '2026-05-07'

  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=${start}&max_date=${end}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const data = await res.json()
  return NextResponse.json({ 
    status: res.status, 
    count: data.meta?.pagination?.count,
    dates: data.data?.map((s: any) => s.attributes.start_date),
    first: data.data?.[0]
  })
}
