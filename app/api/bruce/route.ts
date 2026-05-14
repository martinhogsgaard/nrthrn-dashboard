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
  const today = now.toISOString().split('T')[0]
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  // Hent Bruce sessions denne måned — kun afholdte (dato <= i dag)
  const { data: sessions } = await supabase
    .from('sessions_cache')
    .select('*')
    .eq('location_id', location)
    .gte('date', monthStart)
    .lte('date', today)
    .gt('bruce_spots', 0)
    .order('date', { ascending: false })

  const totalBruceVisits = sessions?.reduce((s, x) => s + (x.bruce_spots || 0), 0) || 0

  // Hent Bruce rate for denne måned
  const { data: rateData } = await supabase
    .from('bruce_rates')
    .select('*')
    .eq('month', monthStart)
    .single()

  const rate = rateData?.rate_per_visit || 95
  const isEstimated = rateData?.is_estimated ?? true
  const estimatedRevenue = Math.round(totalBruceVisits * rate)

  // Historik — sidste 6 måneder, kun afholdte sessions
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]

  const { data: historicSessions } = await supabase
    .from('sessions_cache')
    .select('date, bruce_spots')
    .eq('location_id', location)
    .gte('date', sixMonthsAgo)
    .lte('date', today)
    .gt('bruce_spots', 0)

  const { data: historicRates } = await supabase
    .from('bruce_rates')
    .select('*')
    .gte('month', sixMonthsAgo)

  // Gruppér historik pr. måned
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

  const history = Object.entries(monthlyData).map(([month, d]) => ({
    month,
    month_label: new Date(month).toLocaleDateString('da-DK', { month: 'short', year: '2-digit' }),
    ...d,
  })).sort((a, b) => a.month.localeCompare(b.month))

  return NextResponse.json({
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
  const { month, rate_per_visit, notes } = body

  const { data, error } = await supabase
    .from('bruce_rates')
    .upsert({
      month,
      rate_per_visit,
      is_estimated: false,
      notes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'month' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}