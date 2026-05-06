import { createClient } from '@/lib/supabase/server'
import { getClassSessions, isOver30 } from '@/lib/mariana-tek'
import { calcPayroll, type Session } from '@/lib/payroll'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start') || new Date().toISOString().split('T')[0]
  const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0]

  const supabase = createClient()

  // Hent instruktører med lønsatser fra Supabase
  const { data: instructors, error } = await supabase
    .from('instructors')
    .select('*, salary_rates(*)')
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Hent klasse-sessions fra Mariana Tek (eller mock)
  const classSessions = await getClassSessions(startDate, endDate)

  // Byg lønberegning pr. instruktør
  const payroll = instructors.map(instructor => {
    // Find aktiv lønsats
    const activeRate = instructor.salary_rates
      ?.filter((r: any) => !r.valid_to)
      ?.sort((a: any, b: any) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime())[0]

    if (!activeRate) return { instructor, error: 'Ingen aktiv lønsats' }

    // Find sessions for denne instruktør
    // Matcher på navn indtil Mariana Tek-ID er synkroniseret
    const instructorSessions = classSessions.filter(
      s => s.instructor_name === instructor.name || s.instructor_id === instructor.mariana_tek_id
    )

    // Map til Session-format med over/under 30 beregnet fra fødselsdato
    const sessions: Session[] = instructorSessions.map(s => {
      const over30 = s.reservations.filter(r => isOver30(r.date_of_birth)).length
      return {
        participants: s.reservations.length,
        participants_over_30: over30,
        participants_under_30: s.reservations.length - over30,
        date: s.start_datetime,
        class_name: s.name,
      }
    })

    const result = calcPayroll(sessions, activeRate, instructor.employment_type === 'freelance')

    return {
      instructor: {
        id: instructor.id,
        name: instructor.name,
        initials: instructor.initials,
        level: instructor.level,
        employment_type: instructor.employment_type,
      },
      rates: activeRate,
      sessions,
      payroll: result,
    }
  })

  return NextResponse.json({
    period: { start: startDate, end: endDate },
    payroll,
    is_live_data: !!(process.env.MARIANA_TEK_API_KEY && process.env.MARIANA_TEK_SUBDOMAIN),
  })
}
