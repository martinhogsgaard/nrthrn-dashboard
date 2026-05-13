import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/orders?min_datetime=${start}&per_page=3`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()
  return NextResponse.json({ 
    status: res.status, 
    count: data.meta?.pagination?.count,
    first: data.data?.[0]
  })
}