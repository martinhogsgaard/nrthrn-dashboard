'use client'

import { useEffect, useState } from 'react'
import { SecLabel, Card, Badge } from '@/components/ui'

interface Location {
  id: string
  name: string
  mariana_tek_location_id: string
  currency: string
  country: string
}

interface Instructor {
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

export default function SetupPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [salaryDefaults, setSalaryDefaults] = useState<SalaryDefaults>({
    junior_rate: 300, senior_rate: 500,
    bonus_threshold_1: 8, bonus_threshold_2: 12, bonus_threshold_3: 15,
    junior_bonus_tier_2: 15, junior_bonus_tier_3: 25, junior_bonus_tier_4: 35,
    senior_bonus_tier_2: 20, senior_bonus_tier_3: 35, senior_bonus_tier_4: 50,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [editingSalary, setEditingSalary] = useState<Instructor | null>(null)
  const [salaryOverride, setSalaryOverride] = useState({ rate_per_class: 0, bonus_tier_2: 0, bonus_tier_3: 0, bonus_tier_4: 0 })
  const [savingSalary, setSavingSalary] = useState(false)

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
    setInstructors(instrData)
    setLocations(locData)
    if (settingsData.salary_defaults) setSalaryDefaults(settingsData.salary_defaults)
    setLoading(false)
  }

  async function syncAll() {
    setSyncing(true)
    setSyncResult(null)
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    const res = await fetch(`/api/sync-cache?start=${start}&end=${end}`)
    const data = await res.json()
    setSyncing(false)
    setSyncResult(`✓ ${data.sessions} · ${data.memberships} · ${data.instructors} · ${data.birthdays}`)
    loadData()
  }

  async function saveSalaryDefaults() {
    setSavingSettings(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'salary_defaults', value: salaryDefaults })
    })
    setSavingSettings(false)
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 3000)
  }

  async function saveSalaryOverride() {
    if (!editingSalary) return
    setSavingSalary(true)
    await fetch('/api/salary-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instructor_id: editingSalary.id,
        ...salaryOverride,
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: null,
      })
    })
    setSavingSalary(false)
    setEditingSalary(null)
    loadData()
  }

  async function updateInstructor(id: string, updates: Partial<Instructor>) {
    setSaving(id)
    await fetch(`/api/instructors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setInstructors(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    setSaving(null)
  }

  function openSalaryModal(instructor: Instructor) {
    const existing = instructor.salary_rates?.[0]
    setSalaryOverride({
      rate_per_class: existing?.rate_per_class || (instructor.level === 'senior' ? salaryDefaults.senior_rate : salaryDefaults.junior_rate),
      bonus_tier_2: existing?.bonus_tier_2 || (instructor.level === 'senior' ? salaryDefaults.senior_bonus_tier_2 : salaryDefaults.junior_bonus_tier_2),
      bonus_tier_3: existing?.bonus_tier_3 || (instructor.level === 'senior' ? salaryDefaults.senior_bonus_tier_3 : salaryDefaults.junior_bonus_tier_3),
      bonus_tier_4: existing?.bonus_tier_4 || (instructor.level === 'senior' ? salaryDefaults.senior_bonus_tier_4 : salaryDefaults.junior_bonus_tier_4),
    })
    setEditingSalary(instructor)
  }

  const cphInstructors = instructors.filter(i => locations.find(l => l.id === i.location_id)?.mariana_tek_location_id === '48718')
  const nycInstructors = instructors.filter(i => locations.find(l => l.id === i.location_id)?.mariana_tek_location_id === '48717')
  const unassigned = instructors.filter(i => !i.location_id)

  if (loading) return <div style={{ padding: 40, color: '#8a85a0' }}>Indlæser...</div>

  return (
    <div>
      <SecLabel>Opsætning</SecLabel>

      {/* Én sync knap */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1520', marginBottom: 4 }}>Opdater hele dashboardet</div>
            <div style={{ fontSize: 12, color: '#8a85a0' }}>Henter hold, abonnementer, instruktører og fødselsdatoer fra Mariana Tek. Kører automatisk hver morgen kl. 06:00.</div>
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

      {/* Globale lønsatser */}
      <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1520', marginBottom: 4 }}>Globale lønsatser</div>
        <div style={{ fontSize: 12, color: '#8a85a0', marginBottom: 20 }}>Standard satser for alle instruktører. Kan overrides pr. instruktør.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b5ca5', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Junior</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Timepris pr. hold (kr.)', key: 'junior_rate' },
                { label: 'Bonus trin 2 (9-12 del.) kr./del.', key: 'junior_bonus_tier_2' },
                { label: 'Bonus trin 3 (13-15 del.) kr./del.', key: 'junior_bonus_tier_3' },
                { label: 'Bonus trin 4 (16+ del.) kr./del.', key: 'junior_bonus_tier_4' },
              ].map(f => (
                <label key={f.key} style={{ fontSize: 12, color: '#4a4560' }}>
                  {f.label}
                  <input type="number" value={salaryDefaults[f.key as keyof SalaryDefaults]}
                    onChange={e => setSalaryDefaults(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                    style={{ display: 'block', width: '100%', padding: '6px 10px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4 }} />
                </label>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2e8b6a', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Senior</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Timepris pr. hold (kr.)', key: 'senior_rate' },
                { label: 'Bonus trin 2 (9-12 del.) kr./del.', key: 'senior_bonus_tier_2' },
                { label: 'Bonus trin 3 (13-15 del.) kr./del.', key: 'senior_bonus_tier_3' },
                { label: 'Bonus trin 4 (16+ del.) kr./del.', key: 'senior_bonus_tier_4' },
              ].map(f => (
                <label key={f.key} style={{ fontSize: 12, color: '#4a4560' }}>
                  {f.label}
                  <input type="number" value={salaryDefaults[f.key as keyof SalaryDefaults]}
                    onChange={e => setSalaryDefaults(p => ({ ...p, [f.key]: Number(e.target.value) }))}
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
                <input type="number" value={salaryDefaults[t.key as keyof SalaryDefaults]}
                  onChange={e => setSalaryDefaults(p => ({ ...p, [t.key]: Number(e.target.value) }))}
                  style={{ display: 'block', width: '100%', padding: '6px 10px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4 }} />
              </label>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={saveSalaryDefaults} disabled={savingSettings}
            style={{ background: savingSettings ? '#8b7bc5' : '#6b5ca5', border: 'none', color: '#fff', padding: '9px 24px', borderRadius: 24, cursor: savingSettings ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const }}>
            {savingSettings ? 'Gemmer...' : 'Gem lønsatser'}
          </button>
          {settingsSaved && <span style={{ fontSize: 11, color: '#2e8b6a', fontWeight: 500 }}>✓ Gemt</span>}
        </div>
      </div>

      {/* Instruktørliste */}
      <div style={{ marginTop: 24 }}>
        {unassigned.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#c0392b', fontWeight: 700, marginBottom: 12 }}>⚠ Ikke tildelt lokation ({unassigned.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {unassigned.map(i => <InstructorCard key={i.id} instructor={i} locations={locations} saving={saving === i.id} onUpdate={(u) => updateInstructor(i.id, u)} onEditSalary={() => openSalaryModal(i)} />)}
            </div>
          </div>
        )}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 12 }}>København ({cphInstructors.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {cphInstructors.map(i => <InstructorCard key={i.id} instructor={i} locations={locations} saving={saving === i.id} onUpdate={(u) => updateInstructor(i.id, u)} onEditSalary={() => openSalaryModal(i)} />)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 12 }}>Flatiron NYC ({nycInstructors.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {nycInstructors.map(i => <InstructorCard key={i.id} instructor={i} locations={locations} saving={saving === i.id} onUpdate={(u) => updateInstructor(i.id, u)} onEditSalary={() => openSalaryModal(i)} />)}
          </div>
        </div>
      </div>

      {/* Salary override modal */}
      {editingSalary && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 440, boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1520', marginBottom: 4 }}>Lønsats — {editingSalary.name}</div>
            <div style={{ fontSize: 12, color: '#8a85a0', marginBottom: 24 }}>Overskriver globale satser for denne instruktør</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Timepris pr. hold (kr.)', key: 'rate_per_class' },
                { label: 'Bonus trin 2 (kr./del.)', key: 'bonus_tier_2' },
                { label: 'Bonus trin 3 (kr./del.)', key: 'bonus_tier_3' },
                { label: 'Bonus trin 4 (kr./del.)', key: 'bonus_tier_4' },
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

function InstructorCard({ instructor: i, locations, saving, onUpdate, onEditSalary }: {
  instructor: Instructor
  locations: Location[]
  saving: boolean
  onUpdate: (updates: Partial<Instructor>) => void
  onEditSalary: () => void
}) {
  const hasOverride = i.salary_rates && i.salary_rates.length > 0
  return (
    <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, opacity: i.is_active ? 1 : 0.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6b5ca5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {i.initials}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1520' }}>{i.name}</div>
          {i.email && <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 2 }}>{i.email}</div>}
          <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
            <Badge type={i.level}>{i.level === 'junior' ? 'Junior' : 'Senior'}</Badge>
            <Badge type={i.employment_type}>{i.employment_type === 'employed' ? 'Timeansat' : 'Selvstændig'}</Badge>
          </div>
        </div>
      </div>
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
  )
}
