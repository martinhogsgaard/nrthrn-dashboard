require('dotenv').config({ path: '.env.local' })
const BASE = 'https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0/' + process.env.ARKETA_PARTNER_ID
const AUTH = { 'Authorization': 'Bearer ' + process.env.ARKETA_API_KEY }

async function test() {
  // Side 1
  const d1 = await fetch(BASE + '/clients?limit=5', { headers: AUTH }).then(r => r.json())
  console.log('Side 1 IDs:', d1.items.map(i => i.id.slice(0,8)))
  console.log('Cursor:', d1.pagination.nextStartAfterId.slice(0,50))
  
  // Side 2 med cursor
  const d2 = await fetch(BASE + '/clients?limit=5&startAfter=' + d1.pagination.nextStartAfterId, { headers: AUTH }).then(r => r.json())
  console.log('Side 2 IDs:', d2.items.map(i => i.id.slice(0,8)))
  
  // Side 3 med cursor fra side 2
  const d3 = await fetch(BASE + '/clients?limit=5&startAfter=' + d2.pagination.nextStartAfterId, { headers: AUTH }).then(r => r.json())
  console.log('Side 3 IDs:', d3.items.map(i => i.id.slice(0,8)))
  
  console.log('Side 1 last == Side 2 first?', d1.items[4].id === d2.items[0].id)
  console.log('Side 2 last == Side 3 first?', d2.items[4].id === d3.items[0].id)
  console.log('Alle unikke?', new Set([...d1.items, ...d2.items, ...d3.items].map(i => i.id)).size === 15)
}
test().catch(console.error)
