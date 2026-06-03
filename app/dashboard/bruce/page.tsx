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

function EditMonthModal({ month, currentRate, currentVisits, onClose, onSaved }: {
  month: BruceMonth
  currentRate: number
  currentVisits: number
  onClose: () => void
  onSaved: () => void
}) {
  const [rate, setRate] = useState(currentRate)
  const [visitsNoVat, setVisitsNoVat] = useState(0)
  const [visitsVat, setVisitsVat] = useState(0)
  const [noShowsNoVat, setNoShowsNoVat] = useState(0)
  const [noShowsVat, setNoShowsVat] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const totalVisits = visitsNoVat + visitsVat + noShowsNoVat + noShowsVat
  const totalAmount = Math.round(totalVisits * rate)
  const vatAmount = Math.round((visitsVat + noShowsVat) * rate * 0.25)

  async function save() {
    setSaving(true)
    await fetch('/api/bruce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        month: month.month,
        rate_per_visit: rate,
        actual_visits: totalVisits,
        visits_no_vat: visitsNoVat,
        visits_vat: visitsVat,
        no_shows_no_vat: noShowsNoVat,
        no_shows_vat: noShowsVat,
        notes,
      })
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  const fieldStyle = { display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4, boxSizing: 'border-box' as const }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 480, boxShadow: '0 24px 64px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1520', marginBottom: 4 }}>
          Bruce afregning — {month.month_label}
        </div>
        <div style={{ fontSize: 12, color: '#8a85a0', marginBottom: 20 }}>
          Indtast tal direkte fra Bruce fakturaen
        </div>

        <label style={{ fontSize: 12, color: '#4a4560', display: 'block', marginBottom: 14 }}>
          Pris pr. besøg (kr.)
          <input type="number" step="0.01" value={rate} onChange={e => setRate(Number(e.target.value))} style={fieldStyle} />
        </label>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#8a85a0', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10, marginTop: 4 }}>Visits</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#4a4560' }}>
            Visits — 0% moms
            <input type="number" value={visitsNoVat} onChange={e => setVisitsNoVat(Number(e.target.value))} style={fieldStyle} />
          </label>
          <label style={{ fontSize: 12, color: '#4a4560' }}>
            Visits — 25% moms
            <input type="number" value={visitsVat} onChange={e => setVisitsVat(Number(e.target.value))} style={fieldStyle} />
          </label>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#8a85a0', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>No shows</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#4a4560' }}>
            No shows — 0% moms
            <input type="number" value={noShowsNoVat} onChange={e => setNoShowsNoVat(Number(e.target.value))} style={fieldStyle} />
          </label>
          <label style={{ fontSize: 12, color: '#4a4560' }}>
            No shows — 25% moms
            <input type="number" value={noShowsVat} onChange={e => setNoShowsVat(Number(e.target.value))} style={fieldStyle} />
          </label>
        </div>

        <div style={{ background: '#f8f7fc', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#8a85a0' }}>Total besøg</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1520' }}>{totalVisits}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#8a85a0' }}>Ekskl. moms</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1520' }}>{formatDKK(totalAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#8a85a0' }}>Moms (25%)</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1520' }}>{formatDKK(vatAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #e4e0f0', marginTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1520' }}>I alt inkl. moms</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6b5ca5' }}>{formatDKK(totalAmount + vatAmount)}</span>
          </div>
        </div>

        <label style={{ fontSize: 12, color: '#4a4560', display: 'block', marginBottom: 20 }}>
          Note (valgfri)
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Fx fakturanummer 2523-17"
            style={fieldStyle} />
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={save} disabled={saving || totalVisits === 0}
            style={{ flex: 1, background: totalVisits === 0 ? '#ccc' : '#2e8b6a', border: 'none', color: '#fff', padding: '10px', borderRadius: 24, cursor: totalVisits > 0 ? 'pointer' : 'not-allowed', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            {saving ? 'Gemmer...' : 'Gem afregning'}
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

export default function BrucePage() {
  const [data, setData] = useState<BruceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingMonth, setEditingMonth] = useState<BruceMonth | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const res = await fetch('/api/bruce?location=48718')
    const json = await res.json()
    setData(json)
    setLoading(false)
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

              <div style={{ marginTop: 20, borderTop: '1px solid #e4e0f0', paddingTop: 16 }}>
                <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 12 }}>Månedsoversigt</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[...data.history].reverse().map((h, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: '#f8f7fc', border: '1px solid #e4e0f0' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1520' }}>{h.month_label}</div>
                        <div style={{ fontSize: 11, color: '#8a85a0' }}>{h.visits} besøg · {h.rate} kr./besøg</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif', color: '#1a1520' }}>{formatDKK(h.revenue)}</span>
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: h.is_estimated ? '#fff3d4' : '#e8f5ef', color: h.is_estimated ? '#9a6200' : '#2e8b6a', fontWeight: 600 }}>
                          {h.is_estimated ? 'Est.' : '✓'}
                        </span>
                        <button onClick={() => setEditingMonth(h)}
                          style={{ fontSize: 10, padding: '4px 10px', borderRadius: 8, border: '1px solid #e4e0f0', background: '#fff', color: '#6b5ca5', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          {h.is_estimated ? 'Indtast afregning' : 'Ret'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4e0f0' }}>
            <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>Sessions med Bruce-kunder</div>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 500 }}>
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

      {editingMonth && (
        <EditMonthModal
          month={editingMonth}
          currentRate={editingMonth.rate}
          currentVisits={editingMonth.visits}
          onClose={() => setEditingMonth(null)}
          onSaved={loadData}
        />
      )}
    </div>
  )
}