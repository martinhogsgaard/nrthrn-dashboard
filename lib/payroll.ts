// ── LØNBEREGNING ────────────────────────────────────────────

export interface SalaryRate {
  rate_per_class: number
  bonus_threshold_1: number
  bonus_threshold_2: number
  bonus_threshold_3: number
  bonus_tier_2: number
  bonus_tier_3: number
  bonus_tier_4: number
  valid_to?: string | null
}

export interface ClassTypeRule {
  id: string
  location_id: string
  level: string
  class_type_pattern: string
  base_rate: number
  bonus_rules: BonusRule[]
  notes?: string
}

export interface BonusRule {
  from: number
  to: number
  rate: number
  type?: 'per_participant' | 'fully_booked'
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
  is_freelance: boolean
  vat_split_pct?: number
  vat_amount?: number
  invoice_total?: number
}

/**
 * Find matching class type rule for a session
 * Returns null if no rule matches — falls back to legacy SalaryRate
 */
export function findClassTypeRule(
  className: string,
  level: string,
  rules: ClassTypeRule[]
): ClassTypeRule | null {
  if (!rules || rules.length === 0) return null

  const levelRules = rules.filter(r => r.level === level)

  // Find most specific match — try each rule's pattern
  for (const rule of levelRules) {
    const patterns = rule.class_type_pattern.split('|')
    for (const pattern of patterns) {
      if (className.toLowerCase().includes(pattern.toLowerCase())) {
        return rule
      }
    }
  }
  return null
}

/**
 * Beregn bonus for én session baseret på ClassTypeRule
 */
export function calcSessionBonusFromRule(
  participants: number,
  rule: ClassTypeRule
): number {
  let bonus = 0

  for (const br of rule.bonus_rules) {
    if (br.type === 'fully_booked') {
      // Fast bonus hvis holdet er fuldt booket (participants >= br.from)
      if (participants >= br.from) {
        bonus += br.rate
      }
    } else {
      // Per-deltager bonus i interval [from, to]
      if (participants >= br.from) {
        const inTier = Math.min(participants, br.to) - br.from + 1
        bonus += inTier * br.rate
      }
    }
  }

  return Math.round(bonus)
}

/**
 * Beregn bonus for én session baseret på legacy SalaryRate (fallback)
 */
export function calcSessionBonus(participants: number, rates: SalaryRate): number {
  let bonus = 0
  const { bonus_threshold_1, bonus_threshold_2, bonus_threshold_3 } = rates

  if (participants > bonus_threshold_1) {
    const inTier = Math.min(participants, bonus_threshold_2) - bonus_threshold_1
    bonus += inTier * rates.bonus_tier_2
  }
  if (participants > bonus_threshold_2) {
    const inTier = Math.min(participants, bonus_threshold_3) - bonus_threshold_2
    bonus += inTier * rates.bonus_tier_3
  }
  if (participants > bonus_threshold_3) {
    const inTier = participants - bonus_threshold_3
    bonus += inTier * rates.bonus_tier_4
  }
  return Math.round(bonus)
}

/**
 * Beregn samlet løn for en instruktør
 * Bruger ClassTypeRule hvis tilgængelig, ellers legacy SalaryRate
 */
export function calcPayroll(
  sessions: Session[],
  rates: SalaryRate,
  isFreelance: boolean,
  classTypeRules?: ClassTypeRule[],
  level?: string
): PayrollResult {
  const sessionsCount = sessions.length
  const totalParticipants = sessions.reduce((s, x) => s + x.participants, 0)
  const over30 = sessions.reduce((s, x) => s + x.participants_over_30, 0)
  const under30 = sessions.reduce((s, x) => s + x.participants_under_30, 0)

  let timeTotal = 0
  let bonusTotal = 0

  for (const session of sessions) {
    const rule = classTypeRules && level
      ? findClassTypeRule(session.class_name, level, classTypeRules)
      : null

    if (rule) {
      timeTotal += rule.base_rate
      bonusTotal += calcSessionBonusFromRule(session.participants, rule)
    } else {
      timeTotal += rates.rate_per_class
      bonusTotal += calcSessionBonus(session.participants, rates)
    }
  }

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