require('dotenv').config({ path: '.env.local' })
const BASE = 'https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0/' + process.env.ARKETA_PARTNER_ID
const AUTH = { 'Authorization': 'Bearer ' + process.env.ARKETA_API_KEY }

async function test() {
  const url = BASE + '/clients?limit=3'
  const data = await fetch(url, { headers: AUTH }).then(r => r.json())
  console.log('Items:', data.items.length)
  console.log('Raw cursor:', data.pagination.nextStartAfterId)
  console.log('Decoded:', decodeURIComponent(data.pagination.nextStartAfterId))
  
  // Prøv næste side med raw cursor
  const url2 = BASE + '/clients?limit=3&startAfter=' + data.pagination.nextStartAfterId
  const data2 = await fetch(url2, { headers: AUTH }).then(r => r.json())
  console.log('\nSide 2 items:', data2.items && data2.items.length)
  console.log('Side 2 first ID:', data2.items && data2.items[0] && data2.items[0].id)
  console.log('Side 1 last ID:', data.items[data.items.length-1].id)
  console.log('Samme?', data2.items && data2.items[0] && data2.items[0].id === data.items[0].id)
}
test().catch(console.error)
