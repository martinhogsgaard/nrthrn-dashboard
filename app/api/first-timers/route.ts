import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const now = new Date()
  const start = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = searchParams.get('end') || now.toISOString().split('T')[0]
  const location = searchParams.get('location') || '48718'

  // First timers i perioden
  const { data: firstTimers, count: totalFirstTimers } = await supabase
    .from('first_timers')
    .select('*', { count: 'exact' })
    .gte('first_visit_date', start)
    .lte('first_visit_date', end)
    .eq('location_id', location)

  // Konverterede first timers
  const converted = firstTimers?.filter(ft => ft.converted) || []
  const conversionRate = totalFirstTimers && totalFirstTimers > 0
    ? Math.round(converted.length / totalFirstTimers * 100)
    : 0

  // Bruce besøg i perioden
  const { data: bruceSessions } = await supabase
    .from('sessions_cache')
    .select('bruce_spots, date')
    .eq('location_id', location)
    .gte('date', start)
    .lte('date', end)
    .gt('bruce_spots', 0)

  const totalBruceVisits = bruceSessions?.reduce((s, x) => s + (x.bruce_spots || 0), 0) || 0
  const bruceSessionsCount = bruceSessions?.length || 0

  // Fordeling pr. dag i perioden
  const dailyFirstTimers: Record<string, number> = {}
  firstTimers?.forEach(ft => {
    const date = ft.first_visit_date
    dailyFirstTimers[date] = (dailyFirstTimers[date] || 0) + 1
  })

  // Top klasser for first timers
  const classCounts: Record<string, number> = {}
  firstTimers?.forEach(ft => {
    if (ft.class_type) classCounts[ft.class_type] = (classCounts[ft.class_type] || 0) + 1
  })
  const topClasses = Object.entries(classCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  return NextResponse.json({
    period: { start, end },
    first_timers: {
      total: totalFirstTimers || 0,
      converted: converted.length,
      conversion_rate: conversionRate,
      daily: dailyFirstTimers,
      top_classes: topClasses,
    },
    bruce: {
      total_visits: totalBruceVisits,
      sessions_count: bruceSessionsCount,
    },
  })
}
