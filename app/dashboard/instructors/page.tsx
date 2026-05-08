'use client'

import { useEffect, useState } from 'react'
import { SecLabel, Card, Badge, formatDKK } from '@/components/ui'
import { calcSessionBonus, type SalaryRate } from '@/lib/payroll'

interface Session {
  date: string
  class_name: string
  participants: number
  participants_over_30: number
  participants_under_30: number
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
  vat_split_pct?: number
  vat_amount?: number
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
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = now.toISOString().split('T')[0]
  return { start, end }
}

export default function InstructorsPage() {
  const [data, setData] = useState<InstructorPayroll[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<InstructorPayroll | null>(null)
  const [period, setPeriod] = useState(getCurrentMonthRange())

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
  const totalCost = data.reduce((s, i) => s + (i.instructor.employment_type === 'freelance' ? (i.payroll.invoice_total || 0) : i.payroll.subtotal), 0)

  if (selected) return <InstructorDetail data={selected} onBack={() => setSelected(null)} />

  return (
    <div>
      <SecLabel>Instruktøroversigt — København</SecLabel>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#8a85a0', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Periode:</div>
        <input type="date" value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <span style={{ color: '#8a85a0' }}>→</span>
        <input type="date" value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Instruktører', val: data.length },
          { label: 'Hold i alt', val: totalSessions },
          { label: 'Total deltagere', val: totalParticipants },
          { label: 'Samlet lønomk.', val: formatDKK(totalCost) },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid #6b5ca5' }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: '#1a1520' }}>{k.val}</div>
          </div>
        ))}
      </div>
      {loading ? (
        <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Henter live data fra Mariana Tek...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
          {data.map(d => (
            <div key={d.instructor.id}
              onClick={() => setSelected(d)}
              style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, cursor: 'pointer', transition: 'all .2s', overflow: 'hidden' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#6b5ca5')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e4e0f0')}
            >
              <div style={{ padding: '18px 20px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#6b5ca5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      {d.instructor.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1520' }}>{d.instructor.name}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                        <Badge type={d.instructor.level}>{d.instructor.level === 'junior' ? 'Junior' : 'Senior'}</Badge>
                        <Badge type={d.instructor.employment_type}>{d.instructor.employment_type === 'employed' ? 'Timeansat' : 'Selvstændig'}</Badge>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: '#1a1520' }}>
                      {d.instructor.employment_type === 'freelance' ? formatDKK(d.payroll.invoice_total || 0) : formatDKK(d.payroll.subtotal)}
                    </div>
                    <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 2 }}>
                      {d.instructor.employment_type === 'freelance' ? 'Faktura inkl. moms' : 'Løn denne periode'}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 0, padding: '14px 20px', borderTop: '1px solid #e4e0f0', marginTop: 14 }}>
                {[
                  { val: d.sessions_count, label: 'Hold' },
                  { val: d.payroll.total_participants, label: 'Deltagere' },
                  { val: d.payroll.participants_over_30, label: 'Over 30', color: '#6b5ca5' },
                  { val: d.payroll.participants_under_30, label: 'Under 30', color: '#2e8b6a' },
                ].map((s, idx) => (
                  <div key={idx} style={{ flex: 1, textAlign: 'center', borderLeft: idx > 0 ? '1px solid #e4e0f0' : 'none' }}>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: s.color || '#1a1520' }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: '#8a85a0', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InstructorDetail({ data: d, onBack }: { data: InstructorPayroll, onBack: () => void }) {
  const defaultRate: SalaryRate = {
    rate_per_class: d.instructor.level === 'senior' ? 500 : 300,
    bonus_threshold_1: 8, bonus_threshold_2: 12, bonus_threshold_3: 15,
    bonus_tier_2: d.instructor.level === 'senior' ? 20 : 15,
    bonus_tier_3: d.instructor.level === 'senior' ? 35 : 25,
    bonus_tier_4: d.instructor.level === 'senior' ? 50 : 35,
  }

  return (
    <div>
      <div style={{ background: 'linear-gradient(90deg,#5a4898,#1a1228 60%,#5a4898)', borderRadius: 10, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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

      <Card title="Sessions denne periode — live fra Mariana Tek">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Dato', 'Hold', 'Deltagere', 'Over 30*', 'Under 30*', 'Belægning', 'Bonus', 'Total'].map(h => (
                  <th key={h} style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '0 10px 12px 0', borderBottom: '2px solid #e4e0f0', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.sessions.map((s, idx) => {
                const bonus = calcSessionBonus(s.participants, defaultRate)
                return (
                  <tr key={idx}>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #e4e0f0', color: '#8a85a0' }}>{s.date}</td>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #e4e0f0', fontWeight: 500 }}>{s.class_name}</td>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #e4e0f0', fontWeight: 600 }}>{s.participants}</td>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #e4e0f0', color: '#6b5ca5', fontWeight: 600 }}>{s.participants_over_30}</td>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #e4e0f0', color: '#2e8b6a', fontWeight: 600 }}>{s.participants_under_30}</td>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #e4e0f0', color: '#8a85a0' }}>{s.participants > 0 ? `${Math.round(s.participants / 18 * 100)}%` : '—'}</td>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #e4e0f0' }}>
                      {bonus > 0 ? <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: '#f2f0f9', color: '#6b5ca5', border: '1px solid #d0c8e8', fontWeight: 600 }}>+{formatDKK(bonus)}</span> : '—'}
                    </td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #e4e0f0', fontWeight: 700, textAlign: 'right' }}>{formatDKK(defaultRate.rate_per_class + bonus)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 12 }}>* Over/under 30 er estimeret — præcise tal kræver fødselsdato pr. booking</div>
      </Card>

      <div style={{ background: '#f2f0f9', border: '1px solid #d0c8e8', borderRadius: 8, padding: '18px 22px', marginTop: 16 }}>
        <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 14 }}>Lønafregning</div>
        {[
          { label: `Timepris · ${d.sessions_count} hold × ${formatDKK(defaultRate.rate_per_class)}`, val: formatDKK(d.payroll.time_total) },
          { label: 'Bonus i alt', val: formatDKK(d.payroll.bonus_total) },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #d0c8e8' }}>
            <span style={{ fontSize: 12, color: '#4a4560' }}>{row.label}</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#1a1520' }}>{row.val}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1520' }}>Samlet udbetaling</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: '#1a1520' }}>{formatDKK(d.payroll.subtotal)}</span>
        </div>
      </div>
    </div>
  )
}
