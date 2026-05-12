'use client'

import { useEffect, useState } from 'react'
import { SecLabel, formatDKK, Badge } from '@/components/ui'

interface Session {
  date: string
  class_name: string
  participants: number
}

interface PayrollLine {
  instructor: {
    id: string
    name: string
    initials: string
    level: 'junior' | 'senior'
    employment_type: 'employed' | 'freelance'
  }
  sessions_count: number
  sessions: Session[]
  payroll: {
    sessions_count: number
    total_participants: number
    time_total: number
    bonus_total: number
    subtotal: number
    invoice_total?: number
    is_freelance: boolean
  }
}

function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = now.toISOString().split('T')[0]
  return { start, end }
}

export default function PayrollPage() {
  const [data, setData] = useState<PayrollLine[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(getCurrentMonthRange())
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { loadData() }, [period])

  async function loadData() {
    setLoading(true)
    const res = await fetch(`/api/payroll?start=${period.start}&end=${period.end}&location=48718`)
    const json = await res.json()
    setData(json.payroll || [])
    setLoading(false)
  }

  const totalSessions = data.reduce((s, i) => s + i.sessions_count, 0)
  const totalParticipants = data.reduce((s, i) => s + i.payroll.total_participants, 0)
  const totalPayroll = data.reduce((s, i) => s + (i.instructor.employment_type === 'freelance' ? (i.payroll.invoice_total || 0) : i.payroll.subtotal), 0)
  const totalBonus = data.reduce((s, i) => s + i.payroll.bonus_total, 0)
  const totalTime = data.reduce((s, i) => s + i.payroll.time_total, 0)

  function exportCSV() {
    const rows = [
      ['Instruktør', 'Niveau', 'Ansættelse', 'Hold', 'Deltagere', 'Timepris', 'Bonus', 'I alt'],
      ...data.map(d => [
        d.instructor.name,
        d.instructor.level,
        d.instructor.employment_type === 'freelance' ? 'Selvstændig' : 'Timeansat',
        d.sessions_count,
        d.payroll.total_participants,
        d.payroll.time_total,
        d.payroll.bonus_total,
        d.instructor.employment_type === 'freelance' ? (d.payroll.invoice_total || 0) : d.payroll.subtotal,
      ])
    ]
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loen-${period.start}-${period.end}.csv`
    a.click()
  }

  return (
    <div>
      <SecLabel>Lønafregning — København</SecLabel>

      {/* Periode og export */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: '#8a85a0', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Periode:</div>
        <input type="date" value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <span style={{ color: '#8a85a0' }}>→</span>
        <input type="date" value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <button onClick={exportCSV}
          style={{ marginLeft: 'auto', background: '#1a1228', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          ↓ Eksporter CSV
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Samlet lønomk.', val: formatDKK(totalPayroll), color: '#6b5ca5' },
          { label: 'Heraf timepris', val: formatDKK(totalTime) },
          { label: 'Heraf bonus', val: formatDKK(totalBonus) },
          { label: 'Hold / Deltagere', val: `${totalSessions} / ${totalParticipants}` },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: `3px solid ${k.color || '#e4e0f0'}` }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: k.color || '#1a1520' }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Tabel */}
      {loading ? (
        <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Beregner løn...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f7fc' }}>
                {['Instruktør', 'Type', 'Hold', 'Deltagere', 'Timepris', 'Bonus', 'I alt', ''].map(h => (
                  <th key={h} style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #e4e0f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <>
                  <tr key={d.instructor.id}
                    onClick={() => setExpanded(expanded === d.instructor.id ? null : d.instructor.id)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid #f0eef8' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8f7fc')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6b5ca5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {d.instructor.initials}
                        </div>
                        <span style={{ fontWeight: 600, color: '#1a1520' }}>{d.instructor.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <Badge type={d.instructor.level}>{d.instructor.level === 'junior' ? 'Junior' : 'Senior'}</Badge>
                        <Badge type={d.instructor.employment_type}>{d.instructor.employment_type === 'employed' ? 'Timeansat' : 'Selvstændig'}</Badge>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700 }}>{d.sessions_count}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700 }}>{d.payroll.total_participants}</td>
                    <td style={{ padding: '12px 16px', color: '#4a4560' }}>{formatDKK(d.payroll.time_total)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {d.payroll.bonus_total > 0
                        ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f2f0f9', color: '#6b5ca5', border: '1px solid #d0c8e8', fontWeight: 600 }}>+{formatDKK(d.payroll.bonus_total)}</span>
                        : <span style={{ color: '#8a85a0' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#1a1520' }}>
                      {formatDKK(d.instructor.employment_type === 'freelance' ? (d.payroll.invoice_total || 0) : d.payroll.subtotal)}
                      {d.instructor.employment_type === 'freelance' && <div style={{ fontSize: 9, color: '#8a85a0', fontFamily: 'Inter, sans-serif' }}>inkl. moms</div>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8a85a0', fontSize: 16 }}>
                      {expanded === d.instructor.id ? '▲' : '▼'}
                    </td>
                  </tr>
                  {expanded === d.instructor.id && (
                    <tr key={d.instructor.id + '-detail'}>
                      <td colSpan={8} style={{ padding: '0 16px 16px 58px', background: '#f8f7fc' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                          <thead>
                            <tr>
                              {['Dato', 'Hold', 'Deltagere', 'Løn'].map(h => (
                                <th key={h} style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '8px 10px 8px 0', borderBottom: '1px solid #e4e0f0', textAlign: 'left' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {d.sessions.map((s, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '6px 10px 6px 0', color: '#8a85a0' }}>{s.date}</td>
                                <td style={{ padding: '6px 10px 6px 0', fontWeight: 500 }}>{s.class_name}</td>
                                <td style={{ padding: '6px 10px 6px 0', fontWeight: 600 }}>{s.participants}</td>
                                <td style={{ padding: '6px 0', fontWeight: 600, color: '#1a1520' }}>
                                  {formatDKK(d.instructor.level === 'senior' ? 500 : 300)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f2f0f9', borderTop: '2px solid #d0c8e8' }}>
                <td colSpan={2} style={{ padding: '14px 16px', fontWeight: 700, fontSize: 13, color: '#1a1520' }}>I alt</td>
                <td style={{ padding: '14px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700 }}>{totalSessions}</td>
                <td style={{ padding: '14px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700 }}>{totalParticipants}</td>
                <td style={{ padding: '14px 16px', fontWeight: 600 }}>{formatDKK(totalTime)}</td>
                <td style={{ padding: '14px 16px', fontWeight: 600 }}>{formatDKK(totalBonus)}</td>
                <td style={{ padding: '14px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: '#6b5ca5' }}>{formatDKK(totalPayroll)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
