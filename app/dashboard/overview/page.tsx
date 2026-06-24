'use client'
import { useEffect, useState } from 'react'
import { SecLabel, formatDKK } from '@/components/ui'
import ClassInsights from './ClassInsights'

interface OverviewData {
  period: { start: string, today: string, end: string }
  mrr: number
  total_sales: number
  total_revenue: number
  bruce: { visits: number, revenue: number, rate: number }
  members: number
  new_members: number
  avg_visits: number
  split_pct: number
  over30_members: number
  under30_members: number
  mrr_history: { month: string, mrr: number }[]
  historic: { sessions: number, participants: number, avg_belægning: number, payroll: number }
  equipment_sales: number
  top3_sessions: any[]
  low_belægning: any[]
}
interface FirstTimersData {
  first_timers: { total: number, converted: number, conversion_rate: number }
}

export default function OverviewPage() {
  const now = new Date()
  const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [start, setStart] = useState(defaultStart)
  const [end, setEnd] = useState(defaultEnd)
  const [data, setData] = useState<OverviewData | null>(null)
  const [firstTimers, setFirstTimers] = useState<FirstTimersData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/overview?location=48718&start=${start}&end=${end}`).then(r => r.json()),
      fetch('/api/first-timers?location=48718').then(r => r.json()),
    ]).then(([overview, ft]) => {
      setData(overview)
      setFirstTimers(ft)
      setLoading(false)
    })
  }, [start, end])

  if (!data && loading) return <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Henter data...</div>
  if (!data) return null

  const periodLabel = start === defaultStart && end === defaultEnd
    ? new Date().toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })
    : `${start} – ${end}`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <SecLabel>Overblik — København · {periodLabel}</SecLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="date"
            value={start}
            onChange={e => setStart(e.target.value)}
            style={{ fontSize: 12, padding: '6px 10px', border: '1px solid #e4e0f0', borderRadius: 8, color: '#1a1520', background: '#fff', outline: 'none' }}
          />
          <span style={{ fontSize: 12, color: '#8a85a0' }}>–</span>
          <input
            type="date"
            value={end}
            onChange={e => setEnd(e.target.value)}
            style={{ fontSize: 12, padding: '6px 10px', border: '1px solid #e4e0f0', borderRadius: 8, color: '#1a1520', background: '#fff', outline: 'none' }}
          />
          <button
            onClick={() => { setStart(defaultStart); setEnd(defaultEnd) }}
            style={{ fontSize: 11, padding: '6px 12px', border: '1px solid #d0c8e8', borderRadius: 8, background: '#f2f0f9', color: '#6b5ca5', fontWeight: 600, cursor: 'pointer' }}
          >
            Denne måned
          </button>
          {loading && <span style={{ fontSize: 11, color: '#8a85a0' }}>Opdaterer...</span>}
        </div>
      </div>

      {/* Række 1 — Økonomi */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'MRR', val: formatDKK(data.mrr), sub: data.members + ' aktive abonnementer' },
          { label: 'Total salg denne periode', val: formatDKK(data.total_sales || 0), sub: 'Klipkort, events og løssalg' },
          { label: 'Bruce-indtægt', val: formatDKK(data.bruce?.revenue || 0), sub: (data.bruce?.visits || 0) + ' besøg · ' + (data.bruce?.rate || 95) + ' kr./besøg', color: '#1a1228' },
          { label: 'NRTHRN Salg', val: formatDKK(data.equipment_sales || 0), sub: 'Udstyr og maskiner' },
          { label: 'Samlet omsætning', val: formatDKK(data.total_revenue || data.mrr), sub: 'MRR + køb + Bruce + salg' },
        ].map((k: any, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid ' + (k.color || '#6b5ca5') }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: k.color || '#1a1520', lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Række 2 — Nøgletal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'First Timers denne måned', val: firstTimers?.first_timers?.total || 0, sub: 'Første besøg i centret', color: '#2e8b6a' },
          { label: 'Konverteringsrate', val: (firstTimers?.first_timers?.conversion_rate || 0) + '%', sub: (firstTimers?.first_timers?.converted || 0) + ' first timers til medlem', color: '#6b5ca5' },
          { label: 'Avg. besøg/medlem', val: data.avg_visits || '–', sub: 'Afholdte hold denne periode' },
        ].map((k: any, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid ' + (k.color || '#e4e0f0') }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: k.color || '#1a1520', lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <ClassInsights location="48718" start={start} end={end} />
      
      {/* Række 4 — Løn */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#f2f0f9', border: '1px solid #d0c8e8', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 600, marginBottom: 8 }}>Lønomkostninger til dato</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 40, fontWeight: 700, color: '#6b5ca5', lineHeight: 1 }}>{formatDKK(data.historic.payroll)}</div>
          <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 8 }}>Afholdte hold {start} – {end}</div>
        </div>
      </div>

      {/* Række 5 — Top hold + Lav belægning */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 14 }}>Top hold denne periode</div>
          {data.top3_sessions.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid #e4e0f0' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.class_type}</div>
                <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 2 }}>{s.instructor_name || '—'} · {s.date}</div>
              </div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700 }}>{s.participants} del.</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 14 }}>Lav belægning (afholdte hold)</div>
          {data.low_belægning.length === 0 ? (
            <div style={{ fontSize: 13, color: '#2e8b6a', fontWeight: 500 }}>Ingen hold med lav belægning</div>
          ) : data.low_belægning.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < data.low_belægning.length - 1 ? '1px solid #e4e0f0' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.class_type}</div>
                <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 2 }}>{s.instructor_name || '—'} · {s.date}</div>
              </div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: '#c0392b' }}>{Math.round(s.participants / s.capacity * 100)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}