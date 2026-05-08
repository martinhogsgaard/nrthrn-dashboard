import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const MEMBERSHIP_PRICES: Record<string, number> = {
  'Warrior (30+)': 1799, 'Warrior (under 30)': 1499,
  'Classes (30+)': 1349, 'Classes (under 30)': 1099,
  'Revival (30+)': 849, 'Revival (under 30)': 699,
  '8 Monthly (30+)': 999, '8 Monthly (under 30)': 799,
  '4 Monthly (30+)': 549, '4 Monthly (under 30)': 449,
  'Sauna Club': 300, 'Fitness Space': 699,
  '4 Monthly Classes': 449, '8 Monthly Classes': 799,
  'Ambassador': 0, '3 Saunagus (Classes Membership)': 0,
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || '48718'

  const { data, error } = await supabase
    .from('membership_cache')
    .select('*')
    .eq('purchase_location_id', location)
    .eq('status', 'active')
    .gt('next_charge_date', new Date().toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const grouped = data.reduce((acc: any, t: any) => {
    const name = t.membership_name
    const price = t.renewal_rate || MEMBERSHIP_PRICES[name] || 0
    if (!acc[name]) acc[name] = { count: 0, price }
    acc[name].count++
    return acc
  }, {})

  const memberships = Object.entries(grouped).map(([name, d]: [string, any]) => ({
    name, count: d.count, price: Math.round(d.price),
    mrr: Math.round(d.count * d.price),
    age_group: name.includes('30+') ? 'over30' : name.includes('under 30') ? 'under30' : 'other',
  })).sort((a, b) => b.mrr - a.mrr)

  const totalMRR = memberships.reduce((s, m) => s + m.mrr, 0)
  const totalMembers = data.length
  const over30Count = memberships.filter(m => m.age_group === 'over30').reduce((s, m) => s + m.count, 0)
  const under30Count = memberships.filter(m => m.age_group === 'under30').reduce((s, m) => s + m.count, 0)

  const { data: memberStats } = await supabase
    .from('members')
    .select('is_over_30')
    .not('birth_date', 'is', null)

  const dbOver30 = memberStats?.filter(m => m.is_over_30 === true).length || 0
  const dbUnder30 = memberStats?.filter(m => m.is_over_30 === false).length || 0

  return NextResponse.json({
    stats: {
      total_active: totalMembers, total_mrr: totalMRR,
      over30_count: over30Count, under30_count: under30Count,
      birthdate_coverage: (memberStats?.length || 0),
      birthdate_over30: dbOver30, birthdate_under30: dbUnder30,
    },
    memberships,
  })
}