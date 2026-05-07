import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/membership_instances?per_page=3`,
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
    first: data.data?.[0]
  })
}