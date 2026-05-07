import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  // Hent alle profiler fra Mariana Tek
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

  // Filtrer system-brugere fra
  const systemNames = ['NRTHRN STRONG', 'service', 'NRTHRN Strong Internal', 'NRTHRN Strong WeProduct']
  const realProfiles = allProfiles.filter(p => {
    const name = p.attributes.schedule_display_name || ''
    return !systemNames.some(s => name.toLowerCase().includes(s.toLowerCase())) && name.length > 1
  })

  // Slet gamle dummy instruktører og upsert rigtige
  const instructorsToUpsert = realProfiles.map(p => ({
    mariana_tek_id: p.relationships.employee?.data?.id,
    mariana_tek_profile_id: p.id,
    name: p.attributes.schedule_display_name,
    initials: (p.attributes.schedule_display_name || '??')
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
    level: 'junior' as const,
    employment_type: 'employed' as const,
    is_active: p.attributes.enabled ?? true,
  }))

  const { data, error } = await supabase
    .from('instructors')
    .upsert(instructorsToUpsert, { 
      onConflict: 'mariana_tek_id',
      ignoreDuplicates: false 
    })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ 
    synced: instructorsToUpsert.length,
    names: instructorsToUpsert.map(i => i.name)
  })
}