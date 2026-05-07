import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/employee_public_profiles?per_page=100`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const data = await res.json()
  const massimiliano = data.data?.filter((p: any) => 
    p.attributes.schedule_display_name?.toLowerCase().includes('mass')
  )
  return NextResponse.json({ massimiliano })
}