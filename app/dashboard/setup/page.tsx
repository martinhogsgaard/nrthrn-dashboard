'use client'
import { useEffect, useState } from 'react'
import { SecLabel, Card } from '@/components/ui'

interface EmployeeRole {
  id: string
  role: 'instructor' | 'receptionist' | 'cleaning' | 'other'
  hourly_rate: number | null
  monthly_salary: number | null
  salary_type: 'hourly' | 'monthly'
  sling_user_id: string | null
  notes: string | null
  is_active: boolean
}

interface ClassTypeRule {
  id: string
  level: string
  class_type_pattern: string
  base_rate: number
  bonus_rules: { from: number, to: number, rate: number, type?: string }[]
  notes?: string
}

interface Location {
  id: string
  name: string
  mariana_tek_location_id: string
  currency: string
  country: string
}

interface Employee {
  id: string
  name: string
  initials: string
  level: 'junior' | 'senior'
  employment_type: 'employed' | 'freelance'
  is_active: boolean
  location_id: string | null
  mariana_tek_id: string
  email?: string | null
  birth_date?: string | null
  salary_rates?: any[]
  employee_roles?: EmployeeRole[]
}

interface SalaryDefaults {
  junior_rate: number
  senior_rate: number
  bonus_threshold_1: number
  bonus_threshold_2: number
  bonus_threshold_3: number
  junior_bonus_tier_2: number
  junior_bonus_tier_3: number
  junior_bonus_tier_4: number
  senior_bonus_tier_2: number
  senior_bonus_tier_3: number
  senior_bonus_tier_4: number
}

const defaultSalary: SalaryDefaults = {
  junior_rate: 300, senior_rate: 500,
  bonus_threshold_1: 8, bonus_threshold_2: 12, bonus_threshold_3: 15,
  junior_bonus_tier_2: 15, junior_bonus_tier_3: 25, junior_bonus_tier_4: 35,
  senior_bonus_tier_2: 20, senior_bonus_tier_3: 35, senior_bonus_tier_4: 50,
}

const ROLE_LABELS: Record<string, string> = {
  instructor: 'Instruktør',
  receptionist: 'Front desk',
  cleaning: 'Rengøring',
  other: 'Andet',
}

const ROLE_COLORS: Record<string, { bg: string, color: string, border: string }> = {
  instructor: { bg: '#f2f0f9', color: '#6b5ca5', border: '#d0c8e8' },
  receptionist: { bg: '#e8f5ef', color: '#2e8b6a', border: '#b0d8c4' },
  cleaning: { bg: '#fff3d4', color: '#9a6200', border: '#f0d080' },
  other: { bg: '#f0f0f0', color: '#666', border: '#d8d8d8' },
}

const sortActive = (arr: Employee[]) =>
  [...arr].sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0))

