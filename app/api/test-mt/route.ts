import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/users/41041`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const data = await res.json()
  return NextResponse.json({ status: res.status, data })
}