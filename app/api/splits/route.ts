import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
  const location = searchParams.get('location') || '48718'
  const now = new Date()
  const start = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = searchParams.get('end') || now.toISOString().split('T')[0]

  // Hent sessions fra cache
  const { data: sessions } = await supabase
    .from('sessions_cache')
    .select('*')
    .eq('location_id', location)
    .gte('date', start)
    .lte('date', end)

  // Hent instruktører
  const { data: instructors } = await supabase
    .from('instructors')
    .select('*, salary_rates(*)')
    .eq('is_active', true)

  // Hent settings for lønsatser
  const { data: settingsData } = await supabase
    .from('settings')
    .select('*')
    .eq('key', 'salary_defaults')
    .single()

  const defaults = settingsData?.value || {
    junior_rate: 300, senior_rate: 500,
    bonus_threshold_1: 8, bonus_threshold_2: 12, bonus_threshold_3: 15,
    junior_bonus_tier_2: 15, junior_bonus_tier_3: 25, junior_bonus_tier_4: 35,
    senior_bonus_tier_2: 20, senior_bonus_tier_3: 35, senior_bonus_tier_4: 50,
  }

  // Hent over/under 30 fra members
  const { data: members } = await supabase
    .from('members')
    .select('mariana_tek_user_id, is_over_30')
    .not('birth_date', 'is', null)

  const over30Ids = new Set(members?.filter(m => m.is_over_30).map(m => m.mariana_tek_user_id) || [])
  const under30Ids = new Set(members?.filter(m => !m.is_over_30).map(m => m.mariana_tek_user_id) || [])
  const totalKnown = over30Ids.size + under30Ids.size
  const over30Pct = totalKnown > 0 ? over30Ids.size / totalKnown : 0.576
  const under30Pct = totalKnown > 0 ? under30Ids.size / totalKnown : 0.424

  // Beregn bonus
  function calcBonus(participants: number, rate: any, level: string) {
    const t1 = rate?.bonus_threshold_1 || defaults.bonus_threshold_1
    const t2 = rate?.bonus_threshold_2 || defaults.bonus_threshold_2
    const t3 = rate?.bonus_threshold_3 || defaults.bonus_threshold_3
    const tier2 = rate?.bonus_tier_2 || (level === 'senior' ? defaults.senior_bonus_tier_2 : defaults.junior_bonus_tier_2)
    const tier3 = rate?.bonus_tier_3 || (level === 'senior' ? defaults.senior_bonus_tier_3 : defaults.junior_bonus_tier_3)
    const tier4 = rate?.bonus_tier_4 || (level === 'senior' ? defaults.senior_bonus_tier_4 : defaults.junior_bonus_tier_4)

    if (participants <= t1) return 0
    if (participants <= t2) return (participants - t1) * tier2
    if (participants <= t3) return (t2 - t1) * tier2 + (participants - t2) * tier3
    return (t2 - t1) * tier2 + (t3 - t2) * tier3 + (participants - t3) * tier4
  }

  // Beregn pr. selvstændig instruktør
  const freelancers = (instructors || []).filter(i => i.employment_type === 'freelance')

  const freelancerData = freelancers.map(instructor => {
    const rate = instructor.salary_rates?.find((r: any) => !r.valid_to)
    const baseRate = rate?.rate_per_class || (instructor.level === 'senior' ? defaults.senior_rate : defaults.junior_rate)

    const instrSessions = (sessions || []).filter(s =>
      s.instructor_profile_id === instructor.mariana_tek_profile_id ||
      s.instructor_name === instructor.name
    )

    const sessionDetails = instrSessions.map(s => {
      const total = s.participants || 0
      const over30 = Math.round(total * over30Pct)
      const under30 = total - over30
      const bonus = calcBonus(total, rate, instructor.level)
      const totalAmount = baseRate + bonus

      // Split faktura
      const over30Amount = totalAmount * over30Pct
      const under30Amount = totalAmount * under30Pct
      const vatAmount = over30Amount * 0.25

      return {
        date: s.date,
        class_name: s.class_type,
        participants: total,
        over30,
        under30,
        base_rate: baseRate,
        bonus,
        total_amount: Math.round(totalAmount),
        over30_amount: Math.round(over30Amount),
        under30_amount: Math.round(under30Amount),
        vat_amount: Math.round(vatAmount),
        invoice_total: Math.round(totalAmount + vatAmount * over30Pct),
      }
    })

    const totals = sessionDetails.reduce((acc, s) => ({
      sessions: acc.sessions + 1,
      participants: acc.participants + s.participants,
      over30: acc.over30 + s.over30,
      under30: acc.under30 + s.under30,
      base_total: acc.base_total + s.base_rate,
      bonus_total: acc.bonus_total + s.bonus,
      amount_excl_vat: acc.amount_excl_vat + s.total_amount,
      over30_amount: acc.over30_amount + s.over30_amount,
      under30_amount: acc.under30_amount + s.under30_amount,
      vat_amount: acc.vat_amount + s.vat_amount,
      invoice_total: acc.invoice_total + s.invoice_total,
    }), { sessions: 0, participants: 0, over30: 0, under30: 0, base_total: 0, bonus_total: 0, amount_excl_vat: 0, over30_amount: 0, under30_amount: 0, vat_amount: 0, invoice_total: 0 })

    return {
      instructor: {
        id: instructor.id,
        name: instructor.name,
        initials: instructor.initials,
        email: instructor.email,
        level: instructor.level,
      },
      sessions: sessionDetails,
      totals,
    }
  }).filter(f => f.totals.sessions > 0)

  // Samlet moms-oversigt
  const allSessions = (sessions || [])
  const totalParticipants = allSessions.reduce((s, x) => s + (x.participants || 0), 0)
  const totalOver30 = Math.round(totalParticipants * over30Pct)
  const totalUnder30 = totalParticipants - totalOver30

  // Estimeret omsætning fra membership_cache
  const { data: memberships } = await supabase
    .from('membership_cache')
    .select('renewal_rate, membership_name')
    .eq('purchase_location_id', location)
    .eq('status', 'active')
    .gt('next_charge_date', new Date().toISOString())

  const totalMRR = memberships?.reduce((s, m) => s + (m.renewal_rate || 0), 0) || 0
  const over30MRR = Math.round(totalMRR * over30Pct)
  const under30MRR = Math.round(totalMRR * under30Pct)
  const vatAmount = Math.round(over30MRR * 0.25)

  return NextResponse.json({
    period: { start, end },
    split_pct: { over30: Math.round(over30Pct * 100), under30: Math.round(under30Pct * 100) },
    mrr: {
      total: totalMRR,
      over30: over30MRR,
      under30: under30MRR,
      vat: vatAmount,
    },
    sessions: {
      total: allSessions.length,
      participants: totalParticipants,
      over30: totalOver30,
      under30: totalUnder30,
    },
    freelancers: freelancerData,
  })
}
