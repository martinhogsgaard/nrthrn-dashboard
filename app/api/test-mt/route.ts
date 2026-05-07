import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/employees?per_page=100`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const data = await res.json()
  
  // Filtrer på dem der har location 48718 som turf
  const cphEmployees = data.data?.filter((e: any) => 
    e.relationships.turfs?.data?.some((t: any) => 
      t.type === 'locations' && t.id === '48718'
    )
  )
  
  return NextResponse.json({ 
    total: data.meta?.pagination?.count,
    cph_count: cphEmployees?.length,
    cph_employees: cphEmployees?.map((e: any) => ({
      employee_id: e.id,
      public_profile_id: e.relationships.public_profile?.data?.id
    }))
  })
}