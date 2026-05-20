'use client'

import { useEffect, useState } from 'react'
import { SecLabel, formatDKK } from '@/components/ui'

interface BruceSession {
  date: string
  class_type: string
  instructor_name: string
  bruce_spots: number
  total_participants: number
}

interface BruceMonth {
  month: string
  month_label: string
  visits: number
  rate: number
  is_estimated: boolean
  revenue: number
}

interface BruceData {
  data_until: string
  current_month: {
    month: string
    visits: number
    rate: number
    is_estimated: boolean
    estimated_revenue: number
    sessions_count: number
  }
  sessions: BruceSession[]
  history: BruceMonth[]
}

export default function BrucePage() {
  const [data, setData] = useState<BruceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingRate, setEditingRate] = useState(false)
  const [newRate, setNewRate] = useState(95)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const res = await fetch('/api/bruce?location=48718')
    const json = await res.json()
    setData(json)
    setNewRate(json.current_month?.rate || 95)
    setLoading(false)
  }

  async function saveRate() {
    if (!data) return
    setSaving(true)
    await fetch('/api/bruce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: data.current_month.month, rate_per_visit: newRate, notes })
    })
    setSaving(false)
    setSaved(true)
    setEditingRate(false)
    setTimeout(() => setSaved(false), 3000)
    loadData()
  }

  if (loading || !data) return <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Henter Bruce data...</div>

  const maxRevenue = Math.max(...data.history.map(h => h.revenue), 1)
  const dataUntilFormatted = data.data_until
    ? new Date(data.data_until).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <SecLabel>Bruce — København</SecLabel>
        {dataUntilFormatted && (
          <div style={{ fontSize: 11, color: '#8a85a0', background: '#f8f7fc', border: '1px solid #e4e0f0', borderRadius: 20, padding: '4px 12px' }}>
            Data til og med {dataUntilFormatted}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Bruce-besøg denne måned', val: data.current_month.visits, color: '#1a1228' },
          { label: 'Hold med Bruce-kunder', val: data.current_month.sessions_count },
          { label: 'Pris pr. besøg', val: data.current_month.rate + ' kr.', sub: data.current_month.is_estimated ? 'Estimeret' : 'Faktisk afregning' },
          { label: data.current_month.is_estimated ? 'Estimeret indtægt' : 'Faktisk indtægt', val: formatDKK(data.current_month.estimated_revenue), color: '#6b5ca5' },
        ].map((k: any, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: `3px solid ${k.color || '#e4e0f0'}` }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: k.color || '#1a1520', lineHeight: 1 }}>{k.val}</div>
            {k.sub && <div style={{ fontSize: 11, color: data.current_month.is_estimated ? '#9a6200' : '#2e8b6a', marginTop: 6, fontWeight: 600 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ background: data.current_month.is_estimated ? '#fff8e8' : '#e8f5ef', border: `1px solid ${data.current_month.is_estimated ? '#f0d080' : '#b0d8c4'}`, borderRadius: 10, padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1520', marginBottom: 4 }}>
            {data.current_month.is_estimated ? 'Afventer Bruce-afregning' : '✓ Afregning modtaget'}
          </div>
          <div style={{ fontSize: 12, color: '#8a85a0' }}>
            {data.current_month.is_estimated ? 'Beregner med 95 kr./besøg indtil afregning modtages' : `Faktisk pris: ${data.current_month.rate} kr./besøg`}
          </div>
        </div>
        {!editingRate ? (
          <button onClick={() => setEditingRate(true)}
            style={{ background: '#1a1228', border: 'none', color: '#fff', padding: '9px 20px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>
            Indtast afregning
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <label style={{ fontSize: 10, color: '#8a85a0' }}>
              Pris pr. besøg (kr.)
              <input type="number" value={newRate} onChange={e => setNewRate(Number(e.target.value))}
                style={{ display: 'block', padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', width: 80, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 10, color: '#8a85a0' }}>
              Note (valgfri)
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Fx faktura nr."
                style={{ display: 'block', padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', width: 140, marginTop: 4 }} />
            </label>
            <button onClick={saveRate} disabled={saving}
              style={{ background: '#2e8b6a', border: 'none', color: '#fff', padding: '9px 20px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
              {saving ? 'Gemmer...' : 'Gem'}
            </button>
            <button onClick={() => setEditingRate(false)}
              style={{ background: 'transparent', border: '1px solid #e4e0f0', color: '#8a85a0', padding: '9px 14px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
              Annuller
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 20 }}>Historisk Bruce-indtægt</div>
          {data.history.length === 0 ? (
            <div style={{ color: '#8a85a0', fontSize: 12 }}>Ingen historiske data endnu</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
                {data.history.map((h, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 9, color: '#8a85a0' }}>{Math.round(h.revenue / 1000)}k</div>
                    <div style={{ width: '100%', height: Math.max(Math.round(h.revenue / maxRevenue * 60), 4) + 'px', background: h.is_estimated ? '#d0c8e8' : '#6b5ca5', borderRadius: '3px 3px 0 0' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {data.history.map((h, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#8a85a0' }}>{h.month_label}</div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#6b5ca5' }} />
                  <span style={{ fontSize: 10, color: '#8a85a0' }}>Faktisk</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#d0c8e8' }} />
                  <span style={{ fontSize: 10, color: '#8a85a0' }}>Estimeret</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4e0f0' }}>
            <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>Sessions med Bruce-kunder</div>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 400 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f7fc' }}>
                  {['Dato', 'Hold', 'Instruktør', 'Bruce', 'Total', '%'].map(h => (
                    <th key={h} style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s, i) => {
                  const pct = s.total_participants > 0 ? Math.round(s.bruce_spots / s.total_participants * 100) : 0
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f0eef8' }}>
                      <td style={{ padding: '8px 12px', color: '#8a85a0' }}>{s.date}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{s.class_type}</td>
                      <td style={{ padding: '8px 12px', color: '#4a4560' }}>{s.instructor_name || '—'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: '#1a1228' }}>{s.bruce_spots}</td>
                      <td style={{ padding: '8px 12px', color: '#8a85a0' }}>{s.total_participants}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: pct > 50 ? '#f2f0f9' : '#f8f7fc', color: pct > 50 ? '#6b5ca5' : '#8a85a0' }}>{pct}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}