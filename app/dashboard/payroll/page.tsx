'use client'

import { useEffect, useState } from 'react'
import { SecLabel, formatDKK, Badge } from '@/components/ui'

interface Session {
  date: string
  class_name: string
  participants: number
  participants_over_30: number
  participants_under_30: number
  is_estimated: boolean
  base_rate: number
  bonus: number
  total_amount: number
}

interface PayrollResult {
  sessions_count: number
  total_participants: number
  participants_over_30: number
  participants_under_30: number
  time_total: number
  bonus_total: number
  subtotal: number
  is_freelance: boolean
  invoice_total?: number
}

interface InstructorPayroll {
  instructor: {
    id: string
    name: string
    initials: string
    level: 'junior' | 'senior'
    employment_type: 'employed' | 'freelance'
  }
  sessions_count: number
  sessions: Session[]
  payroll: PayrollResult
}

function getCurrentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const start = `${year}-${month}-01`
  const end = `${year}-${month}-${day}`
  return { start, end }
}

function calcBonusBreakdown(participants: number, rate: any) {
  const t1 = rate?.bonus_threshold_1 ?? 8
  const t2 = rate?.bonus_threshold_2 ?? 12
  const t3 = rate?.bonus_threshold_3 ?? 15
  const tier2 = rate?.bonus_tier_2 ?? 15
  const tier3 = rate?.bonus_tier_3 ?? 25
  const tier4 = rate?.bonus_tier_4 ?? 35

  if (participants <= t1) return []
  const lines = []
  if (participants > t1) {
    const count = Math.min(participants, t2) - t1
    lines.push({ label: `Trin 2 (${t1}-${t2}): ${count} × ${tier2} kr.`, amount: count * tier2 })
  }
  if (participants > t2) {
    const count = Math.min(participants, t3) - t2
    lines.push({ label: `Trin 3 (${t2}-${t3}): ${count} × ${tier3} kr.`, amount: count * tier3 })
  }
  if (participants > t3) {
    const count = participants - t3
    lines.push({ label: `Trin 4 (${t3}+): ${count} × ${tier4} kr.`, amount: count * tier4 })
  }
  return lines
}

export default function PayrollPage() {
  const [data, setData] = useState<InstructorPayroll[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(getCurrentMonthRange())
  const [selected, setSelected] = useState<InstructorPayroll | null>(null)

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

  if (selected) return (
    <InstructorDetail
      data={selected}
      period={period}
      onBack={() => setSelected(null)}
    />
  )

  return (
    <div>
      <SecLabel>Lønafregning — København</SecLabel>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: '#8a85a0', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Periode:</div>
        <input type="date" value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <span style={{ color: '#8a85a0' }}>→</span>
        <input type="date" value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <button onClick={exportCSV}
          style={{ marginLeft: 'auto', background: '#1a1228', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const }}>
          ↓ Eksporter CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Samlet lønomk.', val: formatDKK(totalPayroll), color: '#6b5ca5' },
          { label: 'Heraf timepris', val: formatDKK(totalTime) },
          { label: 'Heraf bonus', val: formatDKK(totalBonus) },
          { label: 'Hold / Deltagere', val: `${totalSessions} / ${totalParticipants}` },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: `3px solid ${(k as any).color || '#e4e0f0'}` }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: (k as any).color || '#1a1520' }}>{k.val}</div>
          </div>
        ))}
      </div>

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
                <tr key={d.instructor.id}
                  onClick={() => setSelected(d)}
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
                  <td style={{ padding: '12px 16px', color: '#8a85a0' }}>›</td>
                </tr>
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

