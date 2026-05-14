import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calcPayroll, type SalaryRate } from '@/lib/payroll'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start') || new Date().toISOString().split('T')[0]
  const end = searchParams.get('end') || new Date().toISOString().split('T')[0]
  const location = searchParams.get('location') || '48718'

  // Hent instruktører fra Supabase
  const { data: instructors, error } = await supabase
    .from('instructors')
    .select('*, salary_rates(*)')
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Hent sessions fra cache inkl. de nye over/under 30 kolonner
  const { data: sessions } = await supabase
    .from('sessions_cache')
    .select('*')
    .eq('location_id', location)
    .gte('date', start)
    .lte('date', end)

  // Beregn løn pr. instruktør
  const payroll = instructors.map(instructor => {
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

    // Find sessions for denne instruktør
    const instructorSessions = (sessions || []).filter((s: any) =>
      s.instructor_profile_id === instructor.mariana_tek_profile_id ||
      s.instructor_name === instructor.name
    )

    const mappedSessions = instructorSessions.map((s: any) => {
      const participants = s.participants || 0
      const over30 = s.participants_over_30 ?? null
      const under30 = s.participants_under_30 ?? null

      // Brug præcise tal hvis de findes, ellers estimer 50/50
      const finalOver30 = over30 !== null ? over30 : Math.round(participants * 0.5)
      const finalUnder30 = under30 !== null ? under30 : Math.round(participants * 0.5)

      return {
        participants,
        participants_over_30: finalOver30,
        participants_under_30: finalUnder30,
        is_estimated: over30 === null,
        date: s.date,
        class_name: s.class_type,
      }
    })

    const result = calcPayroll(mappedSessions, activeRate, instructor.employment_type === 'freelance')

    return {
      instructor: {
        id: instructor.id,
        name: instructor.name,
        initials: instructor.initials,
        level: instructor.level,
        employment_type: instructor.employment_type,
      },
      sessions_count: mappedSessions.length,
      sessions: mappedSessions,
      payroll: result,
      is_live_data: true,
    }
  }).filter(p => p.sessions_count > 0)

  return NextResponse.json({
    period: { start, end },
    location,
    total_sessions: sessions?.length || 0,
    payroll,
    is_live_data: true,
  })
}