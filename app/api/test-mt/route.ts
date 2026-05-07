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
  
  // Vis alle employees med deres turfs
  const employees = data.data?.map((e: any) => ({
    employee_id: e.id,
    profile_id: e.relationships.public_profile?.data?.id,
    turfs: e.relationships.turfs?.data
  }))
  
  return NextResponse.json({ 
    total: data.meta?.pagination?.count,
    employees
  })
}