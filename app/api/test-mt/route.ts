import { NextResponse } from 'next/server'

export async function GET() {
  // Hent alle profiler og find Massimiliano
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/employee_public_profiles?per_page=100&page=4`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const data = await res.json()
  const mass = data.data?.find((p: any) => 
    p.attributes.schedule_display_name === 'Massimiliano'
  )
  
  if (!mass) return NextResponse.json({ error: 'Not found', names: data.data?.map((p:any) => p.attributes.schedule_display_name) })
  
  // Hent employee data
  const empRes = await fetch(
    `https://nrthrnstrong.marianatek.com/api/employees/${mass.relationships.employee?.data?.id}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const empData = await empRes.json()
  return NextResponse.json({ profile: mass, employee: empData.data })
}