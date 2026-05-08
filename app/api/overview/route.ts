import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calcPayroll } from '@/lib/payroll'

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
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || '48718'

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data: allSessions } = await supabase
    .from('sessions_cache')
    .select('*')
    .eq('location_id', location)
    .gte('date', monthStart)
    .lte('date', monthEnd)

  const historicSessions = allSessions?.filter(s => s.date <= today) || []
  const futureSessions = allSessions?.filter(s => s.date > today) || []

  const { data: instructors } = await supabase
    .from('instructors')
    .select('*, salary_rates(*)')
    .eq('is_active', true)

  function calcTotalPayroll(sessions: any[]) {
    return (instructors || []).reduce((total, instructor) => {
      const activeRate = instructor.salary_rates
        ?.filter((r: any) => !r.valid_to)
        ?.sort((a: any, b: any) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime())[0]
        || {
          rate_per_class: instructor.level === 'senior' ? 500 : 300,
          bonus_threshold_1: 8, bonus_threshold_2: 12, bonus_threshold_3: 15,
          bonus_tier_2: instructor.level === 'senior' ? 20 : 15,
          bonus_tier_3: instructor.level === 'senior' ? 35 : 25,
          bonus_tier_4: instructor.level === 'senior' ? 50 : 35,
        }

      const instrSessions = sessions.filter(s =>
        s.instructor_profile_id === instructor.mariana_tek_profile_id ||
        s.instructor_name === instructor.name
      ).map(s => ({
        participants: s.participants || 0,
        participants_over_30: Math.round((s.participants || 0) * 0.5),
        participants_under_30: Math.round((s.participants || 0) * 0.5),
        date: s.date, class_name: s.class_type,
      }))

      if (instrSessions.length === 0) return total
      const result = calcPayroll(instrSessions, activeRate, instructor.employment_type === 'freelance')
      return total + (instructor.employment_type === 'freelance' ? (result.invoice_total || 0) : result.subtotal)
    }, 0)
  }

  const historicPayroll = calcTotalPayroll(historicSessions)
  const futurePayroll = calcTotalPayroll(futureSessions)

  const { data: memberships } = await supabase
    .from('membership_cache')
    .select('*')
    .eq('purchase_location_id', location)
    .eq('status', 'active')
    .gt('next_charge_date', new Date().toISOString())

  const totalMRR = memberships?.reduce((s, m) => s + (m.renewal_rate || MEMBERSHIP_PRICES[m.membership_name] || 0), 0) || 0

  const { data: members } = await supabase
    .from('members').select('is_over_30').not('birth_date', 'is', null)

  const over30 = members?.filter(m => m.is_over_30 === true).length || 0
  const under30 = members?.filter(m => m.is_over_30 === false).length || 0
  const splitPct = (over30 + under30) > 0 ? Math.round(over30 / (over30 + under30) * 100) : 0

  const historicWithPart = historicSessions.filter(s => s.capacity > 0 && s.participants > 0)
  const historicAvgBelægning = historicWithPart.length > 0
    ? Math.round(historicWithPart.reduce((s, x) => s + (x.participants / x.capacity * 100), 0) / historicWithPart.length) : 0

  const futureWithCap = futureSessions.filter(s => s.capacity > 0)
  const futureAvgBelægning = futureWithCap.length > 0
    ? Math.round(futureWithCap.reduce((s, x) => s + (x.participants / x.capacity * 100), 0) / futureWithCap.length) : 0

  const top3 = [...historicSessions].filter(s => s.participants > 0)
    .sort((a, b) => b.participants - a.participants).slice(0, 3)

  const lowBelægning = [...historicSessions]
    .filter(s => s.capacity > 0 && s.participants > 0 && s.participants / s.capacity < 0.4)
    .sort((a, b) => (a.participants / a.capacity) - (b.participants / b.capacity)).slice(0, 3)

  return NextResponse.json({
    period: { start: monthStart, today, end: monthEnd },
    mrr: totalMRR,
    members: memberships?.length || 0,
    split_pct: splitPct,
    over30_members: over30,
    under30_members: under30,
    historic: {
      sessions: historicSessions.length,
      participants: historicSessions.reduce((s, x) => s + (x.participants || 0), 0),
      avg_belægning: historicAvgBelægning,
      payroll: Math.round(historicPayroll),
    },
    future: {
      sessions: futureSessions.length,
      participants: futureSessions.reduce((s, x) => s + (x.participants || 0), 0),
      avg_belægning: futureAvgBelægning,
      payroll: Math.round(futurePayroll),
    },
    total_estimated_payroll: Math.round(historicPayroll + futurePayroll),
    top3_sessions: top3,
    low_belægning: lowBelægning,
  })
}
