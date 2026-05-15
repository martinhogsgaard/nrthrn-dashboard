'use client'

import { useEffect, useState } from 'react'
import { SecLabel } from '@/components/ui'

interface ClassSession {
  id: string
  date: string
  time: string
  class_type: string
  instructor: string
  capacity: number
  participants: number
  is_cancelled: boolean
}

function getCurrentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return { start: `${year}-${month}-01`, end: `${year}-${month}-${day}` }
}

export default function NYCClassesPage() {
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(getCurrentMonthRange())
  const [filter, setFilter] = useState('')

  useEffect(() => { loadData() }, [period])

  async function loadData() {
    setLoading(true)
    const res = await fetch(`/api/classes?start=${period.start}&end=${period.end}&location=48717`)
    const json = await res.json()
    setSessions(json.sessions || [])
    setLoading(false)
  }

  const filtered = sessions.filter(s =>
    !filter ||
    s.class_type.toLowerCase().includes(filter.toLowerCase()) ||
    s.instructor.toLowerCase().includes(filter.toLowerCase())
  )

  const activeSessions = filtered.filter(s => !s.is_cancelled)
  const totalParticipants = activeSessions.reduce((s, x) => s + x.participants, 0)
  const sessionsWithCapacity = activeSessions.filter(x => x.capacity > 0)
  const avgBelægning = sessionsWithCapacity.length > 0
    ? Math.round(sessionsWithCapacity.reduce((s, x) => s + (x.participants / x.capacity * 100), 0) / sessionsWithCapacity.length)
    : 0

  const byDate = filtered.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {} as Record<string, ClassSession[]>)

  return (
    <div>
      <SecLabel>Hold — New York</SecLabel>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: '#8a85a0', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Periode:</div>
        <input type="date" value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <span style={{ color: '#8a85a0' }}>→</span>
        <input type="date" value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <input type="text" placeholder="Søg holdtype eller instruktør..."
          value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '6px 14px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520', minWidth: 240 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Hold i alt', val: activeSessions.length },
          { label: 'Total deltagere', val: totalParticipants },
          { label: 'Avg. belægning', val: `${avgBelægning}%` },
          { label: 'Dage med hold', val: Object.keys(byDate).length },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid #6b5ca5' }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: '#1a1520' }}>{k.val}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Henter hold...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Ingen hold fundet i denne periode</div>
      ) : (
        <div>
          {Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, daySessions]) => (
              <div key={date} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b5ca5', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid #e4e0f0' }}>
                  {new Date(date).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
                  <span style={{ color: '#8a85a0', fontWeight: 500, marginLeft: 8 }}>· {daySessions.filter(s => !s.is_cancelled).length} hold</span>
                  {daySessions.some(s => s.is_cancelled) && (
                    <span style={{ color: '#c0392b', fontWeight: 500, marginLeft: 8 }}>· {daySessions.filter(s => s.is_cancelled).length} aflyst</span>
                  )}
                </div>
                <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8f7fc' }}>
                        {['Tid', 'Hold', 'Instruktør', 'Deltagere', 'Kapacitet', 'Belægning', ''].map(h => (
                          <th key={h} style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {daySessions
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map((s, idx) => {
                          const pct = s.capacity > 0 ? Math.round(s.participants / s.capacity * 100) : 0
                          const color = pct >= 80 ? '#2e8b6a' : pct >= 50 ? '#9a6200' : '#c0392b'
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #f0eef8', opacity: s.is_cancelled ? 0.5 : 1, background: s.is_cancelled ? '#fafafa' : 'transparent' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1a1520', whiteSpace: 'nowrap' }}>{s.time}</td>
                              <td style={{ padding: '10px 14px', fontWeight: 500 }}>{s.class_type}</td>
                              <td style={{ padding: '10px 14px', color: '#4a4560' }}>{s.instructor || '—'}</td>
                              <td style={{ padding: '10px 14px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#1a1520' }}>{s.is_cancelled ? '—' : s.participants}</td>
                              <td style={{ padding: '10px 14px', color: '#8a85a0' }}>{s.capacity}</td>
                              <td style={{ padding: '10px 14px' }}>
                                {!s.is_cancelled && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 60, height: 6, background: '#e4e0f0', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color }}>{pct}%</span>
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                {s.is_cancelled && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: '#fdecea', color: '#c0392b', border: '1px solid #f0b8b0', fontWeight: 600 }}>Aflyst</span>}
                                {!s.is_cancelled && pct >= 90 && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: '#e8f5ef', color: '#2e8b6a', border: '1px solid #b0d8c4', fontWeight: 600 }}>Fuldt</span>}
                                {!s.is_cancelled && pct === 0 && s.capacity > 0 && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: '#fdecea', color: '#c0392b', border: '1px solid #f0b8b0', fontWeight: 600 }}>Tomt</span>}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}