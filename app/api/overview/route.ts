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
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Hent sessions denne måned
  const { data: sessions } = await supabase
    .from('sessions_cache')
    .select('*')
    .eq('location_id', location)
    .gte('date', start)
    .lte('date', end)

  // Hent aktive abonnementer
  const { data: memberships } = await supabase
    .from('membership_cache')
    .select('*')
    .eq('purchase_location_id', location)
    .eq('status', 'active')
    .gt('next_charge_date', new Date().toISOString())

  // Hent aldersfordeling fra members
  const { data: members } = await supabase
    .from('members')
    .select('is_over_30')
    .not('birth_date', 'is', null)

  // Beregn KPI'er
  const totalSessions = sessions?.length || 0
  const totalParticipants = sessions?.reduce((s, x) => s + (x.participants || 0), 0) || 0
  const totalCapacity = sessions?.filter(s => s.capacity > 0).reduce((s, x) => s + x.capacity, 0) || 0
  const avgBelægning = totalCapacity > 0 ? Math.round(totalParticipants / totalCapacity * 100) : 0

  const MEMBERSHIP_PRICES: Record<string, number> = {
    'Warrior (30+)': 1799, 'Warrior (under 30)': 1499,
    'Classes (30+)': 1349, 'Classes (under 30)': 1099,
    'Revival (30+)': 849, 'Revival (under 30)': 699,
    '8 Monthly (30+)': 999, '8 Monthly (under 30)': 799,
    '4 Monthly (30+)': 549, '4 Monthly (under 30)': 449,
    'Sauna Club': 300, 'Fitness Space': 699,
    '4 Monthly Classes': 449, '8 Monthly Classes': 799,
  }

  const totalMRR = memberships?.reduce((s, m) => {
    const price = m.renewal_rate || MEMBERSHIP_PRICES[m.membership_name] || 0
    return s + price
  }, 0) || 0

  const totalMembers = memberships?.length || 0
  const over30Members = members?.filter(m => m.is_over_30 === true).length || 0
  const under30Members = members?.filter(m => m.is_over_30 === false).length || 0
  const totalWithBirthdate = (over30Members + under30Members)
  const splitPct = totalWithBirthdate > 0 ? Math.round(over30Members / totalWithBirthdate * 100) : 0

  // Top 3 hold
  const top3 = [...(sessions || [])]
    .filter(s => s.participants > 0)
    .sort((a, b) => b.participants - a.participants)
    .slice(0, 3)

  // Lav belægning
  const lowBelægning = [...(sessions || [])]
    .filter(s => s.capacity > 0 && s.participants / s.capacity < 0.4)
    .sort((a, b) => (a.participants / a.capacity) - (b.participants / b.capacity))
    .slice(0, 3)

  return NextResponse.json({
    period: { start, end },
    kpis: {
      total_mrr: totalMRR,
      total_members: totalMembers,
      total_sessions: totalSessions,
      total_participants: totalParticipants,
      avg_belægning: avgBelægning,
      split_pct: splitPct,
      over30_members: over30Members,
      under30_members: under30Members,
    },
    top3_sessions: top3,
    low_belægning: lowBelægning,
  })
}