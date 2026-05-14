require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const MT_BASE = 'https://nrthrnstrong.marianatek.com/api'
const AUTH = { 'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`, 'Content-Type': 'application/json' }

// Lokationer der synkes — hver for sig
const LOCATIONS = [
  { id: '48718', name: 'København' },
  { id: '48717', name: 'New York' },
]

async function syncLocation(locationId, locationName, start, end) {
  console.log(`\n📍 Synkroniserer ${locationName} (${locationId})...`)

  let page = 1
  let totalPages = 1
  let newCount = 0
  let skipCount = 0

  while (page <= totalPages) {
    process.stdout.write(`\r  Side ${page}/${totalPages} — ${newCount} nye, ${skipCount} kendte...`)

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

      // Spring Bruce og ukendte brugere over
      if (!userId || userId === '53027') continue

      // Find session data fra included
      const sessionData = data.included?.find((i) => i.type === 'class_sessions' && i.id === sessionId)
      const visitDate = sessionData?.attributes?.start_date || r.attributes.creation_date?.split('T')[0]
      const classType = sessionData?.attributes?.class_type_display || null

      // Duplikat-tjek på user_id + location_id (samme person kan være first timer på begge lokationer)
      const { data: existing } = await supabase
        .from('first_timers')
        .select('id')
        .eq('user_id', userId)
        .eq('location_id', locationId)
        .maybeSingle()

      if (existing) { skipCount++; continue }

      const { error } = await supabase.from('first_timers').insert({
        source: 'mariana_tek',
        user_id: userId,
        first_visit_date: visitDate,
        session_id: sessionId,
        class_type: classType,
        location_id: locationId,
      })

      if (!error) newCount++
      else console.log('\n  ⚠️  Fejl ved insert:', error.message)
    }

    page++
  }

  console.log(`\n  ✓ ${locationName}: ${newCount} nye first timers gemt, ${skipCount} allerede kendte.`)
  return { newCount, skipCount }
}

async function main() {
  const start = process.argv[2] || '2024-01-01'
  const end = process.argv[3] || new Date().toISOString().split('T')[0]
  const locationArg = process.argv[4] // valgfrit: '48718' eller '48717'

  console.log(`🔄 First timers sync: ${start} → ${end}`)
  if (locationArg) console.log(`   Kun lokation: ${locationArg}`)

  const locationsToSync = locationArg
    ? LOCATIONS.filter(l => l.id === locationArg)
    : LOCATIONS

  if (locationsToSync.length === 0) {
    console.log('⚠️  Ukendt location ID:', locationArg)
    process.exit(1)
  }

  let totalNew = 0
  let totalSkip = 0

  for (const loc of locationsToSync) {
    const { newCount, skipCount } = await syncLocation(loc.id, loc.name, start, end)
    totalNew += newCount
    totalSkip += skipCount
  }

  console.log(`\n✅ Færdig! ${totalNew} nye first timers gemt, ${totalSkip} allerede kendte.`)

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