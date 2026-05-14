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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start') || new Date().toISOString().split('T')[0]
  const end = searchParams.get('end') || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]

  const results: any = {}

  // 1. Sync instruktører — kun nye
  try {
    let allProfiles: any[] = []
    for (let page = 1; page <= 7; page++) {
      const res = await fetch(
        `https://nrthrnstrong.marianatek.com/api/employee_public_profiles?per_page=10&page=${page}`,
        { headers: MT_HEADERS }
      )
      const data = await res.json()
      allProfiles = [...allProfiles, ...(data.data || [])]
    }

    const instructorsToUpsert = await Promise.all(
      allProfiles.map(async (p) => {
        const userId = p.relationships?.employee?.data?.id
          ? (await fetch(`https://nrthrnstrong.marianatek.com/api/employees/${p.relationships.employee.data.id}`, { headers: MT_HEADERS }).then(r => r.json()))?.data?.relationships?.user?.data?.id
          : null
        if (!userId) return null

        const userRes = await fetch(`https://nrthrnstrong.marianatek.com/api/users/${userId}`, { headers: MT_HEADERS })
        const userData = await userRes.json()
        const u = userData.data?.attributes

        const firstName = u?.first_name || ''
        const lastName = u?.last_name || ''
        const fullName = `${firstName} ${lastName}`.trim()
        const homeLocationId = userData.data?.relationships?.home_location?.data?.id

        const { data: locationData } = await supabase
          .from('locations').select('id')
          .eq('mariana_tek_location_id', homeLocationId).single()

        return {
          mariana_tek_id: p.relationships?.employee?.data?.id,
          mariana_tek_profile_id: p.id,
          name: fullName || 'Ukendt',
          initials: [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase().slice(0, 2) || '??',
          email: u?.email || null,
          birth_date: u?.birth_date || null,
          location_id: locationData?.id || null,
          level: 'junior' as const,
          employment_type: 'employed' as const,
          is_active: p.attributes.enabled ?? true,
        }
      })
    )

    const valid = instructorsToUpsert.filter((i): i is NonNullable<typeof i> => i !== null)
    if (valid.length > 0) {
      await supabase.from('instructors').upsert(valid, { onConflict: 'mariana_tek_id', ignoreDuplicates: false })
    }
    results.instructors = `${valid.length} instruktører opdateret`
  } catch (e: any) {
    results.instructors = `Fejl: ${e.message}`
  }

  // 2. Sync sessions
  try {
    // Hent alle members med is_over_30 i ét kald — bruges til over/under 30 beregning
    const { data: allMembers } = await supabase
      .from('members')
      .select('mariana_tek_user_id, is_over_30')
      .not('is_over_30', 'is', null)

    const over30Set = new Set(
      allMembers?.filter(m => m.is_over_30 === true).map(m => m.mariana_tek_user_id) || []
    )
    const under30Set = new Set(
      allMembers?.filter(m => m.is_over_30 === false).map(m => m.mariana_tek_user_id) || []
    )

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

    // Tæl Bruce spots og over/under 30 for nylige sessions (sidste 7 dage)
    const sevenDaysAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const recentSessions = allSessions.filter(s => s.attributes.start_date >= sevenDaysAgo)

    const bruceSpotsBySession: Record<string, number> = {}
    const over30BySession: Record<string, number> = {}
    const under30BySession: Record<string, number> = {}

    for (const session of recentSessions) {
      const reservationIds = session.relationships?.reservations?.data?.map((r: any) => r.id) || []
      if (reservationIds.length === 0) continue

      const reservations = await Promise.all(
        reservationIds.map((id: string) =>
          fetch(`https://nrthrnstrong.marianatek.com/api/reservations/${id}?include=tags,credit_transactions`, { headers: MT_HEADERS })
            .then(r => r.json()).catch(() => null)
        )
      )

      let over30 = 0
      let under30 = 0
      let bruceCount = 0
      let unknownCount = 0

      for (const r of reservations) {
        if (!r?.data) continue

        // Bruce spots
        if (r.data.relationships?.broker?.data?.id === '53027') {
          bruceCount++
          continue
        }

        // Over/under 30
        const userId = r.data.relationships?.user?.data?.id
        if (!userId) continue

        if (over30Set.has(userId)) {
          over30++
        } else if (under30Set.has(userId)) {
          under30++
        } else {
          // Bruger ikke i members endnu — tæl som unknown
          unknownCount++
        }
      }

      // Fordel unknown proportionalt baseret på kendte tal
      if (unknownCount > 0 && (over30 + under30) > 0) {
        const ratio = over30 / (over30 + under30)
        over30 += Math.round(unknownCount * ratio)
        under30 += unknownCount - Math.round(unknownCount * ratio)
      } else if (unknownCount > 0) {
        // Ingen kendte — brug 50/50 som fallback
        over30 += Math.round(unknownCount * 0.5)
        under30 += unknownCount - Math.round(unknownCount * 0.5)
      }

      bruceSpotsBySession[session.id] = bruceCount
      over30BySession[session.id] = over30
      under30BySession[session.id] = under30
    }

    const sessionsToUpsert = allSessions.map((s: any) => {
      const startDT = new Date(s.attributes.start_datetime)
      const time = startDT.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' })
      const participants = s.attributes.standard_reservation_user_count || 0
      const isRecent = s.attributes.start_date >= sevenDaysAgo

      return {
        id: s.id,
        date: s.attributes.start_date,
        time,
        class_type: s.attributes.class_type_display,
        instructor_name: s.attributes.instructor_names?.[0] || '',
        instructor_profile_id: s.relationships?.employee_public_profiles?.data?.[0]?.id || null,
        capacity: s.attributes.capacity || 0,
        participants,
        participants_over_30: isRecent ? (over30BySession[s.id] ?? null) : null,
        participants_under_30: isRecent ? (under30BySession[s.id] ?? null) : null,
        bruce_spots: bruceSpotsBySession[s.id] || 0,
        location_id: s.relationships?.location?.data?.id || '48718',
        updated_at: new Date().toISOString(),
      }
    })

    if (sessionsToUpsert.length > 0) {
      const { error } = await supabase.from('sessions_cache').upsert(sessionsToUpsert, { onConflict: 'id' })
      results.sessions = error ? `Fejl: ${error.message}` : `${sessionsToUpsert.length} sessions synkroniseret`
    }
  } catch (e: any) {
    results.sessions = `Fejl: ${e.message}`
  }

  // 3. Sync memberships
  try {
    let allInstances: any[] = []
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const res = await fetch(
        `https://nrthrnstrong.marianatek.com/api/membership_instances?status=active&purchase_location=48718&per_page=100&page=${page}`,
        { headers: MT_HEADERS }
      )
      const data = await res.json()
      totalPages = data.meta?.pagination?.pages || 1
      allInstances = [...allInstances, ...(data.data || [])]
      if (page >= totalPages) break
      page++
    }

    const membershipsToUpsert = allInstances.map((t: any) => ({
      id: t.id,
      membership_name: t.attributes.membership_name,
      renewal_rate: parseFloat(t.attributes.renewal_rate) || 0,
      age_group: t.attributes.membership_name?.includes('30+') ? 'over30' : t.attributes.membership_name?.includes('under 30') ? 'under30' : 'other',
      purchase_location_id: t.relationships?.purchase_location?.data?.id || '48718',
      next_charge_date: t.attributes.next_charge_date,
      status: t.attributes.status || 'active',
      updated_at: new Date().toISOString(),
    }))

    if (membershipsToUpsert.length > 0) {
      const { error } = await supabase.from('membership_cache').upsert(membershipsToUpsert, { onConflict: 'id' })
      results.memberships = error ? `Fejl: ${error.message}` : `${membershipsToUpsert.length} abonnementer synkroniseret`
    }
  } catch (e: any) {
    results.memberships = `Fejl: ${e.message}`
  }

  // 4. Sync fødselsdatoer — kun nye brugere
  try {
    let allSessions2: any[] = []
    let page = 1
    while (true) {
      const res = await fetch(
        `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=${start}&max_date=${end}&location=48718&per_page=100&page=${page}`,
        { headers: MT_HEADERS }
      )
      const data = await res.json()
      if (!data.data?.length) break
      allSessions2 = [...allSessions2, ...data.data]
      if (data.meta?.pagination?.pages <= page) break
      page++
    }

    const reservationIds = [...new Set(
      allSessions2.flatMap((s: any) => s.relationships?.reservations?.data?.map((r: any) => r.id) || [])
    )]

    let synced = 0
    for (const resId of reservationIds) {
      try {
        const resRes = await fetch(`https://nrthrnstrong.marianatek.com/api/reservations/${resId}`, { headers: MT_HEADERS })
        const resData = await resRes.json()
        const userId = resData.data?.relationships?.user?.data?.id
        if (!userId) continue

        const { data: existing } = await supabase.from('members').select('id, birth_date').eq('mariana_tek_user_id', userId).single()
        if (existing?.birth_date) continue

        const userRes = await fetch(`https://nrthrnstrong.marianatek.com/api/users/${userId}`, { headers: MT_HEADERS })
        const userData = await userRes.json()
        const u = userData.data?.attributes

        const dob = u?.birth_date || null
        const isOver30 = dob ? (() => {
          const d = new Date(dob), t = new Date()
          let age = t.getFullYear() - d.getFullYear()
          const m = t.getMonth() - d.getMonth()
          if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--
          return age >= 30
        })() : null

        await supabase.from('members').upsert({
          mariana_tek_user_id: userId,
          first_name: u?.first_name, last_name: u?.last_name, email: u?.email,
          birth_date: dob, is_over_30: isOver30,
          home_location_id: userData.data?.relationships?.home_location?.data?.id || null,
          is_active: true,
          joined_date: u?.date_joined ? u.date_joined.split('T')[0] : null,
        }, { onConflict: 'mariana_tek_user_id' })
        synced++
      } catch { }
    }
    results.birthdays = `${synced} nye fødselsdatoer hentet`
  } catch (e: any) {
    results.birthdays = `Fejl: ${e.message}`
  }

  return NextResponse.json({ success: true, ...results })
}