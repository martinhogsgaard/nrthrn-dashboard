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

function calcIsOver30(birthDate: string | null): boolean | null {
  if (!birthDate) return null
  const dob = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age >= 30
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start') || new Date().toISOString().split('T')[0]
  const end = searchParams.get('end') || new Date().toISOString().split('T')[0]

  // 1. Hent alle sessions for perioden
  let allSessions: any[] = []
  let page = 1
  while (true) {
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=${start}&max_date=${end}&location=48718&per_page=100&page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    if (!data.data?.length) break
    allSessions = [...allSessions, ...data.data]
    if (data.meta?.pagination?.pages <= page) break
    page++
  }

  // 2. Saml unikke reservation IDs
  const reservationIds = [...new Set(
    allSessions.flatMap((s: any) => 
      s.relationships?.reservations?.data?.map((r: any) => r.id) || []
    )
  )]

  // 3. Saml unikke user IDs via reservationer
  const processedUsers = new Set<string>()
  let synced = 0
  let skipped = 0
  let no_birthdate = 0

  for (const resId of reservationIds) {
    try {
      const resRes = await fetch(
        `https://nrthrnstrong.marianatek.com/api/reservations/${resId}`,
        { headers: MT_HEADERS }
      )
      const resData = await resRes.json()
      const userId = resData.data?.relationships?.user?.data?.id
      if (!userId || processedUsers.has(userId)) continue
      processedUsers.add(userId)

      // Tjek om vi allerede har fødselsdato i Supabase
      const { data: existing } = await supabase
        .from('members')
        .select('id, birth_date')
        .eq('mariana_tek_user_id', userId)
        .single()

      if (existing?.birth_date) {
        skipped++
        continue
      }

      // Hent bruger fra Mariana Tek
      const userRes = await fetch(
        `https://nrthrnstrong.marianatek.com/api/users/${userId}`,
        { headers: MT_HEADERS }
      )
      const userData = await userRes.json()
      const u = userData.data?.attributes

      if (!u?.birth_date) no_birthdate++

      await supabase.from('members').upsert({
        mariana_tek_user_id: userId,
        first_name: u?.first_name,
        last_name: u?.last_name,
        email: u?.email,
        birth_date: u?.birth_date || null,
        is_over_30: calcIsOver30(u?.birth_date),
        home_location_id: userData.data?.relationships?.home_location?.data?.id || null,
        is_active: true,
        joined_date: u?.date_joined ? u.date_joined.split('T')[0] : null,
      }, { onConflict: 'mariana_tek_user_id' })

      synced++
    } catch {
      // Skip fejl og fortsæt
    }
  }

  return NextResponse.json({
    period: { start, end },
    sessions: allSessions.length,
    reservations: reservationIds.length,
    unique_users: processedUsers.size,
    synced,
    skipped,
    no_birthdate,
  })
}