function ClassTypeRulesSection() {
  const [rules, setRules] = useState<ClassTypeRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/class-type-rules?location=48718')
      .then(r => r.json())
      .then(d => { setRules(d); setLoading(false) })
  }, [])

  function updateRule(id: string, field: string, value: any) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function updateBonusRule(ruleId: string, idx: number, field: string, value: number) {
    setRules(prev => prev.map(r => {
      if (r.id !== ruleId) return r
      const newBonus = [...r.bonus_rules]
      newBonus[idx] = { ...newBonus[idx], [field]: value }
      return { ...r, bonus_rules: newBonus }
    }))
  }

  async function saveRule(rule: ClassTypeRule) {
    setSaving(rule.id)
    await fetch('/api/class-type-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rule.id, base_rate: rule.base_rate, bonus_rules: rule.bonus_rules, notes: rule.notes })
    })
    setSaving(null)
    setSaved(rule.id)
    setTimeout(() => setSaved(null), 2000)
  }

  if (loading) return <div style={{ padding: 20, color: '#8a85a0' }}>Indlæser lønsatser...</div>

  const juniorRules = rules.filter(r => r.level === 'junior')
  const seniorRules = rules.filter(r => r.level === 'senior')

  return (
    <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginTop: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1520', marginBottom: 4 }}>Lønsatser, København</div>
      <div style={{ fontSize: 12, color: '#8a85a0', marginBottom: 20 }}>Holdtype-baserede satser. Bonus angives som fast beløb per session i intervallet.</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {[{ label: 'Junior', color: '#6b5ca5', rulesList: juniorRules }, { label: 'Senior', color: '#2e8b6a', rulesList: seniorRules }].map(({ label, color, rulesList }) => (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 14 }}>{label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {rulesList.map(rule => (
                <div key={rule.id} style={{ background: '#f8f7fc', border: '1px solid #e4e0f0', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1520', marginBottom: 10 }}>{rule.class_type_pattern.replace('|', ' / ')}</div>
                  <label style={{ fontSize: 11, color: '#4a4560' }}>
                    Løn (kr.)
                    <input type="number" value={rule.base_rate}
                      onChange={e => updateRule(rule.id, 'base_rate', Number(e.target.value))}
                      style={{ display: 'block', width: '100%', padding: '5px 8px', border: '1px solid #e4e0f0', borderRadius: 6, fontSize: 12, fontFamily: 'Inter, sans-serif', marginTop: 3 }} />
                  </label>
                  {rule.bonus_rules.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10, color: '#8a85a0', marginBottom: 6, letterSpacing: '.08em', textTransform: 'uppercase' }}>Bonus</div>
                      {rule.bonus_rules.map((br, idx) => (
                        br.type === 'fully_booked' ? (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#4a4560', flex: 1 }}>Fuldt booket bonus (kr.)</span>
                            <input type="number" value={br.rate}
                              onChange={e => updateBonusRule(rule.id, idx, 'rate', Number(e.target.value))}
                              style={{ width: 70, padding: '4px 8px', border: '1px solid #e4e0f0', borderRadius: 6, fontSize: 12, fontFamily: 'Inter, sans-serif' }} />
                          </div>
                        ) : br.rate === 0 ? null : (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#4a4560', flex: 1 }}>{br.from}–{br.to} del. (kr.)</span>
                            <input type="number" value={br.rate}
                              onChange={e => updateBonusRule(rule.id, idx, 'rate', Number(e.target.value))}
                              style={{ width: 70, padding: '4px 8px', border: '1px solid #e4e0f0', borderRadius: 6, fontSize: 12, fontFamily: 'Inter, sans-serif' }} />
                          </div>
                        )
                      ))}
                    </div>
                  )}
                  <button onClick={() => saveRule(rule)} disabled={saving === rule.id}
                    style={{ marginTop: 10, background: saved === rule.id ? '#2e8b6a' : saving === rule.id ? '#8b7bc5' : '#6b5ca5', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 16, cursor: 'pointer', fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    {saved === rule.id ? '✓ Gemt' : saving === rule.id ? 'Gemmer...' : 'Gem'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SalarySection({ title, currency, settingsKey, defaults }: {
  title: string
  currency: 'DKK' | 'USD'
  settingsKey: string
  defaults: SalaryDefaults
}) {
  const [values, setValues] = useState<SalaryDefaults>(defaults)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setValues(defaults) }, [JSON.stringify(defaults)])

  async function save() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: settingsKey, value: values })
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const curr = currency === 'USD' ? '$' : 'kr.'

  return (
    <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginTop: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1520', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#8a85a0', marginBottom: 20 }}>Standard satser for alle instruktører. Kan overrides pr. instruktør.</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b5ca5', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Junior</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: `Løn pr. hold (${curr})`, key: 'junior_rate' },
              { label: `Bonus trin 2 (${curr})`, key: 'junior_bonus_tier_2' },
              { label: `Bonus trin 3 (${curr})`, key: 'junior_bonus_tier_3' },
              { label: `Bonus trin 4 (${curr})`, key: 'junior_bonus_tier_4' },
            ].map(f => (
              <label key={f.key} style={{ fontSize: 12, color: '#4a4560' }}>
                {f.label}
                <input type="number" value={values[f.key as keyof SalaryDefaults]}
                  onChange={e => setValues(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                  style={{ display: 'block', width: '100%', padding: '6px 10px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4 }} />
              </label>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#2e8b6a', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Senior</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: `Løn pr. hold (${curr})`, key: 'senior_rate' },
              { label: `Bonus trin 2 (${curr})`, key: 'senior_bonus_tier_2' },
              { label: `Bonus trin 3 (${curr})`, key: 'senior_bonus_tier_3' },
              { label: `Bonus trin 4 (${curr})`, key: 'senior_bonus_tier_4' },
            ].map(f => (
              <label key={f.key} style={{ fontSize: 12, color: '#4a4560' }}>
                {f.label}
                <input type="number" value={values[f.key as keyof SalaryDefaults]}
                  onChange={e => setValues(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                  style={{ display: 'block', width: '100%', padding: '6px 10px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4 }} />
              </label>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e4e0f0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8a85a0', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Bonustærskler (deltagere)</div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Trin 1 → 2', key: 'bonus_threshold_1' },
            { label: 'Trin 2 → 3', key: 'bonus_threshold_2' },
            { label: 'Trin 3 → 4', key: 'bonus_threshold_3' },
          ].map(t => (
            <label key={t.key} style={{ fontSize: 12, color: '#4a4560', flex: 1 }}>
              {t.label}
              <input type="number" value={values[t.key as keyof SalaryDefaults]}
                onChange={e => setValues(p => ({ ...p, [t.key]: Number(e.target.value) }))}
                style={{ display: 'block', width: '100%', padding: '6px 10px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4 }} />
            </label>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={save} disabled={saving}
          style={{ background: saving ? '#8b7bc5' : '#6b5ca5', border: 'none', color: '#fff', padding: '9px 24px', borderRadius: 24, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const }}>
          {saving ? 'Gemmer...' : 'Gem lønsatser'}
        </button>
        {saved && <span style={{ fontSize: 11, color: '#2e8b6a', fontWeight: 500 }}>✓ Gemt</span>}
      </div>
    </div>
  )
}

function RoleModal({ employee, onClose, onSaved }: {
  employee: Employee
  onClose: () => void
  onSaved: () => void
}) {
  const [role, setRole] = useState<'receptionist' | 'cleaning' | 'other'>('receptionist')
  const [salaryType, setSalaryType] = useState<'hourly' | 'monthly'>('hourly')
  const [hourlyRate, setHourlyRate] = useState(150)
  const [monthlySalary, setMonthlySalary] = useState(0)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch('/api/employee-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employee.id,
        role,
        hourly_rate: salaryType === 'hourly' ? hourlyRate : null,
        monthly_salary: salaryType === 'monthly' ? monthlySalary : null,
        salary_type: salaryType,
      })
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 380, boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1520', marginBottom: 4 }}>Tilføj rolle — {employee.name}</div>
        <div style={{ fontSize: 12, color: '#8a85a0', marginBottom: 20 }}>Tilknyt en arbejdsfunktion med separat lønberegning</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ fontSize: 12, color: '#4a4560' }}>
            Rolle
            <select value={role} onChange={e => setRole(e.target.value as any)}
              style={{ display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
              <option value="receptionist">Front desk / Receptionist</option>
              <option value="cleaning">Rengøring</option>
              <option value="other">Andet</option>
            </select>
          </label>
          <label style={{ fontSize: 12, color: '#4a4560' }}>
            Løntype
            <select value={salaryType} onChange={e => setSalaryType(e.target.value as any)}
              style={{ display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
              <option value="hourly">Timeløn (beregnes fra Sling vagter)</option>
              <option value="monthly">Fast månedsløn</option>
            </select>
          </label>
          {salaryType === 'hourly' && (
            <label style={{ fontSize: 12, color: '#4a4560' }}>
              Timesats (kr.)
              <input type="number" value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))}
                style={{ display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4, boxSizing: 'border-box' as const }} />
            </label>
          )}
          {salaryType === 'monthly' && (
            <label style={{ fontSize: 12, color: '#4a4560' }}>
              Månedsløn (kr.)
              <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(Number(e.target.value))}
                style={{ display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4, boxSizing: 'border-box' as const }} />
            </label>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={save} disabled={saving}
            style={{ flex: 1, background: '#6b5ca5', border: 'none', color: '#fff', padding: '10px', borderRadius: 24, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            {saving ? 'Gemmer...' : 'Tilføj rolle'}
          </button>
          <button onClick={onClose}
            style={{ flex: 1, background: '#f8f7fc', border: '1px solid #e4e0f0', color: '#1a1520', padding: '10px', borderRadius: 24, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
            Annuller
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateEmployeeModal({ locations, onClose, onSaved }: {
  locations: Location[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [locationId, setLocationId] = useState('')
  const [role, setRole] = useState<'receptionist' | 'cleaning' | 'other'>('receptionist')
  const [salaryType, setSalaryType] = useState<'hourly' | 'monthly'>('hourly')
  const [hourlyRate, setHourlyRate] = useState(150)
  const [monthlySalary, setMonthlySalary] = useState(0)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const initials = name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const empRes = await fetch('/api/instructors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        initials,
        email: email || null,
        location_id: locationId || null,
        level: 'junior',
        employment_type: 'employed',
        is_active: true,
        mariana_tek_id: '',
        mariana_tek_profile_id: '',
      })
    })
    const emp = await empRes.json()
    if (emp.id) {
      await fetch('/api/employee-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: emp.id,
          role,
          hourly_rate: salaryType === 'hourly' ? hourlyRate : null,
          monthly_salary: salaryType === 'monthly' ? monthlySalary : null,
          salary_type: salaryType,
        })
      })
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1520', marginBottom: 4 }}>Opret medarbejder</div>
        <div style={{ fontSize: 12, color: '#8a85a0', marginBottom: 20 }}>Manuel oprettelse — f.eks. vicevært eller rengøring</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: 12, color: '#4a4560' }}>
            Navn *
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4, boxSizing: 'border-box' as const }} />
          </label>
          <label style={{ fontSize: 12, color: '#4a4560' }}>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4, boxSizing: 'border-box' as const }} />
          </label>
          <label style={{ fontSize: 12, color: '#4a4560' }}>
            Lokation
            <select value={locationId} onChange={e => setLocationId(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
              <option value="">Vælg lokation</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, color: '#4a4560' }}>
            Rolle
            <select value={role} onChange={e => setRole(e.target.value as any)}
              style={{ display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
              <option value="receptionist">Front desk / Receptionist</option>
              <option value="cleaning">Rengøring</option>
              <option value="other">Andet</option>
            </select>
          </label>
          <label style={{ fontSize: 12, color: '#4a4560' }}>
            Løntype
            <select value={salaryType} onChange={e => setSalaryType(e.target.value as any)}
              style={{ display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
              <option value="hourly">Timeløn</option>
              <option value="monthly">Fast månedsløn</option>
            </select>
          </label>
          {salaryType === 'hourly' && (
            <label style={{ fontSize: 12, color: '#4a4560' }}>
              Timesats (kr.)
              <input type="number" value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))}
                style={{ display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4, boxSizing: 'border-box' as const }} />
            </label>
          )}
          {salaryType === 'monthly' && (
            <label style={{ fontSize: 12, color: '#4a4560' }}>
              Månedsløn (kr.)
              <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(Number(e.target.value))}
                style={{ display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4, boxSizing: 'border-box' as const }} />
            </label>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={save} disabled={saving || !name.trim()}
            style={{ flex: 1, background: !name.trim() ? '#ccc' : '#6b5ca5', border: 'none', color: '#fff', padding: '10px', borderRadius: 24, cursor: name.trim() ? 'pointer' : 'not-allowed', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            {saving ? 'Opretter...' : 'Opret medarbejder'}
          </button>
          <button onClick={onClose}
            style={{ flex: 1, background: '#f8f7fc', border: '1px solid #e4e0f0', color: '#1a1520', padding: '10px', borderRadius: 24, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
            Annuller
          </button>
        </div>
      </div>
    </div>
  )
}

function EmployeeCard({ employee: i, locations, saving, onUpdate, onEditSalary, onRolesChanged }: {
  employee: Employee
  locations: Location[]
  saving: boolean
  onUpdate: (updates: Partial<Employee>) => void
  onEditSalary: () => void
  onRolesChanged: () => void
}) {
  const hasOverride = i.salary_rates && i.salary_rates.length > 0
  const roles = i.employee_roles || []
  const [showRoleModal, setShowRoleModal] = useState(false)

  async function removeRole(role: string) {
    await fetch(`/api/employee-roles?employee_id=${i.id}&role=${role}`, { method: 'DELETE' })
    onRolesChanged()
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 16, opacity: i.is_active ? 1 : 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        {/* Venstre: avatar + navn + rolle-badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6b5ca5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {i.initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1520' }}>{i.name}</div>
            {i.email && <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 1 }}>{i.email}</div>}
            {/* Rolle badges under navn */}
            <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              {roles.map(r => {
                const c = ROLE_COLORS[r.role] || ROLE_COLORS.other
                return (
                  <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                      {ROLE_LABELS[r.role]}
                      {r.role !== 'instructor' && r.hourly_rate ? ` · ${r.hourly_rate} kr/t` : ''}
                      {r.role !== 'instructor' && r.monthly_salary ? ` · ${r.monthly_salary} kr/md` : ''}
                    </span>
                    {r.role !== 'instructor' && (
                      <button onClick={() => removeRole(r.role)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 11, padding: '0 1px', lineHeight: 1 }}>
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Højre: knapper */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={i.location_id || ''} onChange={e => onUpdate({ location_id: e.target.value || null })}
            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e4e0f0', fontSize: 11, color: '#1a1520', fontFamily: 'Inter, sans-serif', background: '#f8f7fc', cursor: 'pointer' }}>
            <option value="">Vælg lokation</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={i.level} onChange={e => onUpdate({ level: e.target.value as 'junior' | 'senior' })}
            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e4e0f0', fontSize: 11, color: '#1a1520', fontFamily: 'Inter, sans-serif', background: '#f8f7fc', cursor: 'pointer' }}>
            <option value="junior">Junior</option>
            <option value="senior">Senior</option>
          </select>
          <select value={i.employment_type} onChange={e => onUpdate({ employment_type: e.target.value as 'employed' | 'freelance' })}
            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e4e0f0', fontSize: 11, color: '#1a1520', fontFamily: 'Inter, sans-serif', background: '#f8f7fc', cursor: 'pointer' }}>
            <option value="employed">Timeansat</option>
            <option value="freelance">Selvstændig</option>
          </select>
          <button onClick={() => setShowRoleModal(true)}
            style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, border: '1px dashed #d0c8e8', cursor: 'pointer', background: '#f8f7fc', color: '#8a85a0', fontFamily: 'Inter, sans-serif' }}>
            + Rolle
          </button>
          <button onClick={() => onUpdate({ is_active: !i.is_active })}
            style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, border: '1px solid #e4e0f0', cursor: 'pointer', background: i.is_active ? '#e8f5ef' : '#fdecea', color: i.is_active ? '#2e8b6a' : '#c0392b', fontFamily: 'Inter, sans-serif' }}>
            {i.is_active ? 'Aktiv' : 'Inaktiv'}
          </button>
          <button onClick={onEditSalary}
            style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, border: `1px solid ${hasOverride ? '#6b5ca5' : '#e4e0f0'}`, cursor: 'pointer', background: hasOverride ? '#f2f0f9' : '#f8f7fc', color: hasOverride ? '#6b5ca5' : '#8a85a0', fontFamily: 'Inter, sans-serif', fontWeight: hasOverride ? 600 : 400 }}>
            {hasOverride ? '★ Løn' : 'Løn'}
          </button>
          {saving && <span style={{ fontSize: 10, color: '#8a85a0' }}>Gemmer...</span>}
        </div>
      </div>

      {showRoleModal && (
        <RoleModal
          employee={i}
          onClose={() => setShowRoleModal(false)}
          onSaved={onRolesChanged}
        />
      )}
    </div>
  )
}

export default function SetupPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [cphSalary, setCphSalary] = useState<SalaryDefaults>(defaultSalary)
  const [nycSalary, setNycSalary] = useState<SalaryDefaults>(defaultSalary)
  const [editingSalary, setEditingSalary] = useState<Employee | null>(null)
  const [salaryOverride, setSalaryOverride] = useState({ rate_per_class: 0, bonus_tier_2: 0, bonus_tier_3: 0, bonus_tier_4: 0 })
  const [savingSalary, setSavingSalary] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [instrRes, locRes, settingsRes] = await Promise.all([
      fetch('/api/instructors?all=true'),
      fetch('/api/locations'),
      fetch('/api/settings'),
    ])
    const [instrData, locData, settingsData] = await Promise.all([
      instrRes.json(), locRes.json(), settingsRes.json(),
    ])
    setEmployees(instrData)
    setLocations(locData)
    if (settingsData.salary_defaults) setCphSalary(settingsData.salary_defaults)
    if (settingsData.salary_defaults_nyc) setNycSalary(settingsData.salary_defaults_nyc)
    setLoading(false)
  }

  async function syncAll() {
    setSyncing(true)
    setSyncResult(null)
    const res = await fetch('/api/sync-cache')
    const data = await res.json()
    setSyncing(false)
    setSyncResult(`✓ ${data.sessions} · ${data.memberships} · ${data.instructors}`)
    loadData()
  }

  async function saveSalaryOverride() {
    if (!editingSalary) return
    setSavingSalary(true)
    await fetch('/api/salary-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: editingSalary.id,
        ...salaryOverride,
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: null,
      })
    })
    setSavingSalary(false)
    setEditingSalary(null)
    loadData()
  }

  async function updateEmployee(id: string, updates: Partial<Employee>) {
    setSaving(id)
    await fetch(`/api/instructors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setEmployees(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    setSaving(null)
  }

  function openSalaryModal(employee: Employee) {
    const isNYC = locations.find(l => l.id === employee.location_id)?.mariana_tek_location_id === '48717'
    const defaults = isNYC ? nycSalary : cphSalary
    const existing = employee.salary_rates?.[0]
    setSalaryOverride({
      rate_per_class: existing?.rate_per_class || (employee.level === 'senior' ? defaults.senior_rate : defaults.junior_rate),
      bonus_tier_2: existing?.bonus_tier_2 || (employee.level === 'senior' ? defaults.senior_bonus_tier_2 : defaults.junior_bonus_tier_2),
      bonus_tier_3: existing?.bonus_tier_3 || (employee.level === 'senior' ? defaults.senior_bonus_tier_3 : defaults.junior_bonus_tier_3),
      bonus_tier_4: existing?.bonus_tier_4 || (employee.level === 'senior' ? defaults.senior_bonus_tier_4 : defaults.junior_bonus_tier_4),
    })
    setEditingSalary(employee)
  }

  const cphEmployees = sortActive(employees.filter(i => locations.find(l => l.id === i.location_id)?.mariana_tek_location_id === '48718'))
  const nycEmployees = sortActive(employees.filter(i => locations.find(l => l.id === i.location_id)?.mariana_tek_location_id === '48717'))
  const unassigned = sortActive(employees.filter(i => !i.location_id))

  if (loading) return <div style={{ padding: 40, color: '#8a85a0' }}>Indlæser...</div>

  return (
    <div>
      <SecLabel>Personale</SecLabel>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1520', marginBottom: 4 }}>Opdater hele dashboardet</div>
            <div style={{ fontSize: 12, color: '#8a85a0' }}>Henter hold, abonnementer og medarbejdere fra Mariana Tek. Kører automatisk hver morgen kl. 05:00.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {syncResult && <span style={{ fontSize: 11, color: '#2e8b6a', fontWeight: 500 }}>{syncResult}</span>}
            <button onClick={syncAll} disabled={syncing}
              style={{ background: syncing ? '#8b7bc5' : '#1a1228', border: 'none', color: '#fff', padding: '9px 24px', borderRadius: 24, cursor: syncing ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const }}>
              {syncing ? 'Opdaterer...' : '↻ Opdater data'}
            </button>
          </div>
        </div>
      </Card>

      <ClassTypeRulesSection />

      {/* Medarbejderliste header med opret-knap */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1520' }}>Medarbejdere</div>
        <button onClick={() => setShowCreateModal(true)}
          style={{ background: '#1a1228', border: 'none', color: '#fff', padding: '7px 18px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em' }}>
          + Opret medarbejder
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {unassigned.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#c0392b', fontWeight: 700, marginBottom: 12 }}>⚠ Ikke tildelt lokation ({unassigned.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {unassigned.map(i => (
                <EmployeeCard key={i.id} employee={i} locations={locations} saving={saving === i.id}
                  onUpdate={(u) => updateEmployee(i.id, u)}
                  onEditSalary={() => openSalaryModal(i)}
                  onRolesChanged={loadData} />
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 12 }}>København ({cphEmployees.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cphEmployees.map(i => (
              <EmployeeCard key={i.id} employee={i} locations={locations} saving={saving === i.id}
                onUpdate={(u) => updateEmployee(i.id, u)}
                onEditSalary={() => openSalaryModal(i)}
                onRolesChanged={loadData} />
            ))}
          </div>
        </div>

        <div>
          <SalarySection title="Lønsatser, New York" currency="USD" settingsKey="salary_defaults_nyc" defaults={nycSalary} />
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 12, marginTop: 24 }}>New York ({nycEmployees.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nycEmployees.map(i => (
              <EmployeeCard key={i.id} employee={i} locations={locations} saving={saving === i.id}
                onUpdate={(u) => updateEmployee(i.id, u)}
                onEditSalary={() => openSalaryModal(i)}
                onRolesChanged={loadData} />
            ))}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateEmployeeModal
          locations={locations}
          onClose={() => setShowCreateModal(false)}
          onSaved={loadData}
        />
      )}

      {editingSalary && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 440, boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1520', marginBottom: 4 }}>Lønsats — {editingSalary.name}</div>
            <div style={{ fontSize: 12, color: '#8a85a0', marginBottom: 24 }}>Overskriver globale satser for denne medarbejder</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Løn pr. hold', key: 'rate_per_class' },
                { label: 'Bonus trin 2 (kr.)', key: 'bonus_tier_2' },
                { label: 'Bonus trin 3 (kr.)', key: 'bonus_tier_3' },
                { label: 'Bonus trin 4 (kr.)', key: 'bonus_tier_4' },
              ].map(f => (
                <label key={f.key} style={{ fontSize: 12, color: '#4a4560' }}>
                  {f.label}
                  <input type="number" value={salaryOverride[f.key as keyof typeof salaryOverride]}
                    onChange={e => setSalaryOverride(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4, boxSizing: 'border-box' as const }} />
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={saveSalaryOverride} disabled={savingSalary}
                style={{ flex: 1, background: '#6b5ca5', border: 'none', color: '#fff', padding: '10px', borderRadius: 24, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                {savingSalary ? 'Gemmer...' : 'Gem lønsats'}
              </button>
              <button onClick={() => setEditingSalary(null)}
                style={{ flex: 1, background: '#f8f7fc', border: '1px solid #e4e0f0', color: '#1a1520', padding: '10px', borderRadius: 24, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                Annuller
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}