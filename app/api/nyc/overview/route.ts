import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calcPayroll } from '@/lib/payroll'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const LOCATION_ID = '48717'

export async function GET() {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [
    { data: allSessions },
    { data: instructors },
    { data: memberships },
    { data: newMembersData },
    { data: bruceSessions },
    { data: orders },
  ] = await Promise.all([
    supabase.from('sessions_cache').select('*').eq('location_id', LOCATION_ID).gte('date', monthStart).lte('date', monthEnd),
    supabase.from('instructors').select('*, salary_rates(*)').eq('is_active', true),
    supabase.from('membership_cache').select('*').eq('purchase_location_id', LOCATION_ID).eq('status', 'active').gt('next_charge_date', new Date().toISOString()),
    supabase.from('members').select('id').gte('joined_date', monthStart).lte('joined_date', today),
    supabase.from('sessions_cache').select('date, bruce_spots').eq('location_id', LOCATION_ID).gte('date', monthStart).lte('date', today).gt('bruce_spots', 0),
    supabase.from('orders_cache').select('total, summary').eq('location_id', LOCATION_ID).gte('date_placed', monthStart).lte('date_placed', today + 'T23:59:59Z'),
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

  // MRR i USD
  const totalMRR = memberships?.reduce((s, m) => s + (m.renewal_rate || 0), 0) || 0

  // Orders i USD
  const totalSales = Math.round((orders || []).reduce((s, o) => s + Number(o.total), 0))
  const totalRevenue = totalMRR + totalSales

  // Bruce
  const totalBruceVisits = bruceSessions?.reduce((s, x) => s + (x.bruce_spots || 0), 0) || 0

  // Belægning
  const historicWithPart = historicSessions.filter(s => s.capacity > 0 && s.participants > 0)
  const historicAvgBelægning = historicWithPart.length > 0
    ? Math.round(historicWithPart.reduce((s, x) => s + (x.participants / x.capacity * 100), 0) / historicWithPart.length) : 0

  const totalVisits = historicSessions.reduce((s, x) => s + (x.participants || 0), 0)
  const avgVisits = (memberships?.length || 0) > 0 ? Math.round(totalVisits / (memberships?.length || 1) * 10) / 10 : 0

  const top3 = [...historicSessions].filter(s => s.participants > 0).sort((a, b) => b.participants - a.participants).slice(0, 3)
  const lowBelægning = [...historicSessions]
    .filter(s => s.capacity > 0 && s.capacity < 50 && s.participants > 0 && s.participants / s.capacity < 0.4)
    .sort((a, b) => (a.participants / a.capacity) - (b.participants / b.capacity)).slice(0, 3)

  // MRR historik
  const mrrHistory = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { month: d.toLocaleDateString('da-DK', { month: 'short' }), mrr: i === 5 ? Math.round(totalMRR) : 0 }
  })

  return NextResponse.json({
    period: { start: monthStart, today, end: monthEnd },
    currency: 'USD',
    mrr: totalMRR,
    total_sales: totalSales,
    total_revenue: Math.round(totalRevenue),
    members: memberships?.length || 0,
    new_members: newMembersData?.length || 0,
    avg_visits: avgVisits,
    bruce: { visits: totalBruceVisits },
    mrr_history: mrrHistory,
    historic: {
      sessions: historicSessions.length,
      participants: totalVisits,
      avg_belægning: historicAvgBelægning,
      payroll: Math.round(historicPayroll),
    },
    top3_sessions: top3,
    low_belægning: lowBelægning,
  })
}