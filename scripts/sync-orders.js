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

async function main() {
  const start = process.argv[2] || '2026-06-01'
  const end = process.argv[3] || new Date().toISOString().split('T')[0]
  console.log(`🔄 Orders sync: ${start} → ${end}\n`)

  const allOrders = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages && page <= 500) {
    let data = null

    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await fetch(
          `${MT_BASE}/orders?min_datetime=${start}T00:00:00Z&page=${page}`,
          { headers: AUTH }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        if (!text) throw new Error('Tomt svar')
        data = JSON.parse(text)
        break
      } catch (err) {
        if (attempt === 4) throw new Error(`Side ${page}: ${err.message}`)
        console.log(`  ⚠️  side ${page} fejl (${err.message}) — venter ${attempt * 2}s`)
        await sleep(attempt * 2000)
      }
    }

    if (!data?.data?.length) break
    allOrders.push(...data.data)

    totalPages = data.meta?.pagination?.pages || 1
    if (page % 25 === 0) console.log(`  side ${page}/${totalPages} — ${allOrders.length} ordrer`)

    page++
    await sleep(150)
  }

  console.log(`\n📦 ${allOrders.length} orders hentet fra MT`)

  const filtered = allOrders.filter(o =>
    ['Completed', 'Refunded', 'Partially Refunded'].includes(o.attributes.status) &&
    o.attributes.date_placed >= start + 'T00:00:00Z' &&
    o.attributes.date_placed <= end + 'T23:59:59Z'
  )
  console.log(`  ${filtered.length} orders i perioden`)

  const toUpsert = filtered.map(o => ({
    id: o.id,
    order_number: o.attributes.number,
    date_placed: o.attributes.date_placed,
    location: o.attributes.location,
    location_id: o.attributes.location === 'Copenhagen' ? '48718'
               : o.attributes.location === 'Flatiron' ? '48717' : null,
    status: o.attributes.status,
    total: Number(o.attributes.total) - Number(o.attributes.total_amount_refunded ?? 0),
    net_total: o.attributes.net_total,
    total_refunded: o.attributes.total_amount_refunded ?? 0,
    contains_refund: o.attributes.contains_refund ?? false,
    summary: o.attributes.summary?.join(', ') || null,
    updated_at: new Date().toISOString(),
  }))

  let inserted = 0
  for (let i = 0; i < toUpsert.length; i += 500) {
    const chunk = toUpsert.slice(i, i + 500)
    const { error } = await supabase.from('orders_cache').upsert(chunk, { onConflict: 'id' })
    if (error) console.log('⚠️  Fejl:', error.message)
    else inserted += chunk.length
  }
  console.log(`\n✅ ${inserted} orders gemt i orders_cache`)

  const cph = toUpsert.filter(o => o.location_id === '48718')
  const nyc = toUpsert.filter(o => o.location_id === '48717')
  const cphTotal = cph.reduce((s, o) => s + Number(o.total), 0)
  const nycTotal = nyc.reduce((s, o) => s + Number(o.total), 0)

  console.log(`\n📊 Fordeling:`)
  console.log(`   København: ${cph.length} orders — ${cphTotal.toFixed(2)} DKK`)
  console.log(`   New York:  ${nyc.length} orders — ${nycTotal.toFixed(2)}`)
  console.log(`\n🎯 Mål (MT): 1512 orders — 493657.82 DKK`)

  const fs = require('fs')
  const csv = ['order_number,total,summary,status']
  cph.forEach(o => csv.push(`${o.order_number},${o.total},"${(o.summary || '').replace(/"/g, '""')}",${o.status}`))
  fs.writeFileSync('cph-orders.csv', csv.join('\n'))
  console.log(`\n📄 Skrevet til cph-orders.csv (${cph.length} rækker)`)
}

main().catch(e => { console.error('FEJL:', e.message); process.exit(1) })