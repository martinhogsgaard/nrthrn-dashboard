import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function getAgeGroup(name: string): 'over30' | 'under30' | 'other' {
  if (name.includes('30+')) return 'over30'
  if (name.includes('under 30')) return 'under30'
  return 'other'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || '48718'
  const start = searchParams.get('start')

  // Afgør om vi skal bruge historisk snapshot eller live data
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const requestedMonth = start ? start.slice(0, 7) : currentMonth
  const isHistoric = requestedMonth < currentMonth

  // Fødselsdato-stats er altid live
  const { data: memberStats } = await supabase
    .from('members').select('is_over_30').not('birth_date', 'is', null)
  const dbOver30 = memberStats?.filter(m => m.is_over_30 === true).length || 0
  const dbUnder30 = memberStats?.filter(m => m.is_over_30 === false).length || 0

  if (isHistoric) {
    const snapshotMonth = `${requestedMonth}-01`
    const { data: snapshots, error } = await supabase
      .from('membership_snapshots')
      .select('*')
      .eq('location_id', location)
      .eq('month', snapshotMonth)

    if (error || !snapshots || snapshots.length === 0) {
      return NextResponse.json({
        stats: null,
        memberships: [],
        free_memberships: [],
        no_snapshot: true,
        snapshot_month: snapshotMonth,
      })
    }

    const memberships = snapshots
      .filter(s => s.mrr > 0)
      .map(s => ({
        name: s.membership_name,
        count: s.count,
        price: s.count > 0 ? Math.round(s.mrr / s.count) : 0,
        mrr: s.mrr,
        age_group: s.age_group,
        is_free: false,
      }))
      .sort((a, b) => b.mrr - a.mrr)

    const freeMemberships = snapshots
      .filter(s => s.mrr === 0)
      .map(s => ({
        name: s.membership_name,
        count: s.count,
        price: 0,
        mrr: 0,
        age_group: s.age_group,
        is_free: true,
      }))
      .sort((a, b) => b.count - a.count)

    const allMemberships = [...memberships, ...freeMemberships]
    const totalMRR = memberships.reduce((s, m) => s + m.mrr, 0)
    const over30MRR = memberships.filter(m => m.age_group === 'over30').reduce((s, m) => s + m.mrr, 0)
    const under30MRR = memberships.filter(m => m.age_group === 'under30').reduce((s, m) => s + m.mrr, 0)
    const otherMRR = memberships.filter(m => m.age_group === 'other').reduce((s, m) => s + m.mrr, 0)
    const payingCount = memberships.reduce((s, m) => s + m.count, 0)
    const freeCount = freeMemberships.reduce((s, m) => s + m.count, 0)
    const over30Total = allMemberships.filter(m => m.age_group === 'over30').reduce((s, m) => s + m.count, 0)
    const over30Paying = memberships.filter(m => m.age_group === 'over30').reduce((s, m) => s + m.count, 0)
    const over30Free = freeMemberships.filter(m => m.age_group === 'over30').reduce((s, m) => s + m.count, 0)
    const under30Total = allMemberships.filter(m => m.age_group === 'under30').reduce((s, m) => s + m.count, 0)
    const under30Paying = memberships.filter(m => m.age_group === 'under30').reduce((s, m) => s + m.count, 0)
    const under30Free = freeMemberships.filter(m => m.age_group === 'under30').reduce((s, m) => s + m.count, 0)

    return NextResponse.json({
      stats: {
        total_active: payingCount + freeCount,
        paying_members: payingCount,
        free_members: freeCount,
        total_mrr: totalMRR,
        over30_mrr: over30MRR,
        under30_mrr: under30MRR,
        other_mrr: otherMRR,
        over30_total: over30Total,
        over30_paying: over30Paying,
        over30_free: over30Free,
        under30_total: under30Total,
        under30_paying: under30Paying,
        under30_free: under30Free,
        birthdate_coverage: memberStats?.length || 0,
        birthdate_over30: dbOver30,
        birthdate_under30: dbUnder30,
      },
      memberships,
      free_memberships: freeMemberships,
      snapshot_month: snapshotMonth,
    })
  }

  // Live data — nuværende måned
  const { data, error } = await supabase
    .from('membership_cache')
    .select('*')
    .eq('purchase_location_id', location)
    .eq('status', 'active')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const paying = data.filter(t => t.renewal_rate > 0)
  const free = data.filter(t => !t.renewal_rate || t.renewal_rate === 0)

  const grouped = paying.reduce((acc: any, t: any) => {
    const name = t.membership_name
    if (!acc[name]) acc[name] = { count: 0, mrr: 0, price: t.renewal_rate }
    acc[name].count++
    acc[name].mrr += t.renewal_rate
    return acc
  }, {})

  const memberships = Object.entries(grouped).map(([name, d]: [string, any]) => ({
    name,
    count: d.count,
    price: Math.round(d.mrr / d.count),
    mrr: Math.round(d.mrr),
    age_group: getAgeGroup(name),
    is_free: false,
  })).sort((a, b) => b.mrr - a.mrr)

  const freeGrouped = free.reduce((acc: any, t: any) => {
    const name = t.membership_name
    if (!acc[name]) acc[name] = { count: 0 }
    acc[name].count++
    return acc
  }, {})

  const freeMemberships = Object.entries(freeGrouped).map(([name, d]: [string, any]) => ({
    name,
    count: d.count,
    price: 0,
    mrr: 0,
    age_group: getAgeGroup(name),
    is_free: true,
  })).sort((a, b) => b.count - a.count)

  const allMemberships = [...memberships, ...freeMemberships]
  const totalMRR = paying.reduce((s, m) => s + (m.renewal_rate || 0), 0)
  const over30MRR = memberships.filter(m => m.age_group === 'over30').reduce((s, m) => s + m.mrr, 0)
  const under30MRR = memberships.filter(m => m.age_group === 'under30').reduce((s, m) => s + m.mrr, 0)
  const otherMRR = memberships.filter(m => m.age_group === 'other').reduce((s, m) => s + m.mrr, 0)
  const over30Total = allMemberships.filter(m => m.age_group === 'over30').reduce((s, m) => s + m.count, 0)
  const over30Paying = memberships.filter(m => m.age_group === 'over30').reduce((s, m) => s + m.count, 0)
  const over30Free = freeMemberships.filter(m => m.age_group === 'over30').reduce((s, m) => s + m.count, 0)
  const under30Total = allMemberships.filter(m => m.age_group === 'under30').reduce((s, m) => s + m.count, 0)
  const under30Paying = memberships.filter(m => m.age_group === 'under30').reduce((s, m) => s + m.count, 0)
  const under30Free = freeMemberships.filter(m => m.age_group === 'under30').reduce((s, m) => s + m.count, 0)

  return NextResponse.json({
    stats: {
      total_active: data.length,
      paying_members: paying.length,
      free_members: free.length,
      total_mrr: totalMRR,
      over30_mrr: over30MRR,
      under30_mrr: under30MRR,
      other_mrr: otherMRR,
      over30_total: over30Total,
      over30_paying: over30Paying,
      over30_free: over30Free,
      under30_total: under30Total,
      under30_paying: under30Paying,
      under30_free: under30Free,
      birthdate_coverage: memberStats?.length || 0,
      birthdate_over30: dbOver30,
      birthdate_under30: dbUnder30,
    },
    memberships,
    free_memberships: freeMemberships,
  })
}