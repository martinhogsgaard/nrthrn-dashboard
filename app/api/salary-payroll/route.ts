import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const SALARY_BASE = 'https://api.salary.dk'
const COMPANY_ID = process.env.SALARY_COMPANY_ID!

// Løntype ID'er fra Salary — ret her hvis revisor ønsker andet
const SALARY_TYPE_HOLDLON = '797507c2-8e82-4bd6-4f6d-ad2dd229c69d'   // Timeløn
const SALARY_TYPE_BONUS   = 'f2f605ce-41b4-44fc-7e37-213b1e697769'   // Løntillæg

async function getSalaryToken() {
  const res = await fetch(`${SALARY_BASE}/v2/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiClientID: process.env.SALARY_API_CLIENT_ID,
      apiClientSecret: process.env.SALARY_API_CLIENT_SECRET,
      apiKey: process.env.SALARY_API_KEY,
    })
  })
  const data = await res.json()
  return data.data?.accessToken
}

function calcSessionPay(participants: number, baseRate: number, rate: any, defaults: any) {
  const thresh1 = defaults.bonus_threshold_1 || 8
  const thresh2 = defaults.bonus_threshold_2 || 12
  const thresh3 = defaults.bonus_threshold_3 || 15
  const t2 = rate?.bonus_tier_2 || defaults.junior_bonus_tier_2 || 0
  const t3 = rate?.bonus_tier_3 || defaults.junior_bonus_tier_3 || 0
  const t4 = rate?.bonus_tier_4 || defaults.junior_bonus_tier_4 || 0

  let bonus = 0
  if (participants >= thresh3) bonus = t4
  else if (participants >= thresh2) bonus = t3
  else if (participants >= thresh1) bonus = t2

  return { holdlon: baseRate, bonus }
}

async function buildPayrollLines(month: string) {
  const [year, mon] = month.split('-').map(Number)
  const start = `${month}-01`
  const end = new Date(year, mon, 0).toISOString().split('T')[0]

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, level, salary_employee_id, salary_rates(*), employee_roles(*)')
    .eq('is_active', true)
    .not('salary_employee_id', 'is', null)

  const { data: sessions } = await supabase
    .from('sessions_cache')
    .select('instructor_name, class_type, participants, date, time, capacity')
    .gte('date', start)
    .lte('date', end)
    .eq('is_cancelled', false)

  const { data: settings } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['salary_defaults'])

  const defaults = settings?.find(s => s.key === 'salary_defaults')?.value || {}

  const lines: any[] = []

  for (const emp of employees || []) {
    const hasInstructorRole = emp.employee_roles?.some((r: any) => r.role === 'instructor')
    if (!hasInstructorRole) continue

    const empSessions = (sessions || []).filter(s =>
      s.instructor_name?.toLowerCase().trim() === emp.name?.toLowerCase().trim()
    )
    if (empSessions.length === 0) continue

    const rate = emp.salary_rates?.[0]
    const isSenior = emp.level === 'senior'
    const baseRate = rate?.rate_per_class || (isSenior ? defaults.senior_rate : defaults.junior_rate) || 300

    for (const s of empSessions) {
      const { holdlon, bonus } = calcSessionPay(s.participants, baseRate, rate, defaults)
      const total = holdlon + bonus
      const bonusText = bonus > 0 ? ` + ${bonus} bonus` : ''
      const title = `${s.date} ${s.time} ${s.class_type} — ${s.participants} del. (${holdlon}${bonusText} kr.)`

      lines.push({
        employee_id: emp.id,
        name: emp.name,
        salary_employee_id: emp.salary_employee_id,
        date: s.date,
        time: s.time,
        class_type: s.class_type,
        participants: s.participants,
        holdlon,
        bonus,
        total,
        title,
      })
    }
  }

  return { lines, dispositionDate: end }
}

// GET — preview hvad der ville blive sendt
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month påkrævet (fx 2026-05)' }, { status: 400 })

  const { lines, dispositionDate } = await buildPayrollLines(month)

  // Grupper per medarbejder til overblik
  const byEmployee: Record<string, any> = {}
  for (const line of lines) {
    if (!byEmployee[line.employee_id]) {
      byEmployee[line.employee_id] = { name: line.name, sessions: 0, totalHoldlon: 0, totalBonus: 0, total: 0, lines: [] }
    }
    byEmployee[line.employee_id].sessions++
    byEmployee[line.employee_id].totalHoldlon += line.holdlon
    byEmployee[line.employee_id].totalBonus += line.bonus
    byEmployee[line.employee_id].total += line.total
    byEmployee[line.employee_id].lines.push({ date: line.date, time: line.time, class_type: line.class_type, participants: line.participants, holdlon: line.holdlon, bonus: line.bonus, total: line.total, title: line.title })
  }

  return NextResponse.json({
    month,
    dispositionDate,
    employeeCount: Object.keys(byEmployee).length,
    lineCount: lines.length,
    totalAmount: lines.reduce((sum, l) => sum + l.total, 0),
    employees: Object.values(byEmployee),
  })
}

// POST — send løn til Salary (én one-time pay per hold)
export async function POST(request: Request) {
  const { month, dispositionDate } = await request.json()
  if (!month) return NextResponse.json({ error: 'month påkrævet' }, { status: 400 })

  const { lines } = await buildPayrollLines(month)
  if (lines.length === 0) return NextResponse.json({ error: 'Ingen lønlinjer at sende' }, { status: 400 })

  const token = await getSalaryToken()
  if (!token) return NextResponse.json({ error: 'Kunne ikke hente Salary token' }, { status: 500 })

  const results = []
  const errors = []

  for (const line of lines) {
    const res = await fetch(`${SALARY_BASE}/v2/oneTimePays`, {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeID: line.salary_employee_id,
        amount: line.total,
        title: line.title,
        type: 'Bonus',
        approved: false,
        dispositionDate: dispositionDate,
      })
    })
    const data = await res.json()
    if (data.data?.id) {
      results.push({ name: line.name, title: line.title, amount: line.total, id: data.data.id })
    } else {
      errors.push({ name: line.name, title: line.title, error: data })
    }
  }

  return NextResponse.json({
    sent: results.length,
    errors: errors.length,
    totalAmount: results.reduce((sum, r) => sum + r.amount, 0),
    results,
    ...(errors.length > 0 ? { errorDetails: errors } : {}),
  })
}