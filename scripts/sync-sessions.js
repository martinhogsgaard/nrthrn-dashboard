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

  const toUpsert = []

  for (let i = 0; i < allSessions.length; i++) {
    const s = allSessions[i]
    process.stdout.write(`\r  Beregner session ${i + 1}/${allSessions.length}...`)

    // Hent reservationer via class_session endpoint
    let sessionReservations = []
    let resPage = 1
    while (true) {
      const data = await fetchJSON(
        `${MT_BASE}/reservations?class_session=${s.id}&per_page=100&page=${resPage}`
      )
      if (!data.data?.length) break
      sessionReservations = [...sessionReservations, ...data.data]
      if (data.meta?.pagination?.pages <= resPage) break
      resPage++
    }

    let over30 = 0, under30 = 0, unknown = 0, bruceCount = 0

    for (const r of sessionReservations) {
      // Bruce spots — broker ID 53027
      if (r.relationships?.broker?.data?.id === '53027') {
        bruceCount++
        continue
      }
      // Kun checked in
      if (r.attributes?.status !== 'check in') continue

      const userId = r.relationships?.user?.data?.id
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

    // Debug print per session
    console.log(`\n  Session ${s.id}: ${s.attributes.class_type_display} — reservationer=${sessionReservations.length}, bruce=${bruceCount}, over30=${over30}, under30=${under30}`)

    toUpsert.push({
      id: s.id,
      participants_over_30: over30,
      participants_under_30: under30,
      bruce_spots: bruceCount,
    })
  }

  console.log(`\n  Gemmer ${toUpsert.length} sessions...`)

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

  console.log(`  ✓ ${updated}/${toUpsert.length} opdateret`)
  console.log('\n✅ Færdig!')
}

main().catch(console.error)