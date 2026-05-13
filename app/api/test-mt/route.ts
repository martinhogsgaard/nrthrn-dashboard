import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  // Find Bruce service user ID
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/users?search=bruce-integration-service`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()
  
  return NextResponse.json({
    count: data.meta?.pagination?.count,
    users: data.data?.slice(0,5).map((u: any) => ({
      id: u.id,
      name: u.attributes.full_name,
      email: u.attributes.email,
    }))
  })
}