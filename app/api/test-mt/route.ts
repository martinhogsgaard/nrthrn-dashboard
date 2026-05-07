import { NextResponse } from 'next/server'

export async function GET() {
  // Hent alle sider
  let allProfiles: any[] = []
  for (let page = 1; page <= 7; page++) {
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/employee_public_profiles?per_page=10&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    )
    const data = await res.json()
    allProfiles = [...allProfiles, ...(data.data || [])]
  }

  const names = allProfiles.map((p: any) => p.attributes.schedule_display_name)
  return NextResponse.json({ total: allProfiles.length, names })
}