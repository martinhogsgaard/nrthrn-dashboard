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

function isOver30(birthDate: string | null): boolean | null {
  if (!birthDate) return null
  const dob = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age >= 30
}

export async function GET() {
  let allMembers: any[] = []
  let page = 1
  let totalPages = 1

  // Hent alle aktive memberships
  while (page <= totalPages) {
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/memberships?status=active&per_page=100&page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    totalPages = data.meta?.pagination?.pages || 1
    allMembers = [...allMembers, ...(data.data || [])]
    if (page >= totalPages) break
    page++
  }

  // Hent user-data for hver member
  let synced = 0
  let errors = 0

  for (const membership of allMembers) {
    const userId = membership.relationships?.user?.data?.id
    if (!userId) continue

    try {
      // Tjek om vi allerede har dem i Supabase
      const { data: existing } = await supabase
        .from('members')
        .select('id, birth_date')
        .eq('mariana_tek_user_id', userId)
        .single()

      if (existing?.birth_date) {
        // Vi har allerede fødselsdato — skip
        synced++
        continue
      }

      // Hent fra Mariana Tek
      const userRes = await fetch(
        `https://nrthrnstrong.marianatek.com/api/users/${userId}`,
        { headers: MT_HEADERS }
      )
      const userData = await userRes.json()
      const u = userData.data?.attributes

      const memberData = {
        mariana_tek_user_id: userId,
        first_name: u?.first_name,
        last_name: u?.last_name,
        email: u?.email,
        birth_date: u?.birth_date || null,
        is_over_30: isOver30(u?.birth_date),
        home_location_id: userData.data?.relationships?.home_location?.data?.id || null,
        is_active: true,
        joined_date: u?.date_joined ? u.date_joined.split('T')[0] : null,
      }

      await supabase
        .from('members')
        .upsert(memberData, { onConflict: 'mariana_tek_user_id' })

      synced++
    } catch {
      errors++
    }
  }

  return NextResponse.json({
    total_memberships: allMembers.length,
    synced,
    errors,
    message: `${synced} medlemmer synkroniseret, ${errors} fejl`
  })
}