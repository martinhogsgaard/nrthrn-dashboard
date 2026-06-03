import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || '48718'
  const now = new Date()
  const yesterday = getYesterday()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]

  // Hent Bruce sessions — kun til og med i går (verificerede tal)
  const [
    { data: sessions },
    { data: rateData },
    { data: historicSessions },
    { data: historicRates },
  ] = await Promise.all([
    supabase.from('sessions_cache').select('*').eq('location_id', location).gte('date', monthStart).lte('date', yesterday).gt('bruce_spots', 0).order('date', { ascending: false }),
    supabase.from('bruce_rates').select('*').eq('month', monthStart).single(),
    supabase.from('sessions_cache').select('date, bruce_spots').eq('location_id', location).gte('date', sixMonthsAgo).lte('date', yesterday).gt('bruce_spots', 0),
    supabase.from('bruce_rates').select('*').gte('month', sixMonthsAgo),
  ])

  const rate = (rateData as any)?.rate_per_visit || 95
  const isEstimated = (rateData as any)?.is_estimated ?? true
  const totalBruceVisits = sessions?.reduce((s, x) => s + (x.bruce_spots || 0), 0) || 0
  const estimatedRevenue = Math.round(totalBruceVisits * rate)

  // Historik grupperet pr. måned
  const monthlyData: Record<string, { visits: number, rate: number, is_estimated: boolean, revenue: number }> = {}

  historicSessions?.forEach(s => {
    const month = s.date.slice(0, 7) + '-01'
    if (!monthlyData[month]) monthlyData[month] = { visits: 0, rate: 95, is_estimated: true, revenue: 0 }
    monthlyData[month].visits += s.bruce_spots || 0
  })

  historicRates?.forEach(r => {
    const month = r.month.slice(0, 10)
    if (monthlyData[month]) {
      monthlyData[month].rate = r.rate_per_visit
      monthlyData[month].is_estimated = r.is_estimated
    }
  })

  Object.keys(monthlyData).forEach(month => {
    monthlyData[month].revenue = Math.round(monthlyData[month].visits * monthlyData[month].rate)
  })

  const history = Object.entries(monthlyData)
    .map(([month, d]) => ({
      month,
      month_label: new Date(month).toLocaleDateString('da-DK', { month: 'short', year: '2-digit' }),
      ...d,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return NextResponse.json({
    data_until: yesterday,
    current_month: {
      month: monthStart,
      visits: totalBruceVisits,
      rate,
      is_estimated: isEstimated,
      estimated_revenue: estimatedRevenue,
      sessions_count: sessions?.length || 0,
    },
    sessions: sessions?.map(s => ({
      date: s.date,
      class_type: s.class_type,
      instructor_name: s.instructor_name,
      bruce_spots: s.bruce_spots,
      total_participants: s.participants,
    })) || [],
    history,
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { month, rate_per_visit, actual_visits, notes } = body

  const { data, error } = await supabase
    .from('bruce_rates')
    .upsert({ month, rate_per_visit, ...(actual_visits !== undefined ? { actual_visits } : {}), is_estimated: false, notes, updated_at: new Date().toISOString() }, { onConflict: 'month' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}