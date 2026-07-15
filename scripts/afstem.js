const fs = require('fs')

function parseCSV(text) {
  const rows = []
  let row = [], field = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i++ }
      else if (c === '"') inQ = false
      else field += c
    } else if (c === '"') inQ = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const head = rows.shift()
  return rows.filter(r => r.length === head.length)
             .map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i]])))
}

const num = s => parseFloat((s || '').trim().replace(/\./g, '').replace(',', '.')) || 0

// MT: aggregér linjer til ordre-niveau
const mtLines = parseCSV(fs.readFileSync('report-orders-local-time__2_.csv', 'utf8'))
const mt = {}
for (const r of mtLines) {
  const on = r['Order Number'].trim()
  if (!mt[on]) mt[on] = { net: 0, products: [] }
  const lt = num(r['Line Total'])
  mt[on].net += r['Line Status'].trim() === 'Refunded' ? -lt : lt
  mt[on].products.push(r['Product'].trim())
}

// Cache
const cacheRows = parseCSV(fs.readFileSync('cph-orders.csv', 'utf8'))
const cache = {}
for (const r of cacheRows) cache[r.order_number.trim()] = Number(r.total)

const mtKeys = Object.keys(mt)
const cKeys = Object.keys(cache)

const missing = mtKeys.filter(k => !(k in cache))
const extra   = cKeys.filter(k => !(k in mt))
const diff    = mtKeys.filter(k => k in cache && Math.abs(mt[k].net - cache[k]) > 0.01)

console.log(`MT:     ${mtKeys.length} ordrer, ${Object.values(mt).reduce((a,v)=>a+v.net,0).toFixed(2)} kr.`)
console.log(`Cache:  ${cKeys.length} ordrer, ${Object.values(cache).reduce((a,v)=>a+v,0).toFixed(2)} kr.`)

console.log(`\n❌ MANGLER I CACHE: ${missing.length} ordrer — ${missing.reduce((a,k)=>a+mt[k].net,0).toFixed(2)} kr.`)
missing.slice(0, 40).forEach(k => console.log(`   ${k}  ${mt[k].net.toFixed(2).padStart(9)}  ${mt[k].products.join(', ')}`))
if (missing.length > 40) console.log(`   ... +${missing.length - 40} flere`)

console.log(`\n⚠️  BELØB AFVIGER: ${diff.length} ordrer — difference ${diff.reduce((a,k)=>a+(mt[k].net-cache[k]),0).toFixed(2)} kr.`)
diff.slice(0, 40).forEach(k => console.log(`   ${k}  MT ${mt[k].net.toFixed(2).padStart(9)}  cache ${cache[k].toFixed(2).padStart(9)}  ${mt[k].products.join(', ')}`))
if (diff.length > 40) console.log(`   ... +${diff.length - 40} flere`)

console.log(`\n➕ I CACHE MEN IKKE I MT: ${extra.length} ordrer — ${extra.reduce((a,k)=>a+cache[k],0).toFixed(2)} kr.`)
extra.slice(0, 20).forEach(k => console.log(`   ${k}  ${cache[k].toFixed(2).padStart(9)}`))