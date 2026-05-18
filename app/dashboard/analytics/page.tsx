'use client'

import { useEffect, useState } from 'react'
import { SecLabel, formatDKK } from '@/components/ui'

interface MonthData {
  month: string
  cph_revenue: number
  nyc_revenue: number
  cph_purchases: number
  nyc_purchases: number
  total_purchases: number
  cph_members: number
  nyc_members: number
  cph_active: number
  nyc_active: number
  cph_packs: number
  nyc_packs: number
  cph_pack_revenue: number
  nyc_pack_revenue: number
}

interface AgeGroup {
  group: string
  cph_count: number
  nyc_count: number
  cph_pct: number
  nyc_pct: number
}

interface TopProduct {
  location: string
  location_id: string
  product: string
  type: string
  revenue: number
  purchases: number
}

function monthLabel(m: string) {
  return new Date(m + '-01').toLocaleDateString('da-DK', { month: 'short', year: '2-digit' })
}

function formatUSD(val: number) {
  return '$' + Math.round(val).toLocaleString('en-US')
}

function BarChart({ months, cphKey, nycKey, maxCPH, maxNYC, formatCPH, formatNYC }: {
  months: MonthData[]
  cphKey: keyof MonthData
  nycKey: keyof MonthData
  maxCPH: number
  maxNYC: number
  formatCPH: (v: number) => string
  formatNYC: (v: number) => string
}) {
  const H = 100
  const current = new Date().toISOString().slice(0, 7)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* CPH */}
      <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 14 }}>København</div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: H + 28, minWidth: months.length * 30 }}>
            {months.map((m, i) => {
              const val = m[cphKey] as number
              const h = Math.max(Math.round(val / maxCPH * H), val > 0 ? 2 : 0)
              const isCur = m.month === current
              return (
                <div key={i} style={{ flex: '0 0 auto', width: 26, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 7, color: '#8a85a0', marginBottom: 2, height: 10 }}>{val > 0 ? (val >= 1000 ? Math.round(val/1000)+'k' : val) : ''}</div>
                  <div style={{ width: '100%', height: h, background: isCur ? '#9b8fd4' : '#6b5ca5', borderRadius: '3px 3px 0 0' }} title={formatCPH(val)} />
                  <div style={{ fontSize: 7, color: isCur ? '#6b5ca5' : '#8a85a0', fontWeight: isCur ? 700 : 400, marginTop: 3, textAlign: 'center', whiteSpace: 'nowrap' }}>{monthLabel(m.month)}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {/* NYC */}
      <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#2e8b6a', fontWeight: 700, marginBottom: 14 }}>New York</div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: H + 28, minWidth: months.length * 30 }}>
            {months.map((m, i) => {
              const val = m[nycKey] as number
              const h = Math.max(Math.round(val / maxNYC * H), val > 0 ? 2 : 0)
              const isCur = m.month === current
              return (
                <div key={i} style={{ flex: '0 0 auto', width: 26, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 7, color: '#8a85a0', marginBottom: 2, height: 10 }}>{val > 0 ? (val >= 1000 ? Math.round(val/1000)+'k' : val) : ''}</div>
                  <div style={{ width: '100%', height: h, background: isCur ? '#5abd9a' : '#2e8b6a', borderRadius: '3px 3px 0 0' }} title={formatNYC(val)} />
                  <div style={{ fontSize: 7, color: isCur ? '#2e8b6a' : '#8a85a0', fontWeight: isCur ? 700 : 400, marginTop: 3, textAlign: 'center', whiteSpace: 'nowrap' }}>{monthLabel(m.month)}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function AgeChart({ data }: { data: AgeGroup[] }) {
  const colors = ['#6b5ca5', '#2e8b6a', '#9a6200', '#c0392b']
  const maxPct = 60
  return (
    <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
      <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 20 }}>Generationsfordeling</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {data.map((g, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1520' }}>{g.group}</span>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 11, color: '#6b5ca5', fontWeight: 600 }}>CPH {g.cph_pct}%</span>
                <span style={{ fontSize: 11, color: '#2e8b6a', fontWeight: 600 }}>NYC {g.nyc_pct}%</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, fontSize: 9, color: '#6b5ca5', textAlign: 'right' }}>CPH</div>
                <div style={{ flex: 1, height: 14, background: '#f0eef8', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(g.cph_pct / maxPct * 100, 100)}%`, height: '100%', background: colors[i], borderRadius: 4 }} />
                </div>
                <div style={{ width: 32, fontSize: 10, color: '#8a85a0' }}>{g.cph_count.toLocaleString('da-DK')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, fontSize: 9, color: '#2e8b6a', textAlign: 'right' }}>NYC</div>
                <div style={{ flex: 1, height: 14, background: '#e8f5ef', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(g.nyc_pct / maxPct * 100, 100)}%`, height: '100%', background: '#2e8b6a', borderRadius: 4, opacity: 0.6 + i * 0.1 }} />
                </div>
                <div style={{ width: 32, fontSize: 10, color: '#8a85a0' }}>{g.nyc_count.toLocaleString('da-DK')}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, fontSize: 10, color: '#8a85a0' }}>Baseret på fødselsdatoer i Arketa</div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [months, setMonths] = useState<MonthData[]>([])
  const [ageData, setAgeData] = useState<AgeGroup[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => {
        setMonths(d.months || [])
        setAgeData(d.age_distribution || [])
        setTopProducts(d.top_products || [])
        setLoading(false)
      })
  }, [])

  const totalCPH = months.reduce((s, m) => s + m.cph_revenue, 0)
  const totalNYC = months.reduce((s, m) => s + m.nyc_revenue, 0)
  const totalCPHMembers = months.reduce((s, m) => s + m.cph_members, 0)
  const totalNYCMembers = months.reduce((s, m) => s + m.nyc_members, 0)
  const currentMonth = new Date().toISOString().slice(0, 7)

  const max = (key: keyof MonthData) => Math.max(...months.map(m => m[key] as number), 1)

  return (
    <div>
      <SecLabel>Historisk analyse — Arketa + MT · okt 2025 →</SecLabel>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'CPH Omsætning', val: formatDKK(totalCPH), sub: 'okt 2025 → nu · DKK', color: '#6b5ca5' },
          { label: 'NYC Omsætning', val: formatUSD(totalNYC), sub: 'okt 2025 → nu · USD', color: '#2e8b6a' },
          { label: 'CPH Nye members', val: totalCPHMembers, sub: 'Nye abonnenter', color: '#6b5ca5' },
          { label: 'NYC Nye members', val: totalNYCMembers, sub: 'Nye abonnenter', color: '#2e8b6a' },
        ].map((k: any, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Henter data...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Omsætning */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1520', marginBottom: 10, letterSpacing: '.06em', textTransform: 'uppercase' }}>Omsætning</div>
            <BarChart months={months} cphKey="cph_revenue" nycKey="nyc_revenue" maxCPH={max('cph_revenue')} maxNYC={max('nyc_revenue')} formatCPH={formatDKK} formatNYC={formatUSD} />
          </div>

          {/* Aktive klienter */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1520', marginBottom: 10, letterSpacing: '.06em', textTransform: 'uppercase' }}>Aktive klienter</div>
            <BarChart months={months} cphKey="cph_active" nycKey="nyc_active" maxCPH={max('cph_active')} maxNYC={max('nyc_active')} formatCPH={v => v + ' klienter'} formatNYC={v => v + ' clients'} />
          </div>

          {/* Klipkortsalg */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1520', marginBottom: 10, letterSpacing: '.06em', textTransform: 'uppercase' }}>Klipkortsalg</div>
            <BarChart months={months} cphKey="cph_packs" nycKey="nyc_packs" maxCPH={max('cph_packs')} maxNYC={max('nyc_packs')} formatCPH={v => v + ' klipkort'} formatNYC={v => v + ' packs'} />
          </div>

          {/* Nye members */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1520', marginBottom: 10, letterSpacing: '.06em', textTransform: 'uppercase' }}>Nye abonnenter</div>
            <BarChart months={months} cphKey="cph_members" nycKey="nyc_members" maxCPH={max('cph_members')} maxNYC={max('nyc_members')} formatCPH={v => v + ' nye'} formatNYC={v => v + ' new'} />
          </div>

          {/* Aldersfordeling + Top produkter */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <AgeChart data={ageData} />

            {/* Top produkter */}
            <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0f0', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>
                Top produkter — okt 2025 →
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 400 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8f7fc' }}>
                      {['Produkt', 'Lok.', 'Køb', 'Omsætning'].map(h => (
                        <th key={h} style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0eef8' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500 }}>{p.product}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: p.location_id === '48718' ? '#f2f0f9' : '#e8f5ef', color: p.location_id === '48718' ? '#6b5ca5' : '#2e8b6a' }}>
                            {p.location}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: '#8a85a0' }}>{p.purchases}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: p.location_id === '48718' ? '#6b5ca5' : '#2e8b6a' }}>
                          {p.revenue > 0 ? (p.location_id === '48718' ? formatDKK(p.revenue) : formatUSD(p.revenue)) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Månedstabel */}
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0f0', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>
              Månedlig oversigt
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f7fc' }}>
                  {['Måned', 'CPH (DKK)', 'NYC (USD)', 'CPH aktive', 'NYC aktive', 'CPH klipkort', 'NYC klipkort', 'CPH nye mbr.', 'NYC nye mbr.'].map(h => (
                    <th key={h} style={{ fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e4e0f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0eef8', background: m.month === currentMonth ? '#f8f7fc' : 'transparent' }}>
                    <td style={{ padding: '8px 12px', fontWeight: m.month === currentMonth ? 700 : 400, whiteSpace: 'nowrap' }}>{monthLabel(m.month)}</td>
                    <td style={{ padding: '8px 12px', color: '#6b5ca5', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700 }}>{m.cph_revenue > 0 ? formatDKK(m.cph_revenue) : '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#2e8b6a', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700 }}>{m.nyc_revenue > 0 ? formatUSD(m.nyc_revenue) : '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#8a85a0' }}>{m.cph_active || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#8a85a0' }}>{m.nyc_active || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#8a85a0' }}>{m.cph_packs || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#8a85a0' }}>{m.nyc_packs || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#6b5ca5', fontWeight: 600 }}>{m.cph_members || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#2e8b6a', fontWeight: 600 }}>{m.nyc_members || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  )
}