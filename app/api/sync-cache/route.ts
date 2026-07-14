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

async function syncSessions(locationId: string, sessionStart: string, sessionEnd: string) {
  let allSessions: any[] = []
  let page = 1

  while (true) {
    const res = await fetch(
      `${MT_BASE}/class_sessions?min_date=${sessionStart}&max_date=${sessionEnd}&location=${locationId}&per_page=100&page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    if (!data.data?.length) break
    allSessions = [...allSessions, ...data.data]
    if (data.meta?.pagination?.pages <= page) break
    page++
  }

  const timeZone = locationId === '48718' ? 'Europe/Copenhagen' : 'America/New_York'

  const sessionsToUpsert = allSessions.map((s: any) => {
    const startDT = new Date(s.attributes.start_datetime)
    const time = startDT.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone })
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
      location_id: s.relationships?.location?.data?.id || locationId,
      updated_at: new Date().toISOString(),
    }
  })

  if (sessionsToUpsert.length > 0) {
    const { error } = await supabase.from('sessions_cache').upsert(sessionsToUpsert, { onConflict: 'id' })
    if (error) throw new Error(error.message)
  }

  return sessionsToUpsert.length
}

async function syncClassSessionTypes() {
  let allTypes: any[] = []
  let page = 1

  while (true) {
    const res = await fetch(
      `${MT_BASE}/class_session_types?page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    if (!data.data?.length) break
    allTypes = [...allTypes, ...data.data]
    if (data.meta?.pagination?.pages <= page) break
    page++
  }

  const typesToUpsert = allTypes.map((t: any) => ({
    id: t.id,
    name: t.attributes.name,
    duration: t.attributes.duration,
    is_real_class: t.attributes.description !== null,
    enabled: t.attributes.enabled,
    updated_at: new Date().toISOString(),
  }))

  if (typesToUpsert.length > 0) {
    const { error } = await supabase.from('class_session_types').upsert(typesToUpsert, { onConflict: 'id' })
    if (error) throw new Error(error.message)
  }

  return typesToUpsert.length
}

async function syncMemberships(locationId: string) {
  let allInstances: any[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(
      `${MT_BASE}/membership_instances?status=active&purchase_location=${locationId}&per_page=100&page=${page}`,
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
    purchase_location_id: t.relationships?.purchase_location?.data?.id || locationId,
    next_charge_date: t.attributes.next_charge_date,
    status: t.attributes.status || 'active',
    updated_at: new Date().toISOString(),
  }))

  if (membershipsToUpsert.length > 0) {
    const { error } = await supabase.from('membership_cache').upsert(membershipsToUpsert, { onConflict: 'id' })
    if (error) throw new Error(error.message)
  }

  return membershipsToUpsert.length
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const yesterday = getYesterday()
  const now = new Date()

  const sessionStart = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const sessionEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const ordersStart = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const ordersEnd = searchParams.get('end') || yesterday

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
      await supabase.from('employees').upsert(valid, { onConflict: 'mariana_tek_id', ignoreDuplicates: false })
    }
    results.instructors = `${valid.length} instruktører opdateret`
  } catch (e: any) {
    results.instructors = `Fejl: ${e.message}`
  }

  // 2. Sync sessions — CPH + NYC
  try {
    const cphCount = await syncSessions('48718', sessionStart, sessionEnd)
    const nycCount = await syncSessions('48717', sessionStart, sessionEnd)
    results.sessions = `${cphCount + nycCount} sessions synkroniseret (CPH: ${cphCount}, NYC: ${nycCount})`
  } catch (e: any) {
    results.sessions = `Fejl: ${e.message}`
  }

  // 2b. Sync class session types (til klassificering af rigtige hold vs. administrative bookinger)
  try {
    const count = await syncClassSessionTypes()
    results.class_session_types = `${count} class session types synkroniseret`
  } catch (e: any) {
    results.class_session_types = `Fejl: ${e.message}`
  }

  // 3. Sync memberships — CPH + NYC
  try {
    const cphCount = await syncMemberships('48718')
    const nycCount = await syncMemberships('48717')
    results.memberships = `${cphCount + nycCount} abonnementer synkroniseret (CPH: ${cphCount}, NYC: ${nycCount})`
  } catch (e: any) {
    results.memberships = `Fejl: ${e.message}`
  }

  // 3b. Snapshot membership breakdown — kører kun d. 1. i måneden
  try {
    const isFirstOfMonth = now.getDate() === 1
    if (isFirstOfMonth) {
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const snapshotMonth = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)
        .toISOString().split('T')[0]

      for (const locId of ['48718', '48717']) {
        const { data: memberships } = await supabase
          .from('membership_cache')
          .select('membership_name, renewal_rate, age_group, purchase_location_id')
          .eq('purchase_location_id', locId)
          .eq('status', 'active')

        if (!memberships) continue

        const grouped: Record<string, { count: number; mrr: number; renewal_rate: number; age_group: string }> = {}
        for (const m of memberships) {
          if (!grouped[m.membership_name]) {
            grouped[m.membership_name] = { count: 0, mrr: 0, renewal_rate: m.renewal_rate || 0, age_group: m.age_group || 'other' }
          }
          grouped[m.membership_name].count++
          grouped[m.membership_name].mrr += m.renewal_rate || 0
        }

        const snapshots = Object.entries(grouped).map(([name, d]) => ({
          month: snapshotMonth,
          location_id: locId,
          membership_name: name,
          count: d.count,
          mrr: Math.round(d.mrr),
          age_group: d.age_group,
          renewal_rate: d.renewal_rate,
        }))

        if (snapshots.length > 0) {
          await supabase.from('membership_snapshots').upsert(snapshots, { onConflict: 'month,location_id,membership_name' })
        }
      }
      results.membership_snapshot = `Breakdown snapshot gemt for ${snapshotMonth}`
    } else {
      results.membership_snapshot = `Springer over — kun d. 1. i måneden`
    }
  } catch (e: any) {
    results.membership_snapshot = `Fejl: ${e.message}`
  }

  // 4. Sync orders — begge lokationer, kun til og med i går
  try {
    let allOrders: any[] = []
    let page = 1
    let totalPages = 1

    while (page <= totalPages && page <= 500) {
      const res = await fetch(
        `${MT_BASE}/orders?min_datetime=${ordersStart}T00:00:00Z&max_datetime=${ordersEnd}T23:59:59Z&page=${page}`,
        { headers: MT_HEADERS }
      )
      const data = await res.json()
      if (!data.data?.length) break

      allOrders = [...allOrders, ...data.data]

      // MT dikterer selv sidestørrelsen — læs det faktiske sidetal fra meta
      totalPages = data.meta?.pagination?.pages ?? 1
      page++
    }

    console.log(`Orders: ${allOrders.length} hentet over ${page - 1} sider (MT meta: ${totalPages} sider)`)

    const ordersToUpsert = allOrders
      .filter(o =>
        (o.attributes.status === 'Completed' ||
         o.attributes.status === 'Refunded' ||
         o.attributes.status === 'Partially Refunded') &&
        o.attributes.date_placed <= ordersEnd + 'T23:59:59Z'
      )
      .map((o: any) => ({
        id: o.id,
        order_number: o.attributes.number,
        date_placed: o.attributes.date_placed,
        location: o.attributes.location,
        location_id: o.attributes.location === 'Copenhagen' ? '48718' : o.attributes.location === 'Flatiron' ? '48717' : null,
        status: o.attributes.status,
        // net_total = brutto minus refunderet. MT's egen nettoberegning.
        total: o.attributes.net_total,
        net_total: o.attributes.net_total,
        total_refunded: o.attributes.total_amount_refunded ?? 0,
        contains_refund: o.attributes.contains_refund ?? false,
        summary: o.attributes.summary?.join(', ') || null,
        updated_at: new Date().toISOString(),
      }))

    if (ordersToUpsert.length > 0) {
      const { error } = await supabase.from('orders_cache').upsert(ordersToUpsert, { onConflict: 'id' })
      results.orders = error ? `Fejl: ${error.message}` : `${ordersToUpsert.length} orders synkroniseret (til og med ${ordersEnd})`
    }
  } catch (e: any) {
    results.orders = `Fejl: ${e.message}`
  }

  // MRR Snapshot — kør kun d. 1. i måneden, gem forrige måneds MRR
  try {
    const isFirstOfMonth = now.getDate() === 1
    if (isFirstOfMonth) {
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)
      const snapshotMonth = `${prevMonthStart.getFullYear()}-${String(prevMonthStart.getMonth() + 1).padStart(2, '0')}-01`

      // Hent alle aktive abonnementer der havde next_charge_date i forrige måned
      const { data: snapshotMemberships } = await supabase
        .from('membership_cache')
        .select('renewal_rate, status')
        .eq('status', 'active')
        .eq('purchase_location_id', '48718')

      if (snapshotMemberships) {
        const paying = snapshotMemberships.filter(m => (m.renewal_rate || 0) > 0)
        const mrr = Math.round(paying.reduce((s, m) => s + (m.renewal_rate || 0), 0))

        const { error } = await supabase
          .from('mrr_snapshots')
          .upsert({ month: snapshotMonth, mrr, member_count: snapshotMemberships.length, paying_count: paying.length }, { onConflict: 'month' })

        results.mrr_snapshot = error ? `Fejl: ${error.message}` : `Snapshot gemt for ${snapshotMonth}: ${mrr} kr.`
      }
    } else {
      results.mrr_snapshot = `Springer over — kun d. 1. i måneden (i dag er d. ${now.getDate()})`
    }
  } catch (e: any) {
    results.mrr_snapshot = `Fejl: ${e.message}`
  }

  return NextResponse.json({ success: true, ...results })
}