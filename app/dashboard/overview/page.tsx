'use client'

import { useEffect, useState } from 'react'
import { SecLabel, formatDKK } from '@/components/ui'

interface OverviewData {
  period: { start: string, today: string, end: string }
  mrr: number
  members: number
  new_members: number
  avg_visits: number
  split_pct: number
  over30_members: number
  under30_members: number
  mrr_history: { month: string, mrr: number }[]
  historic: { sessions: number, participants: number, avg_belægning: number, payroll: number }
  future: { sessions: number, participants: number, avg_belægning: number, payroll: number }
  total_estimated_payroll: number
  top3_sessions: any[]
  low_belægning: any[]
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/overview?location=48718')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Henter data...</div>
  if (!data) return null

  const maxMrr = Math.max(...data.mrr_history.map(m => m.mrr), 1)

  return (
    <div>
      <SecLabel>Overblik — København · {new Date().toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })}</SecLabel>

      {/* Top KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'MRR', val: formatDKK(data.mrr), sub: `${data.members} aktive abonnementer` },
          { label: 'Nye medlemmer', val: data.new_members || '–', sub: 'Denne måned' },
          { label: 'Avg. besøg/medlem', val: data.avg_visits || '–', sub: 'Afholdte hold denne måned' },
          { label: 'Split-moms %', val: `${data.split_pct}%`, sub: `Over 30: ${data.over30_members} · U30: ${data.under30_members}` },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid #6b5ca5' }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: '#1a1520', lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Historisk vs Fremtid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2e8b6a' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2e8b6a' }}>
              Afholdt — 1.–{new Date().getDate()}. {new Date().toLocaleDateString('da-DK', { month: 'long' })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Hold afholdt', val: data.historic.sessions },
              { label: 'Deltagere', val: data.historic.participants },
              { label: 'Avg. belægning', val: `${data.historic.avg_belægning}%` },
              { label: 'Lønomk. til dato', val: formatDKK(data.historic.payroll) },
            ].map((k, i) => (
              <div key={i} style={{ background: '#f8f7fc', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 700, color: '#1a1520' }}>{k.val}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#9a6200' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9a6200' }}>
              Planlagt — resten af {new Date().toLocaleDateString('da-DK', { month: 'long' })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Planlagte hold', val: data.future.sessions },
              { label: 'Bookede pladser', val: data.future.participants },
              { label: 'Nuv. belægning', val: `${data.future.avg_belægning}%` },
              { label: 'Est. lønomk.', val: formatDKK(data.future.payroll) },
            ].map((k, i) => (
              <div key={i} style={{ background: '#fff8e8', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 700, color: '#1a1520' }}>{k.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Estimeret samlet løn + MRR graf */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#f2f0f9', border: '1px solid #d0c8e8', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 600, marginBottom: 8 }}>Estimeret samlet lønomk. denne måned</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 40, fontWeight: 700, color: '#6b5ca5', lineHeight: 1 }}>{formatDKK(data.total_estimated_payroll)}</div>
          <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 8 }}>
            Optjent: {formatDKK(data.historic.payroll)} + Planlagt: {formatDKK(data.future.payroll)}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 16 }}>MRR — seneste 6 måneder</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 64 }}>
            {data.mrr_history.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: '100%',
                  height: m.mrr > 0 ? `${Math.round(m.mrr / maxMrr * 100)}%` : '4px',
                  background: i === 5 ? '#6b5ca5' : '#d0c8e8',
                  borderRadius: '3px 3px 0 0',
                  minHeight: 4,
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {data.mrr_history.map((m, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: i === 5 ? '#6b5ca5' : '#8a85a0', fontWeight: i === 5 ? 700 : 400 }}>{m.month}</div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 8 }}>Historiske måneder bygges op over tid</div>
        </div>
      </div>

      {/* Top hold og lav belægning */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 14 }}>Top hold denne måned</div>
          {data.top3_sessions.length === 0 ? (
            <div style={{ fontSize: 13, color: '#8a85a0' }}>Ingen afholdte hold endnu</div>
          ) : data.top3_sessions.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid #e4e0f0' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.class_type}</div>
                <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 2 }}>{s.instructor_name || '—'} · {s.date}</div>
              </div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1520' }}>{s.participants} del.</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 14 }}>Lav belægning (afholdte hold)</div>
          {data.low_belægning.length === 0 ? (
            <div style={{ fontSize: 13, color: '#2e8b6a', fontWeight: 500 }}>✓ Ingen hold med lav belægning</div>
          ) : data.low_belægning.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < data.low_belægning.length - 1 ? '1px solid #e4e0f0' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.class_type}</div>
                <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 2 }}>{s.instructor_name || '—'} · {s.date}</div>
              </div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: '#c0392b' }}>
                {Math.round(s.participants / s.capacity * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
