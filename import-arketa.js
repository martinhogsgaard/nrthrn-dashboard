require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim())
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map(line => {
    const values = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes
      else if (char === ',' && !inQuotes) { values.push(current); current = '' }
      else current += char
    }
    values.push(current)
    const obj = {}
    headers.forEach((h, i) => obj[h] = (values[i] || '').trim())
    return obj
  })
}

function parseDate(str) {
  if (!str || str.trim() === '') return null
  try {
    // Format: 2026-05-20 02:00:42 GMT+2
    return new Date(str.replace(' GMT+2', '+02:00')).toISOString()
  } catch { return null }
}

function parseMMDDYYYY(str) {
  if (!str) return null
  const [mm, dd, yyyy] = str.split('/')
  return `${yyyy}-${mm}-${dd}`
}

async function importFile(filepath, locationId) {
  const content = fs.readFileSync(filepath, 'utf-8').replace(/^\uFEFF/, '')
  const rows = parseCSV(content)
  console.log(`\n📂 ${filepath}: ${rows.length} rækker`)

  const toUpsert = rows.map((r, i) => ({
    id: r['Payment ID'] || `${locationId}-${i}-${r['Creation Date Only']}`,
    amount: parseFloat(r['Amount']) || 0,
    status: r['Status'],
    created_at: parseDate(r['Creation Date']),
    success_date: parseDate(r['Success Date']),
    refund_date: parseDate(r['Refund Date']),
    description: r['Description'],
    client_name: r['Client'],
    email: r['Email'],
    client_id: r['Client ID'],
    category: r['Category'],
    payment_id: r['Payment ID'],
    invoice_id: r['Invoice ID'],
    currency: r['Currency'] || 'DKK',
    total_refunded: parseFloat(r['Total Refunded']) || 0,
    net_sales: parseFloat(r['Net Sales']) || 0,
    seller: r['Seller'],
    stripe_fees: parseFloat(r['Estimated Stripe Fees']) || 0,
    pricing_option: r['Pricing Option'],
    location: r['Location'],
    location_id: locationId,
    source: r['Source'],
    amount_discounted: parseFloat(r['Amount Discounted']) || 0,
  })).filter(r => r.payment_id || r.id)

  let saved = 0
  for (let i = 0; i < toUpsert.length; i += 500) {
    const batch = toUpsert.slice(i, i + 500)
    const { error } = await supabase.from('arketa_transactions').upsert(batch, { onConflict: 'id' })
    if (error) console.log('⚠️ Fejl:', error.message)
    else { saved += batch.length; process.stdout.write(`\r  Gemt ${saved}/${toUpsert.length}...`) }
  }
  console.log(`\n  ✅ Færdig`)
}

async function main() {
  await importFile('./report-salesAll-kbh.csv', '48718')
  await importFile('./report-salesAll-NYC.csv', '48717')
  console.log('\n✅ Import færdig!')
}

main().catch(console.error)
