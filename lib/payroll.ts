// ── LØNBEREGNING ────────────────────────────────────────────
// Trappebaseret bonusmodel identisk med demo-dashboardet
// Klar til at modtage data fra Mariana Tek API

export interface SalaryRate {
  rate_per_class: number
  bonus_threshold_1: number
  bonus_threshold_2: number
  bonus_threshold_3: number
  bonus_tier_2: number
  bonus_tier_3: number
  bonus_tier_4: number
}

export interface Session {
  participants: number
  participants_over_30: number
  participants_under_30: number
  date: string
  class_name: string
}

export interface PayrollResult {
  sessions_count: number
  total_participants: number
  participants_over_30: number
  participants_under_30: number
  time_total: number
  bonus_total: number
  subtotal: number
  // Kun freelance
  is_freelance: boolean
  vat_split_pct?: number
  vat_amount?: number
  invoice_total?: number
}

/**
 * Beregn bonus for én session baseret på trappemodellen
 * Kumulativ — bonus beregnes i hvert interval for sig
 */
export function calcSessionBonus(participants: number, rates: SalaryRate): number {
  let bonus = 0
  const { bonus_threshold_1, bonus_threshold_2, bonus_threshold_3 } = rates

  // Tier 2: threshold_1+1 til threshold_2
  if (participants > bonus_threshold_1) {
    const inTier = Math.min(participants, bonus_threshold_2) - bonus_threshold_1
    bonus += inTier * rates.bonus_tier_2
  }

  // Tier 3: threshold_2+1 til threshold_3
  if (participants > bonus_threshold_2) {
    const inTier = Math.min(participants, bonus_threshold_3) - bonus_threshold_2
    bonus += inTier * rates.bonus_tier_3
  }

  // Tier 4: threshold_3+
  if (participants > bonus_threshold_3) {
    const inTier = participants - bonus_threshold_3
    bonus += inTier * rates.bonus_tier_4
  }

  return Math.round(bonus)
}

/**
 * Beregn samlet løn for en instruktør baseret på sessions
 */
export function calcPayroll(
  sessions: Session[],
  rates: SalaryRate,
  isFreelance: boolean
): PayrollResult {
  const sessionsCount = sessions.length
  const totalParticipants = sessions.reduce((s, x) => s + x.participants, 0)
  const over30 = sessions.reduce((s, x) => s + x.participants_over_30, 0)
  const under30 = sessions.reduce((s, x) => s + x.participants_under_30, 0)

  const timeTotal = sessionsCount * rates.rate_per_class
  const bonusTotal = sessions.reduce((s, x) => s + calcSessionBonus(x.participants, rates), 0)
  const subtotal = timeTotal + bonusTotal

  const result: PayrollResult = {
    sessions_count: sessionsCount,
    total_participants: totalParticipants,
    participants_over_30: over30,
    participants_under_30: under30,
    time_total: timeTotal,
    bonus_total: bonusTotal,
    subtotal,
    is_freelance: isFreelance,
  }

  // Freelance: beregn differentieret moms
  // Kun over-30 andelen af hele fakturabeløbet er momspligtig
  if (isFreelance && totalParticipants > 0) {
    const vatSplitPct = (over30 / totalParticipants) * 100
    const taxableAmount = subtotal * (over30 / totalParticipants)
    const vatAmount = Math.round(taxableAmount * 0.25)
    result.vat_split_pct = Math.round(vatSplitPct * 10) / 10
    result.vat_amount = vatAmount
    result.invoice_total = subtotal + vatAmount
  }

  return result
}

export function formatDKK(amount: number): string {
  return amount.toLocaleString('da-DK') + ' kr.'
}
