import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calcPayroll } from '@/lib/payroll'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || '48718'

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Hent alt fra Supabase — ingen live MT-kald
  const [
    { data: allSessions },
    { data: instructors },
    { data: memberships },
    { data: members },
    { data: newMembersData },
    { data: bruceSessions },
    { data: bruceRateData },
    { data: orders },
  ] = await Promise.all([
    supabase.from('sessions_cache').select('*').eq('location_id', location).gte('date', monthStart).lte('date', monthEnd),
    supabase.from('instructors').select('*, salary_rates(*)').eq('is_active', true),
    supabase.from('membership_cache').select('*').eq('purchase_location_id', location).eq('status', 'active').gt('next_charge_date', new Date().toISOString()),
    supabase.from('members').select('is_over_30').not('birth_date', 'is', null),
    supabase.from('members').select('id').gte('joined_date', monthStart).lte('joined_date', today),
    supabase.from('sessions_cache').select('date, bruce_spots').eq('location_id', location).gte('date', monthStart).lte('date', today).gt('bruce_spots', 0),
    supabase.from('bruce_rates').select('rate_per_visit').eq('month', monthStart).single(),
    supabase.from('orders_cache').select('total, summary').eq('location_id', location).gte('date_placed', monthStart).lte('date_placed', today + 'T23:59:59Z'),
    supabase.from('equipment_sales').select('sale_price, quantity').eq('location_id', location).gte('sale_date', monthStart).lte('sale_date', today),
  ])

  const historicSessions = allSessions?.filter(s => s.date <= today && !s.is_cancelled) || []
  const futureSessions = allSessions?.filter(s => s.date > today && !s.is_cancelled) || []

  // Løn
  function calcTotalPayroll(sessions: any[]) {
    return (instructors || []).reduce((total, instructor) => {
      const activeRate = instructor.salary_rates
        ?.filter((r: any) => !r.valid_to)
        ?.sort((a: any, b: any) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime())[0]
        || { rate_per_class: instructor.level === 'senior' ? 500 : 300, bonus_threshold_1: 8, bonus_threshold_2: 12, bonus_threshold_3: 15, bonus_tier_2: instructor.level === 'senior' ? 20 : 15, bonus_tier_3: instructor.level === 'senior' ? 35 : 25, bonus_tier_4: instructor.level === 'senior' ? 50 : 35 }

      const instrSessions = sessions.filter(s =>
        s.instructor_profile_id === instructor.mariana_tek_profile_id || s.instructor_name === instructor.name
      ).map(s => {
        const participants = s.participants || 0
        const over30 = s.participants_over_30 ?? Math.round(participants * 0.5)
        const under30 = s.participants_under_30 ?? participants - over30
        return { participants, participants_over_30: over30, participants_under_30: under30, date: s.date, class_name: s.class_type }
      })

      if (instrSessions.length === 0) return total
      const result = calcPayroll(instrSessions, activeRate, instructor.employment_type === 'freelance')
      return total + (instructor.employment_type === 'freelance' ? (result.invoice_total || 0) : result.subtotal)
    }, 0)
  }

  const historicPayroll = calcTotalPayroll(historicSessions)
  const futurePayroll = calcTotalPayroll(futureSessions)

  // MRR og split
  const totalMRR = memberships?.reduce((s, m) => s + (m.renewal_rate || 0), 0) || 0
  const mrrOver30 = memberships?.filter(m => m.membership_name?.includes('30+')).reduce((s, m) => s + (m.renewal_rate || 0), 0) || 0
  const mrrOther = memberships?.filter(m => !m.membership_name?.includes('30+') && !m.membership_name?.includes('under 30')).reduce((s, m) => s + (m.renewal_rate || 0), 0) || 0

  // Over/under 30 antal
  const over30 = members?.filter(m => m.is_over_30 === true).length || 0
  const under30 = members?.filter(m => m.is_over_30 === false).length || 0

  // Bruce
  const bruceRate = (bruceRateData as any)?.rate_per_visit || 95
  const totalBruceVisits = bruceSessions?.reduce((s, x) => s + (x.bruce_spots || 0), 0) || 0
  const bruceRevenue = Math.round(totalBruceVisits * bruceRate)

  // Orders fra cache
  const totalSales = Math.round((orders || []).reduce((s, o) => s + Number(o.total), 0))
  const ordersOver30 = (orders || []).filter(o => !o.summary?.includes('under 30')).reduce((s, o) => s + Number(o.total), 0)

  // Split%
  const totalOver30 = mrrOver30 + mrrOther + ordersOver30 + bruceRevenue + equipmentRevenue
  const totalRevenue = totalMRR + totalSales + bruceRevenue + equipmentRevenue
  const splitPct = totalRevenue > 0 ? Math.round(totalOver30 / totalRevenue * 100) : 0

  // Avg besøg
  const totalVisits = historicSessions.reduce((s, x) => s + (x.participants || 0), 0)
  const avgVisits = (memberships?.length || 0) > 0 ? Math.round(totalVisits / (memberships?.length || 1) * 10) / 10 : 0

  // MRR historik
  const mrrHistory = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { month: d.toLocaleDateString('da-DK', { month: 'short' }), mrr: i === 5 ? Math.round(totalMRR) : 0 }
  })

  // Belægning
  const historicWithPart = historicSessions.filter(s => s.capacity > 0 && s.participants > 0)
  const historicAvgBelægning = historicWithPart.length > 0
    ? Math.round(historicWithPart.reduce((s, x) => s + (x.participants / x.capacity * 100), 0) / historicWithPart.length) : 0

  const futureWithCap = futureSessions.filter(s => s.capacity > 0)
  const futureAvgBelægning = futureWithCap.length > 0
    ? Math.round(futureWithCap.reduce((s, x) => s + (x.participants / x.capacity * 100), 0) / futureWithCap.length) : 0

  const top3 = [...historicSessions].filter(s => s.participants > 0).sort((a, b) => b.participants - a.participants).slice(0, 3)
  const lowBelægning = [...historicSessions]
    .filter(s => s.capacity > 0 && s.capacity < 50 && s.participants > 0 && s.participants / s.capacity < 0.4)
    .sort((a, b) => (a.participants / a.capacity) - (b.participants / b.capacity)).slice(0, 3)

  return NextResponse.json({
    period: { start: monthStart, today, end: monthEnd },
    mrr: totalMRR,
    total_sales: totalSales,
    bruce: { visits: totalBruceVisits, revenue: bruceRevenue, rate: bruceRate },
    equipment_sales: equipmentRevenue,
    total_revenue: Math.round(totalRevenue),
    members: memberships?.length || 0,
    new_members: newMembersData?.length || 0,
    avg_visits: avgVisits,
    split_pct: splitPct,
    over30_members: over30,
    under30_members: under30,
    mrr_history: mrrHistory,
    historic: { sessions: historicSessions.length, participants: totalVisits, avg_belægning: historicAvgBelægning, payroll: Math.round(historicPayroll) },
    future: { sessions: futureSessions.length, participants: futureSessions.reduce((s, x) => s + (x.participants || 0), 0), avg_belægning: futureAvgBelægning, payroll: Math.round(futurePayroll) },
    total_estimated_payroll: Math.round(historicPayroll + futurePayroll),
    top3_sessions: top3,
    low_belægning: lowBelægning,
  })
}