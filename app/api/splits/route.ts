import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || '48718'
  const now = new Date()
  const start = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = searchParams.get('end') || now.toISOString().split('T')[0]

  const startMonth = start.slice(0, 7) + '-01'
  const endMonth = end.slice(0, 7) + '-01'

  const [
    { data: memberships },
    { data: orders },
    { data: sessions },
    { data: instructors },
    { data: settingsData },
    { data: bruceRates },
  ] = await Promise.all([
    supabase.from('active_memberships').select('*').eq('purchase_location_id', location),
    // Bruger lokal Copenhagen-tid til filtrering — matcher MT's rapporter
    supabase.rpc('get_orders_by_local_date', {
      p_location_id: location,
      p_start: start,
      p_end: end,
    }),
    supabase.from('sessions_cache').select('*').eq('location_id', location).gte('date', start).lte('date', end),
    supabase.from('employees').select('*, salary_rates(*)').eq('is_active', true),
    supabase.from('settings').select('*').eq('key', 'salary_defaults').single(),
    supabase.from('bruce_rates').select('*').gte('month', startMonth).lte('month', endMonth).eq('is_estimated', false),
  ])

  // MRR
  const mrrOver30 = memberships?.filter(m => m.membership_name?.includes('30+')).reduce((s, m) => s + (m.renewal_rate || 0), 0) || 0
  const mrrUnder30 = memberships?.filter(m => m.membership_name?.includes('under 30')).reduce((s, m) => s + (m.renewal_rate || 0), 0) || 0
  const mrrOther = memberships?.filter(m => !m.membership_name?.includes('30+') && !m.membership_name?.includes('under 30')).reduce((s, m) => s + (m.renewal_rate || 0), 0) || 0
  const totalMRR = mrrOver30 + mrrUnder30 + mrrOther

  // Orders fra cache — bruger net_total (total - refunderet) som korrekt omsætning
  const isUnder30 = (summary: string | null) => summary?.includes('under 30') || summary?.includes('under30') || false
  const ordersOver30 = (orders || []).filter(o => !isUnder30(o.summary)).reduce((s, o) => s + Number(o.net_total), 0)
  const ordersUnder30 = (orders || []).filter(o => isUnder30(o.summary)).reduce((s, o) => s + Number(o.net_total), 0)
  const totalOrders = (orders || []).reduce((s, o) => s + Number(o.net_total), 0)

  // Breakdown pr. produkt
  const ordersGrouped = (orders || []).reduce((acc: any, o: any) => {
    const name = o.summary || 'Ukendt'
    if (!acc[name]) acc[name] = { count: 0, total: 0 }
    acc[name].count++
    acc[name].total += Number(o.net_total)
    return acc
  }, {})

  const ordersBreakdown = Object.entries(ordersGrouped).map(([name, d]: [string, any]) => ({
    name, count: d.count, total: Math.round(d.total),
    age_group: name.includes('30+') ? 'over30' : (name.includes('under 30') || name.includes('under30')) ? 'under30' : 'other',
  })).sort((a, b) => b.total - a.total)

  // Bruce
  const bruceOver30 = (bruceRates || []).reduce((s, r) => s + ((r.visits_vat || 0) + (r.no_shows_vat || 0)) * r.rate_per_visit, 0)
  const bruceUnder30 = (bruceRates || []).reduce((s, r) => s + ((r.visits_no_vat || 0) + (r.no_shows_no_vat || 0)) * r.rate_per_visit, 0)
  const bruceTotal = bruceOver30 + bruceUnder30
  const bruceVat = Math.round(bruceOver30 * 0.25)

  const totalOver30 = ordersOver30 + bruceOver30
  const totalUnder30 = ordersUnder30 + bruceUnder30
  const totalRevenue = totalOver30 + totalUnder30
  const vatAmount = Math.round(ordersOver30 / 1.25 * 0.25 + bruceOver30 * 0.25)
  const over30Pct = totalRevenue > 0 ? Math.round(totalOver30 / totalRevenue * 100) : 0
  const under30Pct = 100 - over30Pct

  // Lønsatser
  const defaults = (settingsData as any)?.value || {
    junior_rate: 300, senior_rate: 500,
    bonus_threshold_1: 8, bonus_threshold_2: 12, bonus_threshold_3: 15,
    junior_bonus_tier_2: 15, junior_bonus_tier_3: 25, junior_bonus_tier_4: 35,
    senior_bonus_tier_2: 20, senior_bonus_tier_3: 35, senior_bonus_tier_4: 50,
  }

  function calcBonus(participants: number, rate: any, level: string) {
    const t1 = rate?.bonus_threshold_1 || defaults.bonus_threshold_1
    const t2 = rate?.bonus_threshold_2 || defaults.bonus_threshold_2
    const t3 = rate?.bonus_threshold_3 || defaults.bonus_threshold_3
    const tier2 = rate?.bonus_tier_2 || (level === 'senior' ? defaults.senior_bonus_tier_2 : defaults.junior_bonus_tier_2)
    const tier3 = rate?.bonus_tier_3 || (level === 'senior' ? defaults.senior_bonus_tier_3 : defaults.junior_bonus_tier_3)
    const tier4 = rate?.bonus_tier_4 || (level === 'senior' ? defaults.senior_bonus_tier_4 : defaults.junior_bonus_tier_4)
    if (participants <= t1) return 0
    if (participants <= t2) return (participants - t1) * tier2
    if (participants <= t3) return (t2 - t1) * tier2 + (participants - t2) * tier3
    return (t2 - t1) * tier2 + (t3 - t2) * tier3 + (participants - t3) * tier4
  }

  // Freelancer lønkladder
  const freelancerData = (instructors || [])
    .filter(i => i.employment_type === 'freelance')
    .map(instructor => {
      const rate = instructor.salary_rates?.find((r: any) => !r.valid_to)
      const baseRate = rate?.rate_per_class || (instructor.level === 'senior' ? defaults.senior_rate : defaults.junior_rate)

      const instrSessions = (sessions || []).filter(s =>
        s.instructor_profile_id === instructor.mariana_tek_profile_id || s.instructor_name === instructor.name
      )

      const sessionDetails = instrSessions.map(s => {
        const total = s.participants || 0
        const over30 = s.participants_over_30 ?? Math.round(total * over30Pct / 100)
        const under30 = s.participants_under_30 ?? total - over30
        const sessionOver30Pct = total > 0 ? over30 / total : over30Pct / 100
        const bonus = calcBonus(total, rate, instructor.level)
        const totalAmount = baseRate + bonus
        const over30Amount = totalAmount * sessionOver30Pct
        const vatAmt = Math.round(over30Amount * 0.25)

        return {
          date: s.date, class_name: s.class_type,
          participants: total, over30, under30,
          is_estimated: s.participants_over_30 === null || s.participants_over_30 === undefined,
          base_rate: baseRate, bonus,
          total_amount: Math.round(totalAmount),
          over30_amount: Math.round(over30Amount),
          under30_amount: Math.round(totalAmount - over30Amount),
          vat_amount: vatAmt,
          invoice_total: Math.round(totalAmount + vatAmt),
        }
      })

      const totals = sessionDetails.reduce((acc, s) => ({
        sessions: acc.sessions + 1, participants: acc.participants + s.participants,
        over30: acc.over30 + s.over30, under30: acc.under30 + s.under30,
        base_total: acc.base_total + s.base_rate, bonus_total: acc.bonus_total + s.bonus,
        amount_excl_vat: acc.amount_excl_vat + s.total_amount,
        over30_amount: acc.over30_amount + s.over30_amount,
        under30_amount: acc.under30_amount + s.under30_amount,
        vat_amount: acc.vat_amount + s.vat_amount,
        invoice_total: acc.invoice_total + s.invoice_total,
      }), { sessions: 0, participants: 0, over30: 0, under30: 0, base_total: 0, bonus_total: 0, amount_excl_vat: 0, over30_amount: 0, under30_amount: 0, vat_amount: 0, invoice_total: 0 })

      return {
        instructor: { id: instructor.id, name: instructor.name, initials: instructor.initials, email: instructor.email, level: instructor.level },
        sessions: sessionDetails, totals,
      }
    })
    .filter(f => f.totals.sessions > 0)

  return NextResponse.json({
    period: { start, end },
    split_pct: { over30: over30Pct, under30: under30Pct },
    mrr: { total: Math.round(totalMRR), over30: Math.round(mrrOver30 + mrrOther), under30: Math.round(mrrUnder30), vat: Math.round((mrrOver30 + mrrOther) / 1.25 * 0.25) },
    orders: { total: Math.round(totalOrders), over30: Math.round(ordersOver30), under30: Math.round(ordersUnder30), vat: Math.round(ordersOver30 / 1.25 * 0.25), breakdown: ordersBreakdown },
    bruce: { total: Math.round(bruceTotal), over30: Math.round(bruceOver30), under30: Math.round(bruceUnder30), vat: bruceVat, months: bruceRates?.length || 0 },
    total_revenue: { total: Math.round(totalRevenue), over30: Math.round(totalOver30), under30: Math.round(totalUnder30), vat: vatAmount },
    sessions: { total: sessions?.length || 0, participants: sessions?.reduce((s, x) => s + (x.participants || 0), 0) || 0 },
    freelancers: freelancerData,
  })
}