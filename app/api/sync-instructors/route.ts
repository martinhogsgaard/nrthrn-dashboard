import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  // 1. Hent alle employees
  let allEmployees: any[] = []
  for (let page = 1; page <= 8; page++) {
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/employees?per_page=10&page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    if (!data.data?.length) break
    allEmployees = [...allEmployees, ...(data.data || [])]
  }

  // Filtrer system-brugere fra (ingen public profile)
  const realEmployees = allEmployees.filter(e => 
    e.relationships.public_profile?.data?.id
  )

  // 2. Hent user-data for hver instruktør
  const instructorsToUpsert = await Promise.all(
    realEmployees.map(async (e) => {
      const userId = e.relationships.user?.data?.id
      if (!userId) return null

      const userRes = await fetch(
        `https://nrthrnstrong.marianatek.com/api/users/${userId}`,
        { headers: MT_HEADERS }
      )
      const userData = await userRes.json()
      const u = userData.data?.attributes

      const firstName = u?.first_name || ''
      const lastName = u?.last_name || ''
      const fullName = `${firstName} ${lastName}`.trim()
      const initials = [firstName[0], lastName[0]]
        .filter(Boolean).join('').toUpperCase() || '??'

      return {
        mariana_tek_id: e.id,
        mariana_tek_profile_id: e.relationships.public_profile?.data?.id,
        name: fullName || 'Ukendt',
        initials,
        email: u?.email || null,
        birth_date: u?.birth_date || null,
        level: 'junior' as const,
        employment_type: 'employed' as const,
        is_active: e.attributes.is_active ?? true,
      }
    })
  )

  const validInstructors = instructorsToUpsert.filter(Boolean)

  // 3. Tilføj birth_date kolonne hvis den ikke findes
  const { error } = await supabase
    .from('instructors')
    .upsert(validInstructors, {
      onConflict: 'mariana_tek_id',
      ignoreDuplicates: false
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    synced: validInstructors.length,
    names: validInstructors.map(i => `${i?.name} (${i?.email || 'ingen email'})`)
  })
}