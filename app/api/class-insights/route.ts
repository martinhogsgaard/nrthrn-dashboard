import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface SessionRow {
  class_type: string
  instructor_name: string | null
  date: string
  time: string
  participants: number
  capacity: number
}

function weekdayDa(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('da-DK', { weekday: 'long' })
}

function hourOf(time: string): string {
  return time.split('.')[0]
}

async function buildInsights(
  location: string,
  start: string,
  end: string,
  classType: string | null,
  instructor: string | null,
  weekday: string | null
) {
  const { data: types } = await supabase
    .from('class_session_types')
    .select('name')
    .eq('is_real_class', true)

  const realNames = new Set((types || []).map(t => t.name))

  const { data: sessions } = await supabase
    .from('sessions_cache')
    .select('class_type, instructor_name, date, time, participants, capacity')
    .eq('location_id', location)
    .gte('date', start)
    .lte('date', end)
    .eq('is_cancelled', false)

  let real: SessionRow[] = (sessions || []).filter(s => realNames.has(s.class_type))

  if (classType) real = real.filter(s => s.class_type === classType)
  if (instructor) real = real.filter(s => s.instructor_name === instructor)
  if (weekday) real = real.filter(s => weekdayDa(s.date) === weekday)

  const byClassType: Record<string, { count: number; participants: number; capacitySum: number }> = {}
  for (const s of real) {
    if (!byClassType[s.class_type]) byClassType[s.class_type] = { count: 0, participants: 0, capacitySum: 0 }
    byClassType[s.class_type].count++
    byClassType[s.class_type].participants += s.participants || 0
    byClassType[s.class_type].capacitySum += s.capacity || 0
  }
  const classTypeStats = Object.entries(byClassType)
    .map(([name, d]) => ({
      class_type: name,
      sessions: d.count,
      avg_participants: d.count > 0 ? Math.round((d.participants / d.count) * 10) / 10 : 0,
      avg_occupancy: d.capacitySum > 0 ? Math.round((d.participants / d.capacitySum) * 100) : 0,
      total_participants: d.participants,
    }))
    .sort((a, b) => b.avg_occupancy - a.avg_occupancy)

  const byInstructor: Record<string, { count: number; participants: number; capacitySum: number }> = {}
  for (const s of real) {
    const name = s.instructor_name || 'Ukendt'
    if (!byInstructor[name]) byInstructor[name] = { count: 0, participants: 0, capacitySum: 0 }
    byInstructor[name].count++
    byInstructor[name].participants += s.participants || 0
    byInstructor[name].capacitySum += s.capacity || 0
  }
  const instructorStats = Object.entries(byInstructor)
    .map(([name, d]) => ({
      instructor_name: name,
      sessions: d.count,
      avg_participants: d.count > 0 ? Math.round((d.participants / d.count) * 10) / 10 : 0,
      avg_occupancy: d.capacitySum > 0 ? Math.round((d.participants / d.capacitySum) * 100) : 0,
    }))
    .sort((a, b) => b.avg_occupancy - a.avg_occupancy)

  const weekdayOrder = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag']
  const heatmapCells: Record<string, { count: number; participants: number; capacitySum: number }> = {}
  for (const s of real) {
    const wd = weekdayDa(s.date)
    const hr = hourOf(s.time)
    const key = `${wd}|${hr}`
    if (!heatmapCells[key]) heatmapCells[key] = { count: 0, participants: 0, capacitySum: 0 }
    heatmapCells[key].count++
    heatmapCells[key].participants += s.participants || 0
    heatmapCells[key].capacitySum += s.capacity || 0
  }
  const heatmap = Object.entries(heatmapCells).map(([key, d]) => {
    const [weekday, hour] = key.split('|')
    return {
      weekday,
      hour,
      sessions: d.count,
      avg_occupancy: d.capacitySum > 0 ? Math.round((d.participants / d.capacitySum) * 100) : 0,
    }
  })

  const hours = [...new Set(real.map(s => hourOf(s.time)))].sort()

  const totalParticipants = real.reduce((s, x) => s + (x.participants || 0), 0)
  const totalCapacity = real.reduce((s, x) => s + (x.capacity || 0), 0)

  return {
    period: { start, end },
    sessions_total: real.length,
    participants_total: totalParticipants,
    avg_occupancy: totalCapacity > 0 ? Math.round((totalParticipants / totalCapacity) * 100) : 0,
    class_types: classTypeStats,
    instructors: instructorStats,
    heatmap: { cells: heatmap, weekday_order: weekdayOrder, hours },
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || '48718'
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const classType = searchParams.get('classType')
  const instructor = searchParams.get('instructor')
  const weekday = searchParams.get('weekday')
  const compareStart = searchParams.get('compareStart')
  const compareEnd = searchParams.get('compareEnd')

  if (!start || !end) {
    return NextResponse.json({ error: 'start og end er påkrævet (YYYY-MM-DD)' }, { status: 400 })
  }

  try {
    const current = await buildInsights(location, start, end, classType, instructor, weekday)

    let compare = null
    if (compareStart && compareEnd) {
      compare = await buildInsights(location, compareStart, compareEnd, classType, instructor, weekday)
    }

    return NextResponse.json({ current, compare })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}