// scripts/backfill-order-lines.js
// Kør: node scripts/backfill-order-lines.js
// Henter purchased_items for alle ordrer i orders_cache og gemmer i order_lines_cache

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchWithRetry(url, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: MT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      if (!text.trim()) throw new Error('Tomt svar')
      return JSON.parse(text)
    } catch (err) {
      if (i === attempts) throw err
      const wait = i * 2000
      console.log(`  Fejl (${err.message}) — venter ${wait}ms`)
      await sleep(wait)
    }
  }
}

async function main() {
  // Hent alle ordrer fra cache
  const { data: orders, error } = await supabase
    .from('orders_cache')
    .select('id, date_placed, location, location_id')
    .order('date_placed', { ascending: false })

  if (error) throw new Error(`Supabase fejl: ${error.message}`)
  console.log(`Fandt ${orders.length} ordrer i cache`)

  // Tjek hvilke der allerede har lines
  const { data: existing } = await supabase
    .from('order_lines_cache')
    .select('order_id')
  
  const existingOrderIds = new Set((existing || []).map(r => r.order_id))
  const toProcess = orders.filter(o => !existingOrderIds.has(o.id))
  console.log(`${existingOrderIds.size} ordrer har allerede lines — ${toProcess.length} mangler`)

  let processed = 0
  let failed = 0

  for (const order of toProcess) {
    try {
      const data = await fetchWithRetry(
        `https://nrthrnstrong.marianatek.com/api/orders/${order.id}`
      )

      const purchasedItems = data?.data?.attributes?.purchased_items || []
      
      if (purchasedItems.length === 0) {
        // Ingen purchased_items — brug summary som fallback
        processed++
        continue
      }

      const lines = purchasedItems.map(item => ({
        id: item.order_line_id,
        order_id: order.id,
        product_title: item.product_title,
        quantity: 1, // MT returnerer altid 1 per purchased_item
        unit_price: parseFloat(item.price) || 0,
        line_total: parseFloat(item.price_incl_tax) || 0,
        refunded: item.refunded || false,
        date_placed: order.date_placed,
        location: order.location,
        location_id: order.location_id,
        updated_at: new Date().toISOString(),
      }))

      const { error: upsertError } = await supabase
        .from('order_lines_cache')
        .upsert(lines, { onConflict: 'id' })

      if (upsertError) throw new Error(upsertError.message)

      processed++
      if (processed % 50 === 0) {
        console.log(`${processed}/${toProcess.length} ordrer behandlet...`)
      }
    } catch (err) {
      console.error(`Ordre ${order.id} fejlede: ${err.message}`)
      failed++
    }

    await sleep(150)
  }

  console.log(`\nFærdig: ${processed} behandlet, ${failed} fejlede`)
}

main().catch(console.error)