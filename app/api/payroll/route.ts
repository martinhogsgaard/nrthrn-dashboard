import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calcPayroll } from '@/lib/payroll'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start') || new Date().toISOString().split('T')[0]
  const end = searchParams.get('end') || new Date().toISOString().split('T')[0]
  const locationMTId = searchParams.get('location') || '48718'

  // 1. Hent instruktører fra Supabase
  const { data: instructors, error } = await supabase
    .from('instructors')
    .select('*, salary_rates(*)')
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 2. Hent alle class sessions fra Mariana Tek for perioden
  let allSessions: any[] = []
  let page = 1
  while (true) {
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=${start}&max_date=${end}&location=${locationMTId}&per_page=100&page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    if (!data.data?.length) break
    allSessions = [...allSessions, ...data.data]
    if (data.meta?.pagination?.pages <= page) break
    page++
  }

  // 3. Byg lønberegning pr. instruktør
  const payroll = instructors.map(instructor => {
    // Find sessions for denne instruktør via profile_id
    const instructorSessions = allSessions.filter(s =>
      s.relationships.employee_public_profiles?.data?.some(
        (p: any) => p.id === instructor.mariana_tek_profile_id
      )
    )

    // Hent aktiv lønsats
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

    // Map sessions til payroll format
    // OBS: Vi har ikke fødselsdato pr. deltager endnu — bruger 50/50 som placeholder
    const sessions = instructorSessions.map((s: any) => {
      const total = s.attributes.standard_reservation_user_count || 0
      return {
        participants: total,
        participants_over_30: Math.round(total * 0.5),
        participants_under_30: Math.round(total * 0.5),
        date: s.attributes.start_date,
        class_name: s.attributes.class_type_display,
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
      sessions_count: sessions.length,
      sessions,
      payroll: result,
      is_live_data: true,
    }
  }).filter(p => p.sessions_count > 0)

  return NextResponse.json({
    period: { start, end },
    location: locationMTId,
    total_sessions: allSessions.length,
    payroll,
  })
}