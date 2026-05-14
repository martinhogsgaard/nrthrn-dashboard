require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const MT_BASE = 'https://nrthrnstrong.marianatek.com/api'
const AUTH = { 'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`, 'Content-Type': 'application/json' }

const LOCATIONS = [
  { id: '48718', name: 'København' },
  { id: '48717', name: 'New York' },
]

async function syncLocation(locationId, locationName, start, end) {
  console.log(`\n📍 Synkroniserer ${locationName} (${locationId})...`)

  // Hent alle eksisterende user_ids for denne lokation i ét kald
  const { data: existing } = await supabase
    .from('first_timers')
    .select('user_id')
    .eq('location_id', locationId)

  const existingIds = new Set((existing || []).map(r => r.user_id))
  console.log(`  ${existingIds.size} kendte i forvejen`)

  let page = 1
  let totalPages = 1
  const toInsert = []

  // Hent alle sider fra MT
  while (page <= totalPages) {
    process.stdout.write(`\r  Henter side ${page}/${totalPages}...`)

    const res = await fetch(
      `${MT_BASE}/reservations?tag=first-timer&location=${locationId}&min_datetime=${start}T00:00:00Z&max_datetime=${end}T23:59:59Z&per_page=100&page=${page}&include=class_session`,
      { headers: AUTH }
    )
    const data = await res.json()

    if (!data.data) {
      console.log('\n  ⚠️  Fejl:', JSON.stringify(data).slice(0, 200))
      break
    }
    totalPages = data.meta?.pagination?.pages || 1

    for (const r of data.data) {
      const userId = r.relationships?.user?.data?.id
      const sessionId = r.relationships?.class_session?.data?.id

      if (!userId || userId === '53027') continue
      if (existingIds.has(userId)) continue

      const sessionData = data.included?.find((i) => i.type === 'class_sessions' && i.id === sessionId)
      const visitDate = sessionData?.attributes?.start_date || r.attributes.creation_date?.split('T')[0]
      const classType = sessionData?.attributes?.class_type_display || null

      toInsert.push({
        source: 'mariana_tek',
        user_id: userId,
        first_visit_date: visitDate,
        session_id: sessionId,
        class_type: classType,
        location_id: locationId,
      })

      // Tilføj til set så vi ikke dublerer inden for samme sync
      existingIds.add(userId)
    }

    page++
  }

  console.log(`\n  ${toInsert.length} nye at indsætte...`)

  // Batch insert i chunks af 500
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500)
    const { error } = await supabase.from('first_timers').insert(chunk)
    if (error) console.log('  ⚠️  Insert fejl:', error.message)
    else inserted += chunk.length
    process.stdout.write(`\r  Indsat ${inserted}/${toInsert.length}...`)
  }

  console.log(`\n  ✓ ${locationName}: ${inserted} nye first timers gemt.`)
  return inserted
}

async function main() {
  const start = process.argv[2] || '2026-05-01'
  const end = process.argv[3] || new Date().toISOString().split('T')[0]
  const locationArg = process.argv[4]

  console.log(`🔄 First timers sync: ${start} → ${end}`)

  const locationsToSync = locationArg
    ? LOCATIONS.filter(l => l.id === locationArg)
    : LOCATIONS

  if (locationsToSync.length === 0) {
    console.log('⚠️  Ukendt location ID:', locationArg)
    process.exit(1)
  }

  let totalNew = 0
  for (const loc of locationsToSync) {
    totalNew += await syncLocation(loc.id, loc.name, start, end)
  }

  console.log(`\n✅ Færdig! ${totalNew} nye first timers gemt.`)

  const { count: cphCount } = await supabase
    .from('first_timers')
    .select('*', { count: 'exact', head: true })
    .eq('location_id', '48718')

  const { count: nycCount } = await supabase
    .from('first_timers')
    .select('*', { count: 'exact', head: true })
    .eq('location_id', '48717')

  console.log(`\n📊 Total i database:`)
  console.log(`   København: ${cphCount}`)
  console.log(`   New York:  ${nycCount}`)
}

main().catch(console.error)