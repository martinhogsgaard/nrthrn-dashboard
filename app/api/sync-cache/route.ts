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
      `${MT_BASE}/membership_instances?purchase_location=${locationId}&page=${page}`,
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

// ─── Inkrementel orders-sync ──────────────────────────────────────────────────
// Design:
//   1. Find nyeste date_placed i cachen → cutoff = max(nyeste_i_cache, nu−14 dage)
//   2. Hent MT side for side med ordering=-date_placed (nyeste først)
//   3. Upsert hver side direkte → ingen akkumulering i hukommelsen
//   4. Stop når en ordre er ældre end cutoff
//
// Korrekt omsætning pr. ordre = total - total_amount_refunded
// (net_total fra MT er 0 for refunderede og credit-betalte — bruges ikke)
// ─────────────────────────────────────────────────────────────────────────────
const RELEVANT_STATUSES = new Set(['Completed', 'Refunded', 'Partially Refunded'])
const ORDERS_BATCH_SIZE = 10 // MT returnerer altid 10 — matcher sidestørrelse

function mapOrder(o: any) {
  const total = Number(o.attributes.total ?? 0)
  const totalRefunded = Number(o.attributes.total_amount_refunded ?? 0)
  return {
    id: o.id,
    order_number: o.attributes.number,
    date_placed: o.attributes.date_placed,
    location: o.attributes.location,
    location_id:
      o.attributes.location === 'Copenhagen' ? '48718'
      : o.attributes.location === 'Flatiron' ? '48717'
      : null,
    status: o.attributes.status,
    total: total,
    net_total: total - totalRefunded,   // Korrekt omsætning
    total_refunded: totalRefunded,
    contains_refund: o.attributes.contains_refund ?? false,
    summary: Array.isArray(o.attributes.summary)
      ? o.attributes.summary.join(', ')
      : (o.attributes.summary || null),
    updated_at: new Date().toISOString(),
  }
}

