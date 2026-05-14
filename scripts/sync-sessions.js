require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const MT_BASE = 'https://nrthrnstrong.marianatek.com/api'
const AUTH = { 'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`, 'Content-Type': 'application/json' }

async function fetchJSON(url) {
  const res = await fetch(url, { headers: AUTH })
  return res.json()
}

async function main() {
  const start = process.argv[2] || new Date().toISOString().split('T')[0]
  const end   = process.argv[3] || new Date().toISOString().split('T')[0]

  console.log(`🔄 Session sync: ${start} → ${end}`)

  // Hent alle members med is_over_30 i ét kald
  const { data: allMembers } = await supabase
    .from('members')
    .select('mariana_tek_user_id, is_over_30')
    .not('is_over_30', 'is', null)

  const over30Set = new Set(allMembers?.filter(m => m.is_over_30 === true).map(m => m.mariana_tek_user_id) || [])
  const under30Set = new Set(allMembers?.filter(m => m.is_over_30 === false).map(m => m.mariana_tek_user_id) || [])
  console.log(`👥 ${over30Set.size} over 30, ${under30Set.size} under 30 i members`)

  // Hent alle sessions for perioden
  let page = 1, totalPages = 1
  const allSessions = []

  while (page <= totalPages) {
    process.stdout.write(`\r  Henter sessions side ${page}/${totalPages}...`)
    const data = await fetchJSON(
      `${MT_BASE}/class_sessions?location=48718&min_date=${start}&max_date=${end}&per_page=100&page=${page}`
    )
    if (!data.data) { console.log('\n⚠️  Fejl:', JSON.stringify(data).slice(0, 200)); break }
    totalPages = data.meta?.pagination?.pages || 1
    allSessions.push(...data.data)
    page++
  }

  console.log(`\n📅 ${allSessions.length} sessions fundet`)

  // Beregn over/under 30 per session
  const toUpsert = []

  for (let i = 0; i < allSessions.length; i++) {
    const s = allSessions[i]
    process.stdout.write(`\r  Beregner session ${i + 1}/${allSessions.length}...`)

    const reservationIds = s.relationships?.reservations?.data?.map(r => r.id) || []
    if (reservationIds.length === 0) {
      toUpsert.push({
        id: s.id,
        participants_over_30: 0,
        participants_under_30: 0,
        bruce_spots: 0,
      })
      continue
    }

    // Hent alle reservationer for sessionen parallelt
    const reservations = await Promise.all(
      reservationIds.map(id =>
        fetchJSON(`${MT_BASE}/reservations/${id}`).catch(() => null)
      )
    )

    let over30 = 0, under30 = 0, unknown = 0, bruceCount = 0

    for (const r of reservations) {
      if (!r?.data) continue

      // Bruce spots
      if (r.data.relationships?.broker?.data?.id === '53027') {
        bruceCount++
        continue
      }

      // Spring over hvis ikke checked in
      if (r.data.attributes?.status !== 'check in') continue

      const userId = r.data.relationships?.user?.data?.id
      if (!userId) continue

      if (over30Set.has(userId)) over30++
      else if (under30Set.has(userId)) under30++
      else unknown++
    }

    // Fordel ukendte proportionalt
    if (unknown > 0 && (over30 + under30) > 0) {
      const ratio = over30 / (over30 + under30)
      over30 += Math.round(unknown * ratio)
      under30 += unknown - Math.round(unknown * ratio)
    } else if (unknown > 0) {
      over30 += Math.round(unknown * 0.5)
      under30 += unknown - Math.round(unknown * 0.5)
    }

    toUpsert.push({
      id: s.id,
      participants_over_30: over30,
      participants_under_30: under30,
      bruce_spots: bruceCount,
    })
  }

  console.log(`\n  Gemmer ${toUpsert.length} sessions...`)

  // Update kun de tre kolonner — undgå not-null fejl på date etc.
  let updated = 0
  for (const row of toUpsert) {
    const { error } = await supabase
      .from('sessions_cache')
      .update({
        participants_over_30: row.participants_over_30,
        participants_under_30: row.participants_under_30,
        bruce_spots: row.bruce_spots,
      })
      .eq('id', row.id)
    if (error) console.log(`⚠️  Fejl session ${row.id}:`, error.message)
    else updated++
  }
  console.log(`  ${updated}/${toUpsert.length} opdateret`)

  // Vis resultat
  const sample = toUpsert.slice(0, 5)
  console.log('\n📊 Eksempel:')
  sample.forEach(s => console.log(`   Session ${s.id}: over30=${s.participants_over_30}, under30=${s.participants_under_30}, bruce=${s.bruce_spots}`))

  console.log('\n✅ Færdig!')
}

main().catch(console.error)