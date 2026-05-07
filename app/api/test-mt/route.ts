import { NextResponse } from 'next/server'

export async function GET() {
  // Hent user med included relationships
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/users/40996?include=memberships`,
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