import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

const MEMBERSHIP_PRICES: Record<string, number> = {
  'Warrior (30+)':          1799,
  'Warrior (under 30)':     1499,
  'Classes (30+)':          1349,
  'Classes (under 30)':     1099,
  'Revival (30+)':           849,
  'Revival (under 30)':      699,
  '8 Monthly (30+)':         999,
  '8 Monthly (under 30)':    799,
  '4 Monthly (30+)':         549,
  '4 Monthly (under 30)':    449,
  'Sauna Club':              300,
  'Fitness Space':           699,
  '4 Monthly Classes':       449,
  '8 Monthly Classes':       799,
  'Ambassador':                0,
  '3 Saunagus (Classes Membership)': 0,
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || '48718'

  // Hent aktive membership instances filtreret på lokation
  let allInstances: any[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/membership_instances?status=active&purchase_location=${location}&per_page=100&page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    totalPages = data.meta?.pagination?.pages || 1
    allInstances = [...allInstances, ...(data.data || [])]
    if (page >= totalPages) break
    page++
  }

  // Gruppér på membership_name
  const grouped = allInstances.reduce((acc: any, t: any) => {
    const name = t.attributes.membership_name
    const price = parseFloat(t.attributes.renewal_rate) || MEMBERSHIP_PRICES[name] || 0
    if (!acc[name]) acc[name] = { count: 0, price }
    acc[name].count++
    return acc
  }, {})

  const memberships = Object.entries(grouped).map(([name, data]: [string, any]) => ({
    name,
    count: data.count,
    price: Math.round(data.price),
    mrr: Math.round(data.count * data.price),
    age_group: name.includes('30+') ? 'over30' : name.includes('under 30') ? 'under30' : 'other',
  })).sort((a, b) => b.mrr - a.mrr)

  const totalMRR = memberships.reduce((s, m) => s + m.mrr, 0)
  const totalMembers = allInstances.length
  const over30Count = memberships.filter(m => m.age_group === 'over30').reduce((s, m) => s + m.count, 0)
  const under30Count = memberships.filter(m => m.age_group === 'under30').reduce((s, m) => s + m.count, 0)

  // Hent aldersfordeling fra Supabase
  const { data: memberStats } = await supabase
    .from('members')
    .select('is_over_30')
    .not('birth_date', 'is', null)

  const dbOver30 = memberStats?.filter(m => m.is_over_30 === true).length || 0
  const dbUnder30 = memberStats?.filter(m => m.is_over_30 === false).length || 0
  const dbTotal = memberStats?.length || 0

  return NextResponse.json({
    stats: {
      total_active: totalMembers,
      total_mrr: totalMRR,
      over30_count: over30Count,
      under30_count: under30Count,
      birthdate_coverage: dbTotal,
      birthdate_over30: dbOver30,
      birthdate_under30: dbUnder30,
    },
    memberships,
  })
}
