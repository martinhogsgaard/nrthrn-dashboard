import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const SLING_BASE = 'https://api.getsling.com'
const SLING_ORG_ID = process.env.SLING_ORG_ID!

// Position IDs i Sling
const SLING_POSITIONS: Record<string, string> = {
  '23059374': 'Instructor',
  '23059375': 'Front Desk',
  '23144435': 'Revival Instructor',
  '23091205': 'Manager',
  '23091207': 'Facilities',
  '23091289': 'Gus master',
  '29940166': 'Assistant Manager',
}

// Roller der skal have timeløn fra Sling
const PAID_POSITIONS = ['23059375', '23091207', '23091289', '29940166'] // Front Desk, Facilities, Gus master, Assistant Manager

async function getSlingToken() {
  // Brug token fra env — fornyes manuelt indtil dedikeret API bruger er oprettet
  return process.env.SLING_TOKEN!
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // fx "2026-05"

  if (!month) return NextResponse.json({ error: 'month påkrævet (fx 2026-05)' }, { status: 400 })

  const [year, mon] = month.split('-').map(Number)
  const today = new Date().toISOString().split('T')[0]
  const end = month === today.slice(0, 7)
    ? today
    : new Date(year, mon, 0).toISOString().split('T')[0]
  const start = `${month}-01`

  try {
    const token = await getSlingToken()

    // Hent vagter fra Sling
    const slingRes = await fetch(
      `${SLING_BASE}/v1/${SLING_ORG_ID}/reports/payroll?dates=${start}/${end}`,
      { headers: { 'Authorization': token } }
    )
    const shifts = await slingRes.json()

    if (!Array.isArray(shifts)) {
      return NextResponse.json({ error: 'Sling token udløbet — forny token i Vercel' }, { status: 401 })
    }

    // Filtrer kun relevante positions (Front Desk, Facilities, Gus master)
    const relevantShifts = shifts.filter(s =>
      PAID_POSITIONS.includes(String(s.position.id))
    )

    // Hent medarbejdere med sling_user_id og employee_roles
    const { data: employees } = await supabase
      .from('employees')
      .select('id, name, sling_user_id, employee_roles(*)')
      .eq('is_active', true)
      .not('sling_user_id', 'is', null)

    // Grupper vagter per medarbejder
    const byEmployee: Record<string, any> = {}

    for (const shift of relevantShifts) {
      const emp = employees?.find(e => e.sling_user_id === String(shift.user.id))
      if (!emp) continue

      // Find relevant role og timesats
      const roles = emp.employee_roles || []
      const role = roles.find((r: any) =>
        r.role === 'receptionist' ||
        r.role === 'cleaning' ||
        r.role === 'other'
      )

      const hourlyRate = role?.hourly_rate || 0
      const positionName = SLING_POSITIONS[String(shift.position.id)] || 'Ukendt'
      const hours = Math.round(shift.shift.duration / 60 * 100) / 100
      const amount = Math.round(hours * hourlyRate)

      if (!byEmployee[emp.id]) {
        byEmployee[emp.id] = {
          employee_id: emp.id,
          name: emp.name,
          sling_user_id: emp.sling_user_id,
          hourly_rate: hourlyRate,
          total_hours: 0,
          total_amount: 0,
          shifts: [],
        }
      }

      byEmployee[emp.id].total_hours += hours
      byEmployee[emp.id].total_amount += amount
      byEmployee[emp.id].shifts.push({
        date: shift.date,
        position: positionName,
        duration_minutes: shift.shift.duration,
        hours,
        amount,
      })
    }

    // Afrund totaler
    Object.values(byEmployee).forEach((emp: any) => {
      emp.total_hours = Math.round(emp.total_hours * 100) / 100
      emp.total_amount = Math.round(emp.total_amount)
    })

    return NextResponse.json({
      month,
      period: { start, end },
      employeeCount: Object.keys(byEmployee).length,
      totalAmount: Object.values(byEmployee).reduce((sum: number, e: any) => sum + e.total_amount, 0),
      employees: Object.values(byEmployee),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}