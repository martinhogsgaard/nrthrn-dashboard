require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const MT_BASE = 'https://nrthrnstrong.marianatek.com/api'
const AUTH = { 'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`, 'Content-Type': 'application/json' }

async function main() {
  const start = process.argv[2] || '2024-01-01'
  const end = process.argv[3] || new Date().toISOString().split('T')[0]
  
  console.log('Synkroniserer first timers fra ' + start + ' til ' + end + '...')

  let page = 1
  let totalPages = 1
  let newCount = 0
  let skipCount = 0

  while (page <= totalPages) {
    process.stdout.write('\rSide ' + page + '/' + totalPages + ' — ' + newCount + ' nye, ' + skipCount + ' kendte...')
    
    const res = await fetch(
      MT_BASE + '/reservations?tag=first-timer&min_datetime=' + start + 'T00:00:00Z&max_datetime=' + end + 'T23:59:59Z&per_page=100&page=' + page + '&include=class_session',
      { headers: AUTH }
    )
    const data = await res.json()
    
    if (!data.data) { console.log('\nFejl:', JSON.stringify(data).slice(0, 200)); break }
    totalPages = data.meta?.pagination?.pages || 1

    for (const r of data.data) {
      const userId = r.relationships?.user?.data?.id
      const sessionId = r.relationships?.class_session?.data?.id
      if (!userId || userId === '53027') continue

      // Find session dato fra included
      const sessionData = data.included?.find((i) => i.type === 'class_sessions' && i.id === sessionId)
      const visitDate = sessionData?.attributes?.start_date || r.attributes.creation_date?.split('T')[0]
      const classType = sessionData?.attributes?.class_type_display || null

      // Tjek duplikat
      const { data: existing } = await supabase
        .from('first_timers').select('id').eq('user_id', userId).maybeSingle()

      if (existing) { skipCount++; continue }

      const { error } = await supabase.from('first_timers').insert({
        source: 'mariana_tek',
        user_id: userId,
        first_visit_date: visitDate,
        session_id: sessionId,
        class_type: classType,
        location_id: '48718',
      })
      
      if (!error) newCount++
      else console.log('\nFejl ved insert:', error.message)
    }

    page++
  }

  console.log('\n✓ Faerdig! ' + newCount + ' nye first timers gemt, ' + skipCount + ' allerede kendte.')
  
  const { count } = await supabase.from('first_timers').select('*', { count: 'exact', head: true })
  console.log('Total first timers i database: ' + count)
}

main().catch(console.error)
