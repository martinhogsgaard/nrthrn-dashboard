require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const MT_BASE = 'https://nrthrnstrong.marianatek.com/api'
const AUTH = { 'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}` }

async function main() {
  const { data } = await supabase
    .from('members')
    .select('mariana_tek_user_id')
    .is('birth_date', null)

  console.log(`Mangler fødselsdato: ${data.length}`)

  let updated = 0
  for (const m of data) {
    const r = await fetch(`${MT_BASE}/users/${m.mariana_tek_user_id}`, { headers: AUTH }).then(r => r.json())
    const u = r.data?.attributes
    if (!u?.birth_date) continue

    const d = new Date(u.birth_date), t = new Date()
    let age = t.getFullYear() - d.getFullYear()
    if (t.getMonth() - d.getMonth() < 0 || (t.getMonth() - d.getMonth() === 0 && t.getDate() < d.getDate())) age--

    await supabase.from('members')
      .update({ birth_date: u.birth_date, is_over_30: age >= 30 })
      .eq('mariana_tek_user_id', m.mariana_tek_user_id)

    updated++
    process.stdout.write(`\r  Opdateret ${updated}/${data.length}...`)
  }

  console.log(`\n✅ ${updated} fødselsdatoer opdateret`)
}

main().catch(console.error)