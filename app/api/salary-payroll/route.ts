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
  const today = new Date().toISOString().split('T')[0]
  const end = month === today.slice(0, 7)
    ? today
    : new Date(year, mon, 0).toISOString().split('T')[0]
  const start = `${month}-01`

  // Hent løn via samme API som lønsiden
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nrthrn-dashboard.vercel.app'
  const res = await fetch(`${baseUrl}/api/payroll?start=${start}&end=${end}&location=48718`)
  const payrollData = await res.json()

  // Hent salary_employee_id mapping
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, salary_employee_id')
    .eq('is_active', true)
    .not('salary_employee_id', 'is', null)

  const salaryMap = Object.fromEntries((employees || []).map(e => [e.name.toLowerCase().trim(), e.salary_employee_id]))

  const lines: any[] = []

  for (const instructor of (payrollData.payroll || [])) {
    const salaryId = salaryMap[instructor.instructor.name.toLowerCase().trim()]
    if (!salaryId) continue
    if (instructor.instructor.employment_type === 'freelance') continue

    for (const s of instructor.sessions) {
      const bonusText = s.bonus > 0 ? ` + ${s.bonus} bonus` : ''
      const title = `${s.date} ${s.time || ''} ${s.class_name} — ${s.participants} del. (${s.base_rate}${bonusText} kr.)`.trim()
      lines.push({
        employee_id: instructor.instructor.id,
        name: instructor.instructor.name,
        salary_employee_id: salaryId,
        date: s.date,
        time: s.time || '',
        class_type: s.class_name,
        participants: s.participants,
        holdlon: s.base_rate,
        bonus: s.bonus,
        total: s.total_amount,
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