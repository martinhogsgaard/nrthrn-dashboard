require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const MT_BASE = 'https://nrthrnstrong.marianatek.com/api'
const AUTH = { 'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`, 'Content-Type': 'application/json' }

const LOCATIONS = [
  { id: '48718', name: 'København' },
  { id: '48717', name: 'New York' },
]

async function fetchJSON(url) {
  const res = await fetch(url, { headers: AUTH })
  return res.json()
}

async function syncLocation(locationId, locationName, start, end) {
  console.log(`\n📍 ${locationName} (${locationId})`)

  // Hent alle eksisterende keys for denne lokation
  const { data: existing } = await supabase
    .from('first_timers')
    .select('user_id')
    .eq('location_id', locationId)
  const existingIds = new Set((existing || []).map(r => r.user_id))
  console.log(`  ${existingIds.size} kendte i forvejen`)

  // Trin 1: Hent alle sessions for lokation + periode
  let page = 1
  let totalPages = 1
  const sessionsWithFirstTimers = []

  while (page <= totalPages) {
    process.stdout.write(`\r  Henter sessions side ${page}/${totalPages}...`)
    const data = await fetchJSON(
      `${MT_BASE}/class_sessions?location=${locationId}&min_date=${start}&max_date=${end}&per_page=100&page=${page}`
    )
    if (!data.data) { console.log('\n  ⚠️  Fejl sessions:', JSON.stringify(data).slice(0, 200)); break }
    totalPages = data.meta?.pagination?.pages || 1

    for (const s of data.data) {
      if ((s.attributes.first_time_user_count || 0) > 0) {
        sessionsWithFirstTimers.push({
          id: s.id,
          date: s.attributes.start_date,
          classType: s.attributes.class_type_display,
        })
      }
    }
    page++
  }

  console.log(`\n  ${sessionsWithFirstTimers.length} sessions med first timers`)

  // Trin 2: Hent reservationer for hver session med first timers
  const toInsert = []

  for (let i = 0; i < sessionsWithFirstTimers.length; i++) {
    const session = sessionsWithFirstTimers[i]
    process.stdout.write(`\r  Henter reservationer ${i + 1}/${sessionsWithFirstTimers.length}...`)

    const data = await fetchJSON(
      `${MT_BASE}/reservations?tag=first-timer&class_session=${session.id}&per_page=100`
    )
    if (!data.data) continue

    for (const r of data.data) {
      const userId = r.relationships?.user?.data?.id
      if (!userId || userId === '53027') continue
      if (existingIds.has(userId)) continue

      toInsert.push({
        source: 'mariana_tek',
        user_id: userId,
        first_visit_date: session.date,
        session_id: session.id,
        class_type: session.classType,
        location_id: locationId,
      })
      existingIds.add(userId)
    }
  }

  console.log(`\n  ${toInsert.length} nye at indsætte`)

  // Trin 3: Batch insert
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500)
    const { error } = await supabase.from('first_timers').insert(chunk)
    if (error) console.log('  ⚠️  Insert fejl:', error.message)
    else inserted += chunk.length
  }

  console.log(`  ✓ ${inserted} gemt`)
  return inserted
}

async function main() {
  const start = process.argv[2] || '2026-05-01'
  const end   = process.argv[3] || new Date().toISOString().split('T')[0]

  console.log(`🔄 First timers sync: ${start} → ${end}`)

  let total = 0
  for (const loc of LOCATIONS) {
    total += await syncLocation(loc.id, loc.name, start, end)
  }

  console.log(`\n✅ Færdig! ${total} nye gemt`)

  const { count: cph } = await supabase.from('first_timers').select('*', { count: 'exact', head: true }).eq('location_id', '48718')
  const { count: nyc } = await supabase.from('first_timers').select('*', { count: 'exact', head: true }).eq('location_id', '48717')
  console.log(`\n📊 Total i database:`)
  console.log(`   København: ${cph}`)
  console.log(`   New York:  ${nyc}`)
}

main().catch(console.error)