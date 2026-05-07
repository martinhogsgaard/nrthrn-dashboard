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
  salary_rates?: any[]
}

export default function SetupPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [instrRes, locRes] = await Promise.all([
      fetch('/api/instructors'),
      fetch('/api/locations'),
    ])
    const [instrData, locData] = await Promise.all([
      instrRes.json(),
      locRes.json(),
    ])
    setInstructors(instrData)
    setLocations(locData)
    setLoading(false)
  }

  async function syncInstructors() {
    setSyncing(true)
    setSyncResult(null)
    const res = await fetch('/api/sync-instructors')
    const data = await res.json()
    setSyncing(false)
    setSyncResult(`✓ ${data.synced} instruktører synkroniseret fra Mariana Tek`)
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

  const cphInstructors = instructors.filter(i => {
    const loc = locations.find(l => l.id === i.location_id)
    return loc?.mariana_tek_location_id === '48718'
  })
  const nycInstructors = instructors.filter(i => {
    const loc = locations.find(l => l.id === i.location_id)
    return loc?.mariana_tek_location_id === '48717'
  })
  const unassigned = instructors.filter(i => !i.location_id)

  if (loading) return <div style={{ padding: 40, color: '#8a85a0' }}>Indlæser...</div>

  return (
    <div>
      <SecLabel>Opsætning — instruktører og lokationer</SecLabel>

      {/* Sync knap */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1520', marginBottom: 4 }}>
              Synkroniser instruktører fra Mariana Tek
            </div>
            <div style={{ fontSize: 12, color: '#8a85a0' }}>
              Henter alle instruktørprofiler og tilføjer nye til systemet. Eksisterende data bevares.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {syncResult && <span style={{ fontSize: 11, color: '#2e8b6a', fontWeight: 500 }}>{syncResult}</span>}
            <button
              onClick={syncInstructors}
              disabled={syncing}
              style={{
                background: syncing ? '#8b7bc5' : '#6b5ca5', border: 'none', color: '#fff',
                padding: '9px 24px', borderRadius: 24, cursor: syncing ? 'not-allowed' : 'pointer',
                fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600,
                letterSpacing: '.06em', textTransform: 'uppercase',
              }}
            >
              {syncing ? 'Synkroniserer...' : '↻ Synkroniser nu'}
            </button>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 24 }}>
        {/* Ikke tildelt */}
        {unassigned.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#c0392b', fontWeight: 700, marginBottom: 12 }}>
              ⚠ Ikke tildelt lokation ({unassigned.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {unassigned.map(i => (
                <InstructorCard
                  key={i.id}
                  instructor={i}
                  locations={locations}
                  saving={saving === i.id}
                  onUpdate={(updates) => updateInstructor(i.id, updates)}
                />
              ))}
            </div>
          </div>
        )}

        {/* København */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 12 }}>
            København ({cphInstructors.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {cphInstructors.map(i => (
              <InstructorCard
                key={i.id}
                instructor={i}
                locations={locations}
                saving={saving === i.id}
                onUpdate={(updates) => updateInstructor(i.id, updates)}
              />
            ))}
          </div>
        </div>

        {/* NYC */}
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 12 }}>
            Flatiron NYC ({nycInstructors.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {nycInstructors.map(i => (
              <InstructorCard
                key={i.id}
                instructor={i}
                locations={locations}
                saving={saving === i.id}
                onUpdate={(updates) => updateInstructor(i.id, updates)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function InstructorCard({ instructor: i, locations, saving, onUpdate }: {
  instructor: Instructor
  locations: Location[]
  saving: boolean
  onUpdate: (updates: Partial<Instructor>) => void
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10,
      padding: 16, display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', flexWrap: 'wrap', gap: 12,
      opacity: i.is_active ? 1 : 0.5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#6b5ca5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {i.initials}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1520' }}>{i.name}</div>
          <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
            <Badge type={i.level}>{i.level === 'junior' ? 'Junior' : 'Senior'}</Badge>
            <Badge type={i.employment_type}>{i.employment_type === 'employed' ? 'Timeansat' : 'Selvstændig'}</Badge>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Lokation */}
        <select
          value={i.location_id || ''}
          onChange={e => onUpdate({ location_id: e.target.value || null })}
          style={{
            padding: '5px 10px', borderRadius: 8, border: '1px solid #e4e0f0',
            fontSize: 11, color: '#1a1520', fontFamily: 'Inter, sans-serif',
            background: '#f8f7fc', cursor: 'pointer',
          }}
        >
          <option value="">Vælg lokation</option>
          {locations.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        {/* Niveau */}
        <select
          value={i.level}
          onChange={e => onUpdate({ level: e.target.value as 'junior' | 'senior' })}
          style={{
            padding: '5px 10px', borderRadius: 8, border: '1px solid #e4e0f0',
            fontSize: 11, color: '#1a1520', fontFamily: 'Inter, sans-serif',
            background: '#f8f7fc', cursor: 'pointer',
          }}
        >
          <option value="junior">Junior</option>
          <option value="senior">Senior</option>
        </select>

        {/* Ansættelsesform */}
        <select
          value={i.employment_type}
          onChange={e => onUpdate({ employment_type: e.target.value as 'employed' | 'freelance' })}
          style={{
            padding: '5px 10px', borderRadius: 8, border: '1px solid #e4e0f0',
            fontSize: 11, color: '#1a1520', fontFamily: 'Inter, sans-serif',
            background: '#f8f7fc', cursor: 'pointer',
          }}
        >
          <option value="employed">Timeansat</option>
          <option value="freelance">Selvstændig</option>
        </select>

        {/* Aktiv/inaktiv */}
        <button
          onClick={() => onUpdate({ is_active: !i.is_active })}
          style={{
            padding: '5px 10px', borderRadius: 8, fontSize: 11,
            border: '1px solid #e4e0f0', cursor: 'pointer',
            background: i.is_active ? '#e8f5ef' : '#fdecea',
            color: i.is_active ? '#2e8b6a' : '#c0392b',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {i.is_active ? 'Aktiv' : 'Inaktiv'}
        </button>

        {saving && <span style={{ fontSize: 10, color: '#8a85a0' }}>Gemmer...</span>}
      </div>
    </div>
  )
}