async function syncOrdersIncremental(): Promise<{
  pages: number
  upserted: number
  skipped: number
  cutoff: string
  stopped_at: string | null
}> {
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

  // 1. Find cutoff: nyeste i cache, men aldrig mere end 14 dage tilbage
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const { data: latestRow, error: latestErr } = await supabase
    .from('orders_cache')
    .select('date_placed')
    .order('date_placed', { ascending: false })
    .limit(1)
    .single()

  if (latestErr && latestErr.code !== 'PGRST116') {
    // PGRST116 = no rows — ok for første kørsel
    throw new Error(`Cutoff-opslag fejlede: ${latestErr.message}`)
  }

  let cutoff: Date
  if (latestRow?.date_placed) {
    const latestInCache = new Date(latestRow.date_placed)
    // Tag det ældste af de to: enten 14 dage tilbage eller nyeste i cache
    // Dermed fanger vi altid sene refusioner inden for 14-dages vinduet
    cutoff = latestInCache < fourteenDaysAgo ? latestInCache : fourteenDaysAgo
  } else {
    // Første kørsel: ingen cache — sæt cutoff langt tilbage så alt hentes
    // I praksis kører man manuel fuld sync først, så dette er fallback
    cutoff = fourteenDaysAgo
  }

  const cutoffISO = cutoff.toISOString()
  console.log(`[orders] cutoff = ${cutoffISO}`)

  // 2. Side-for-side: nyeste først, upsert pr. side, stop ved cutoff
  let page = 1
  let upserted = 0
  let skipped = 0
  let stoppedAt: string | null = null
  let done = false

  while (!done && page <= 500) {
    // Retry-loop pr. side
    let data: any = null
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await fetch(
          `${MT_BASE}/orders?ordering=-date_placed&page=${page}`,
          { headers: MT_HEADERS }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        if (!text.trim()) throw new Error('Tomt svar')
        data = JSON.parse(text)
        break
      } catch (err: any) {
        if (attempt === 4) throw new Error(`Side ${page} fejlede efter 4 forsøg: ${err.message}`)
        const wait = attempt * 2000
        console.log(`[orders] side ${page} fejl (${err.message}) — venter ${wait}ms`)
        await sleep(wait)
      }
    }

    const rows: any[] = data?.data ?? []
    if (rows.length === 0) {
      console.log(`[orders] side ${page}: tomt svar — afslutter`)
      break
    }

    // Filtrer og upsert denne side direkte — ingen akkumulering
    const relevantRows = rows.filter(o => RELEVANT_STATUSES.has(o.attributes.status))
    const toUpsert = relevantRows.map(mapOrder)

    skipped += rows.length - toUpsert.length

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from('orders_cache')
        .upsert(toUpsert, { onConflict: 'id' })
      if (error) throw new Error(`Upsert side ${page}: ${error.message}`)
      upserted += toUpsert.length

      // Hent purchased_items for hver ordre og gem i order_lines_cache
      for (const row of relevantRows) {
        try {
          const res = await fetch(`${MT_BASE}/orders/${row.id}`, { headers: MT_HEADERS })
          if (!res.ok) continue
          const detail = await res.json()
          const purchasedItems = detail?.data?.attributes?.purchased_items || []
          if (purchasedItems.length === 0) continue

          const orderMapped = mapOrder(row)
          const lines = purchasedItems.map((item: any) => ({
            id: item.order_line_id,
            order_id: row.id,
            product_title: item.product_title,
            quantity: 1,
            unit_price: parseFloat(item.price) || 0,
            line_total: parseFloat(item.price_incl_tax) || 0,
            refunded: item.refunded || false,
            date_placed: row.attributes.date_placed,
            location: row.attributes.location,
            location_id: orderMapped.location_id,
            updated_at: new Date().toISOString(),
          }))

          await supabase.from('order_lines_cache').upsert(lines, { onConflict: 'id' })
          await sleep(150)
        } catch {
          // order_lines fejl stopper ikke sync
        }
      }
    }

    // Tjek om den ældste ordre på siden er ældre end cutoff
    // Siden er sorteret nyeste først — den sidste er den ældste
    const oldestOnPage = rows[rows.length - 1]
    const oldestDate = oldestOnPage?.attributes?.date_placed ?? ''
    if (oldestDate && oldestDate < cutoffISO) {
      stoppedAt = oldestDate
      console.log(`[orders] side ${page}: ældste ordre ${oldestDate} < cutoff ${cutoffISO} — stopper`)
      done = true
    }

    if (page % 10 === 0) {
      console.log(`[orders] side ${page} — upserted ${upserted}, skipped ${skipped}`)
    }

    page++
    await sleep(150) // Undgå MT rate-limit
  }

  return {
    pages: page - 1,
    upserted,
    skipped,
    cutoff: cutoffISO,
    stopped_at: stoppedAt,
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export const maxDuration = 300

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const yesterday = getYesterday()
  const now = new Date()

  const sessionStart = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const sessionEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

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

  // 2b. Sync class session types
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

  // 4. Inkrementel orders-sync
  try {
    const orderResult = await syncOrdersIncremental()
    results.orders = [
      `${orderResult.upserted} ordrer upserted`,
      `${orderResult.pages} sider hentet`,
      `cutoff: ${orderResult.cutoff.slice(0, 10)}`,
      orderResult.stopped_at ? `stoppede ved ${orderResult.stopped_at.slice(0, 10)}` : 'kørte til ende',
      orderResult.skipped > 0 ? `(${orderResult.skipped} skippet pga. status)` : '',
    ].filter(Boolean).join(' | ')
  } catch (e: any) {
    results.orders = `Fejl: ${e.message}`
  }

  // 5. MRR Snapshot — kør kun d. 1. i måneden, gem forrige måneds MRR
  try {
    const isFirstOfMonth = now.getDate() === 1
    if (isFirstOfMonth) {
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)
      const snapshotMonth = `${prevMonthStart.getFullYear()}-${String(prevMonthStart.getMonth() + 1).padStart(2, '0')}-01`

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