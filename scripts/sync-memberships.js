require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const MT_BASE = 'https://nrthrnstrong.marianatek.com/api'
const AUTH = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function syncLocation(locationId) {
  const all = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages && page <= 500) {
    let data = null
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await fetch(
          `${MT_BASE}/membership_instances?purchase_location=${locationId}&page=${page}`,
          { headers: AUTH }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        if (!text) throw new Error('Tomt svar')
        data = JSON.parse(text)
        break
      } catch (err) {
        if (attempt === 4) throw new Error(`Side ${page}: ${err.message}`)
        await sleep(attempt * 2000)
      }
    }
    if (!data?.data?.length) break
    all.push(...data.data)
    totalPages = data.meta?.pagination?.pages || 1
    page++
    await sleep(150)
  }

  const rows = all.map(t => ({
    id: t.id,
    membership_name: t.attributes.membership_name,
    renewal_rate: parseFloat(t.attributes.renewal_rate) || 0,
    age_group: t.attributes.membership_name?.includes('30+') ? 'over30'
             : t.attributes.membership_name?.includes('under 30') ? 'under30' : 'other',
    purchase_location_id: t.relationships?.purchase_location?.data?.id || locationId,
    next_charge_date: t.attributes.next_charge_date,
    status: t.attributes.status || 'unknown',
    updated_at: new Date().toISOString(),
  }))

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('membership_cache').upsert(rows.slice(i, i + 500), { onConflict: 'id' })
    if (error) { console.error('Supabase:', error.message); process.exit(1) }
  }

  // Vis status-fordeling
  const byStatus = {}
  rows.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1 })
  console.log(`\nLocation ${locationId}: ${rows.length} abonnementer`)
  Object.entries(byStatus).sort((a,b) => b[1]-a[1]).forEach(([s, c]) => console.log(`  ${s.padEnd(18)} ${c}`))
}

async function main() {
  console.log('🔄 Synker memberships...')
  await syncLocation('48718')  // CPH
  await syncLocation('48717')  // NYC
  console.log('\n✅ Færdig')
}

main().catch(e => { console.error('FEJL:', e.message); process.exit(1) })