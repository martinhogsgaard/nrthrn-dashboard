require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const MT_BASE = 'https://nrthrnstrong.marianatek.com/api'
const AUTH = { 'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`, 'Content-Type': 'application/json' }

async function main() {
  const start = process.argv[2] || '2026-05-01'
  const end = process.argv[3] || new Date().toISOString().split('T')[0]

  console.log(`🔄 Orders sync: ${start} → ${end}`)

  let allOrders = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    process.stdout.write(`\r  Henter side ${page}/${totalPages}...`)
    const res = await fetch(
      `${MT_BASE}/orders?min_datetime=${start}&per_page=100&page=${page}`,
      { headers: AUTH }
    )
    const data = await res.json()
    if (!data.data?.length) break
    totalPages = data.meta?.pagination?.pages || 1
    allOrders = [...allOrders, ...data.data]
    page++
  }

  console.log(`\n📦 ${allOrders.length} orders hentet fra MT`)

  // Filtrer på date_placed og kun completed
  const filtered = allOrders.filter(o =>
    o.attributes.status === 'Completed' &&
    o.attributes.total > 0 &&
    o.attributes.date_placed >= start &&
    o.attributes.date_placed <= end + 'T23:59:59Z'
  )

  console.log(`  ${filtered.length} completed orders i perioden`)

  const toUpsert = filtered.map(o => ({
    id: o.id,
    date_placed: o.attributes.date_placed,
    location: o.attributes.location,
    location_id: o.attributes.location === 'Copenhagen' ? '48718' : o.attributes.location === 'Flatiron' ? '48717' : null,
    status: o.attributes.status,
    total: o.attributes.total,
    summary: o.attributes.summary?.[0] || null,
    updated_at: new Date().toISOString(),
  }))

  // Batch upsert
  let inserted = 0
  for (let i = 0; i < toUpsert.length; i += 500) {
    const chunk = toUpsert.slice(i, i + 500)
    const { error } = await supabase.from('orders_cache').upsert(chunk, { onConflict: 'id' })
    if (error) console.log('⚠️  Fejl:', error.message)
    else inserted += chunk.length
  }

  console.log(`\n✅ ${inserted} orders gemt i orders_cache`)

  // Vis fordeling
  const cph = toUpsert.filter(o => o.location_id === '48718')
  const nyc = toUpsert.filter(o => o.location_id === '48717')
  const cphTotal = Math.round(cph.reduce((s, o) => s + Number(o.total), 0))
  const nycTotal = Math.round(nyc.reduce((s, o) => s + Number(o.total), 0))
  console.log(`\n📊 Fordeling:`)
  console.log(`   København: ${cph.length} orders — ${cphTotal} DKK`)
  console.log(`   New York:  ${nyc.length} orders — ${nycTotal}`)
}

main().catch(console.error)