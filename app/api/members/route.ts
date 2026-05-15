import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || '48718'

  // Inkluder memberships med null next_charge_date (fx 2-Week Unlimited)
  const { data, error } = await supabase
    .from('membership_cache')
    .select('*')
    .eq('purchase_location_id', location)
    .eq('status', 'active')
    .or(`next_charge_date.gt.${new Date().toISOString()},next_charge_date.is.null`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const paying = data.filter(t => t.renewal_rate > 0)
  const free = data.filter(t => !t.renewal_rate || t.renewal_rate === 0)

  const grouped = paying.reduce((acc: any, t: any) => {
    const name = t.membership_name
    if (!acc[name]) acc[name] = { count: 0, price: t.renewal_rate }
    acc[name].count++
    return acc
  }, {})

  const memberships = Object.entries(grouped).map(([name, d]: [string, any]) => ({
    name, count: d.count, price: Math.round(d.price),
    mrr: Math.round(d.count * d.price),
    age_group: name.includes('30+') ? 'over30' : name.includes('under 30') ? 'under30' : 'other',
    is_free: false,
  })).sort((a, b) => b.mrr - a.mrr)

  const freeGrouped = free.reduce((acc: any, t: any) => {
    const name = t.membership_name
    if (!acc[name]) acc[name] = { count: 0 }
    acc[name].count++
    return acc
  }, {})

  const freeMemberships = Object.entries(freeGrouped).map(([name, d]: [string, any]) => ({
    name, count: d.count, price: 0, mrr: 0,
    age_group: 'other',
    is_free: true,
  })).sort((a, b) => b.count - a.count)

  const totalMRR = memberships.reduce((s, m) => s + m.mrr, 0)
  const over30Count = memberships.filter(m => m.age_group === 'over30').reduce((s, m) => s + m.count, 0)
  const under30Count = memberships.filter(m => m.age_group === 'under30').reduce((s, m) => s + m.count, 0)

  const { data: memberStats } = await supabase
    .from('members').select('is_over_30').not('birth_date', 'is', null)

  const dbOver30 = memberStats?.filter(m => m.is_over_30 === true).length || 0
  const dbUnder30 = memberStats?.filter(m => m.is_over_30 === false).length || 0

  return NextResponse.json({
    stats: {
      total_active: data.length,
      paying_members: paying.length,
      free_members: free.length,
      total_mrr: totalMRR,
      over30_count: over30Count,
      under30_count: under30Count,
      birthdate_coverage: memberStats?.length || 0,
      birthdate_over30: dbOver30,
      birthdate_under30: dbUnder30,
    },
    memberships,
    free_memberships: freeMemberships,
  })
}