require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const location = process.argv[2] || 'nyc'
const isCPH = location === 'cph'

const PARTNER_ID = isCPH ? process.env.ARKETA_CPH_PARTNER_ID : process.env.ARKETA_PARTNER_ID
const API_KEY = isCPH ? process.env.ARKETA_CPH_API_KEY : process.env.ARKETA_API_KEY
const LOCATION_ID = isCPH ? '48718' : '48717'

const BASE = 'https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0/' + PARTNER_ID
const AUTH = { 'Authorization': 'Bearer ' + API_KEY }

console.log(`🏋️  Arketa sync — ${isCPH ? 'København (CPH)' : 'New York (NYC)'}`)

async function fetchAll(path) {
  let items = [], cursor = null, page = 1
  while (true) {
    const sep = path.includes('?') ? '&' : '?'
    const url = BASE + path + sep + 'limit=100' + (cursor ? '&start_after=' + cursor : '')
    const data = await fetch(url, { headers: AUTH }).then(r => r.json())
    if (!data.items || data.items.length === 0) break
    items = [...items, ...data.items]
    process.stdout.write('\r  Side ' + page + ' - ' + items.length + ' hentet...')
    if (!data.pagination || !data.pagination.hasMore) break
    cursor = data.pagination.nextStartAfterId
    page++
  }
  console.log('')
  return items
}

async function upsertBatch(table, items) {
  for (let i = 0; i < items.length; i += 500) {
    const batch = items.slice(i, i + 500)
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' })
    if (error) console.log('⚠️  Fejl: ' + error.message)
  }
}

async function main() {
  // Klienter
  console.log('\n👥 Henter klienter...')
  const clients = await fetchAll('/clients')
  console.log(`   ${clients.length} klienter hentet`)
  await upsertBatch('arketa_clients', clients.map(c => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    phone: c.phone,
    date_of_birth: c.date_of_birth ? new Date(c.date_of_birth).toISOString().split('T')[0] : null,
    gender: c.gender,
    removed: c.removed || false,
    created_at: c.created_at,
    location_id: LOCATION_ID,
  })))
  console.log(`   ✅ Klienter gemt`)

  // Køb
  console.log('\n🛒 Henter køb...')
  const purchases = await fetchAll('/purchases')
  console.log(`   ${purchases.length} køb hentet`)
  await upsertBatch('arketa_purchases', purchases.map(p => ({
    id: p.id,
    client_id: p.client_id,
    offering_id: p.offering_id,
    name: p.name,
    type: p.type,
    status: p.status,
    price: p.price,
    start_date: p.start_date,
    end_date: p.end_date,
    remaining_uses: p.remaining_uses,
    location_id: LOCATION_ID,
  })))
  console.log(`   ✅ Køb gemt`)

  console.log('\n✅ Færdig!')
}

main().catch(console.error)