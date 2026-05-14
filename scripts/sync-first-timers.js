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

  // Hent eksisterende user_ids for denne lokation
  const { data: existing } = await supabase
    .from('first_timers')
    .select('user_id')
    .eq('location_id', locationId)
  const existingIds = new Set((existing || []).map(r => r.user_id))
  console.log(`  ${existingIds.size} kendte i forvejen`)

  // Trin 1: Hent alle sessions for lokation + periode
  let page = 1
  let totalPages = 1
  const allSessions = []

  while (page <= totalPages) {
    process.stdout.write(`\r  Henter sessions side ${page}/${totalPages}...`)
    const data = await fetchJSON(
      `${MT_BASE}/class_sessions?location=${locationId}&min_date=${start}&max_date=${end}&per_page=100&page=${page}`
    )
    if (!data.data) { console.log('\n  ⚠️  Fejl:', JSON.stringify(data).slice(0, 200)); break }
    totalPages = data.meta?.pagination?.pages || 1
    for (const s of data.data) {
      allSessions.push({
        id: s.id,
        date: s.attributes.start_date,
        classType: s.attributes.class_type_display,
      })
    }
    page++
  }

  console.log(`\n  ${allSessions.length} sessions i alt`)

  // Trin 2: Hent reservationer per session, find first timers via completed_class_count = 1
  const toInsert = []

  for (let i = 0; i < allSessions.length; i++) {
    const session = allSessions[i]
    process.stdout.write(`\r  Gennemgår session ${i + 1}/${allSessions.length} — ${toInsert.length} first timers fundet...`)

    const data = await fetchJSON(
      `${MT_BASE}/reservations?class_session=${session.id}reservations?class_session=${session.id}&status=checked_instatus=check+in&per_page=100&include=user`
    )
    if (!data.data) continue

    for (const r of data.data) {
      const userId = r.relationships?.user?.data?.id
      if (!userId || userId === '53027') continue
      if (existingIds.has(userId)) continue

      // Find user fra included
      const user = data.included?.find(i => i.type === 'users' && i.id === userId)
      const completedCount = user?.attributes?.completed_class_count

      // First timer = præcis 1 completed class (dette besøg)
      if (completedCount !== 1) continue

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

  console.log(`\n  ${toInsert.length} first timers fundet`)

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