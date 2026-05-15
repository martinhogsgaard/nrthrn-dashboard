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

const MT_BASE = 'https://nrthrnstrong.marianatek.com/api'

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const yesterday = getYesterday()
  const now = new Date()

  // Sessions: hele måneden inkl. fremtidige hold
  const sessionStart = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const sessionEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Orders: altid kun til og med i går — aldrig fremtidige
  const ordersStart = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const ordersEnd = yesterday

  const results: any = {}

  // 1. Sync instruktører
  try {
    let allProfiles: any[] = []
    for (let page = 1; page <= 7; page++) {
      const res = await fetch(`${MT_BASE}/employee_public_profiles?per_page=10&page=${page}`, { headers: MT_HEADERS })
      const data = await res.json()
      allProfiles = [...allProfiles, ...(data.data || [])]
    }

    const instructorsToUpsert = await Promise.all(
      allProfiles.map(async (p) => {
        const userId = p.relationships?.employee?.data?.id
          ? (await fetch(`${MT_BASE}/employees/${p.relationships.employee.data.id}`, { headers: MT_HEADERS }).then(r => r.json()))?.data?.relationships?.user?.data?.id
          : null
        if (!userId) return null

        const userRes = await fetch(`${MT_BASE}/users/${userId}`, { headers: MT_HEADERS })
        const userData = await userRes.json()
        const u = userData.data?.attributes
        const firstName = u?.first_name || ''
        const lastName = u?.last_name || ''
        const homeLocationId = userData.data?.relationships?.home_location?.data?.id
        const { data: locationData } = await supabase.from('locations').select('id').eq('mariana_tek_location_id', homeLocationId).single()

        return {
          mariana_tek_id: p.relationships?.employee?.data?.id,
          mariana_tek_profile_id: p.id,
          name: `${firstName} ${lastName}`.trim() || 'Ukendt',
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

  // 2. Sync sessions — hele måneden inkl. fremtidige
  try {
    let allSessions: any[] = []
    let page = 1

    while (true) {
      const res = await fetch(
        `${MT_BASE}/class_sessions?min_date=${sessionStart}&max_date=${sessionEnd}&location=48718&per_page=100&page=${page}`,
        { headers: MT_HEADERS }
      )
      const data = await res.json()
      if (!data.data?.length) break
      allSessions = [...allSessions, ...data.data]
      if (data.meta?.pagination?.pages <= page) break
      page++
    }

    const sessionsToUpsert = allSessions.map((s: any) => {
      const startDT = new Date(s.attributes.start_datetime)
      const time = startDT.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' })
      return {
        id: s.id,
        date: s.attributes.start_date,
        time,
        class_type: s.attributes.class_type_display,
        instructor_name: s.attributes.instructor_names?.[0] || '',
        instructor_profile_id: s.relationships?.employee_public_profiles?.data?.[0]?.id || null,
        capacity: s.attributes.capacity || 0,
        participants: s.attributes.standard_reservation_user_count || 0,
        is_cancelled: s.attributes.cancellation_datetime !== null,
        cancellation_datetime: s.attributes.cancellation_datetime || null,
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
        `${MT_BASE}/membership_instances?status=active&purchase_location=48718&per_page=100&page=${page}`,
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

  // 4. Sync orders — altid kun til og med i går
  try {
    let allOrders: any[] = []
    let page = 1

    while (page <= 20) {
      const res = await fetch(
        `${MT_BASE}/orders?min_datetime=${ordersStart}&per_page=100&page=${page}`,
        { headers: MT_HEADERS }
      )
      const data = await res.json()
      if (!data.data?.length) break
      allOrders = [...allOrders, ...data.data]
      if (data.meta?.pagination?.pages <= page) break
      page++
    }

    const ordersToUpsert = allOrders
      .filter(o =>
        o.attributes.status === 'Completed' &&
        o.attributes.total > 0 &&
        o.attributes.date_placed <= ordersEnd + 'T23:59:59Z'
      )
      .map((o: any) => ({
        id: o.id,
        date_placed: o.attributes.date_placed,
        location: o.attributes.location,
        location_id: o.attributes.location === 'Copenhagen' ? '48718' : o.attributes.location === 'Flatiron' ? '48717' : null,
        status: o.attributes.status,
        total: o.attributes.total,
        summary: o.attributes.summary?.[0] || null,
        updated_at: new Date().toISOString(),
      }))

    if (ordersToUpsert.length > 0) {
      const { error } = await supabase.from('orders_cache').upsert(ordersToUpsert, { onConflict: 'id' })
      results.orders = error ? `Fejl: ${error.message}` : `${ordersToUpsert.length} orders synkroniseret (til og med ${ordersEnd})`
    }
  } catch (e: any) {
    results.orders = `Fejl: ${e.message}`
  }

  return NextResponse.json({ success: true, ...results })
}