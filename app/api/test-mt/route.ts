import { NextResponse } from 'next/server'

export async function GET() {
  // Hent Lauren Thomsen's abonnementer (user ID 40996 som vi fandt tidligere)
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/users/40996/memberships`,
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