function InstructorDetail({ data: d, period, onBack }: { data: InstructorPayroll, period: { start: string, end: string }, onBack: () => void }) {
  const baseRate = d.sessions_count > 0 ? Math.round(d.payroll.time_total / d.sessions_count) : (d.instructor.level === 'senior' ? 500 : 300)
  const totalAmount = d.instructor.employment_type === 'freelance' ? (d.payroll.invoice_total || 0) : d.payroll.subtotal

  return (
    <div>
      {/* Mørk header */}
      <div style={{ background: 'linear-gradient(90deg,#5a4898,#1a1228 60%,#5a4898)', borderRadius: 10, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.2)', border: '2px solid rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {d.instructor.initials}
          </div>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 700, color: '#fff' }}>{d.instructor.name}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Badge type={d.instructor.level}>{d.instructor.level === 'junior' ? 'Junior' : 'Senior'}</Badge>
              <Badge type={d.instructor.employment_type}>{d.instructor.employment_type === 'employed' ? 'Timeansat' : 'Selvstændig'}</Badge>
            </div>
          </div>
        </div>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', padding: '7px 18px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
          ← Alle instruktører
        </button>
      </div>

      {/* Sessions tabel */}
      <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0f0', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>
          Sessions — {period.start} til {period.end}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f7fc' }}>
              {['Dato', 'Hold', 'Deltagere', 'Over 30', 'Under 30', 'Belægning', 'Timepris', 'Bonus', 'Total'].map(h => (
                <th key={h} style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.sessions.map((s, idx) => {
              const bonusLines = calcBonusBreakdown(s.participants, {
                bonus_threshold_1: 8, bonus_threshold_2: 12, bonus_threshold_3: 15,
                bonus_tier_2: d.instructor.level === 'senior' ? 20 : 15,
                bonus_tier_3: d.instructor.level === 'senior' ? 35 : 25,
                bonus_tier_4: d.instructor.level === 'senior' ? 50 : 35,
              })
              const capacity = 18
              const pct = s.participants > 0 ? Math.round(s.participants / capacity * 100) : 0

              return (
                <tr key={idx} style={{ borderBottom: '1px solid #f0eef8' }}>
                  <td style={{ padding: '10px 14px', color: '#8a85a0' }}>{s.date}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{s.class_name}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{s.participants}</td>
                  <td style={{ padding: '10px 14px', color: '#6b5ca5', fontWeight: 600 }}>{s.participants_over_30}</td>
                  <td style={{ padding: '10px 14px', color: '#2e8b6a', fontWeight: 600 }}>{s.participants_under_30}</td>
                  <td style={{ padding: '10px 14px', color: '#8a85a0' }}>{s.participants > 0 ? `${pct}%` : '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#4a4560' }}>{formatDKK(baseRate)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {bonusLines.length > 0
                      ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f2f0f9', color: '#6b5ca5', border: '1px solid #d0c8e8', fontWeight: 600 }}>+{formatDKK(bonusLines.reduce((s, b) => s + b.amount, 0))}</span>
                      : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1a1520' }}>{formatDKK(baseRate + bonusLines.reduce((s, b) => s + b.amount, 0))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Lønafregning */}
      <div style={{ background: '#f2f0f9', border: '1px solid #d0c8e8', borderRadius: 10, padding: '20px 24px' }}>
        <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 16 }}>Lønafregning</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { label: `Timepris · ${d.sessions_count} hold × ${formatDKK(baseRate)}`, val: formatDKK(d.payroll.time_total) },
            { label: 'Bonus i alt', val: formatDKK(d.payroll.bonus_total) },
            ...(d.instructor.employment_type === 'freelance' ? [
              { label: 'Subtotal ekskl. moms', val: formatDKK(d.payroll.subtotal) },
              { label: 'Moms 25%', val: formatDKK(Math.round(d.payroll.subtotal * 0.25)) },
            ] : []),
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #d0c8e8' }}>
              <span style={{ fontSize: 12, color: '#4a4560' }}>{row.label}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#1a1520' }}>{row.val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1520' }}>
              {d.instructor.employment_type === 'freelance' ? 'Fakturabeløb inkl. moms' : 'Samlet udbetaling'}
            </span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, fontWeight: 700, color: '#1a1520' }}>{formatDKK(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}