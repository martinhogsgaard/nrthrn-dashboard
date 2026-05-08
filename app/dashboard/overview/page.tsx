'use client'

import { useEffect, useState } from 'react'
import { SecLabel, formatDKK } from '@/components/ui'

interface OverviewData {
  period: { start: string, end: string }
  kpis: {
    total_mrr: number
    total_members: number
    total_sessions: number
    total_participants: number
    avg_belægning: number
    split_pct: number
    over30_members: number
    under30_members: number
  }
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

  const { kpis, top3_sessions, low_belægning } = data

  return (
    <div>
      <SecLabel>Overblik — København</SecLabel>

      {/* Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 32, borderTop: '3px solid #6b5ca5' }}>
          <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 8 }}>Månedlig omsætning (MRR)</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 56, fontWeight: 700, color: '#1a1520', lineHeight: 1 }}>{formatDKK(kpis.total_mrr)}</div>
          <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 8 }}>Aktive abonnementer denne måned</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 20, flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 6 }}>Aktive medlemmer</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 36, fontWeight: 700, color: '#1a1520' }}>{kpis.total_members}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 20, flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 6 }}>Hold denne måned</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 36, fontWeight: 700, color: '#1a1520' }}>{kpis.total_sessions}</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total deltagere', val: kpis.total_participants, sub: 'Denne måned' },
          { label: 'Avg. belægning', val: `${kpis.avg_belægning}%`, sub: 'Alle hold denne måned' },
          { label: 'Split-moms %', val: `${kpis.split_pct}%`, sub: `Over 30: ${kpis.over30_members} · Under 30: ${kpis.under30_members}` },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid #6b5ca5' }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, fontWeight: 700, color: '#1a1520', lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 14 }}>Top hold denne måned</div>
          {top3_sessions.map((s, i) => (
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
          <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 14 }}>Lav belægning</div>
          {low_belægning.length === 0 ? (
            <div style={{ fontSize: 13, color: '#2e8b6a', fontWeight: 500 }}>✓ Ingen hold med lav belægning</div>
          ) : low_belægning.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < low_belægning.length - 1 ? '1px solid #e4e0f0' : 'none' }}>
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
