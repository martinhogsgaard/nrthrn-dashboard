import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/employee_public_profiles?per_page=100&location=48718`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const data = await res.json()
  const names = data.data?.map((p: any) => ({
    id: p.id,
    name: p.attributes.schedule_display_name,
    employee_id: p.relationships.employee?.data?.id
  }))
  return NextResponse.json({ count: data.meta?.pagination?.count, names })
}