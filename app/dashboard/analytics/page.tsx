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
  const d = new Date(m + '-01')
  return d.toLocaleDateString('da-DK', { month: 'short', year: '2-digit' })
}

function formatUSD(val: number) {
  return '$' + Math.round(val).toLocaleString('en-US')
}

function BarChart({ months, valueKey, maxVal, color, formatVal }: {
  months: MonthData[]
  valueKey: 'cph_revenue' | 'nyc_revenue' | 'cph_purchases' | 'nyc_purchases'
  maxVal: number
  color: string
  formatVal: (v: number) => string
}) {
  const GRAPH_HEIGHT = 100
  const currentMonth = new Date().toISOString().slice(0, 7)

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: GRAPH_HEIGHT + 32, minWidth: months.length * 36 }}>
        {months.map((m, i) => {
          const val = m[valueKey] as number
          const h = Math.max(Math.round(val / maxVal * GRAPH_HEIGHT), val > 0 ? 2 : 0)
          const isCurrent = m.month === currentMonth
          return (
            <div key={i} style={{ flex: '0 0 auto', width: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 8, color: '#8a85a0', marginBottom: 2, height: 12 }}>
                {val > 0 ? (val >= 1000 ? Math.round(val / 1000) + 'k' : val) : ''}
              </div>
              <div style={{ width: '100%', height: h, background: isCurrent ? color + 'aa' : color, borderRadius: '3px 3px 0 0', minHeight: val > 0 ? 2 : 0 }} title={formatVal(val)} />
              <div style={{ fontSize: 8, color: isCurrent ? color : '#8a85a0', fontWeight: isCurrent ? 700 : 400, marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {monthLabel(m.month)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [months, setMonths] = useState<MonthData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'revenue' | 'purchases'>('revenue')

  useEffect(() => {
    setLoading(true)
    fetch('/api/analytics?location=all')
      .then(r => r.json())
      .then(d => {
        setMonths(d.months || [])
        setTopProducts(d.top_products || [])
        setLoading(false)
      })
  }, [])

  const totalCPH = months.reduce((s, m) => s + m.cph_revenue, 0)
  const totalNYC = months.reduce((s, m) => s + m.nyc_revenue, 0)
  const totalPurchases = months.reduce((s, m) => s + m.total_purchases, 0)

  const maxCPHRev = Math.max(...months.map(m => m.cph_revenue), 1)
  const maxNYCRev = Math.max(...months.map(m => m.nyc_revenue), 1)
  const maxCPHPur = Math.max(...months.map(m => m.cph_purchases), 1)
  const maxNYCPur = Math.max(...months.map(m => m.nyc_purchases), 1)

  const currentMonth = new Date().toISOString().slice(0, 7)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <SecLabel>Historisk analyse — Arketa + MT · okt 2025 →</SecLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ val: 'revenue', label: 'Omsætning' }, { val: 'purchases', label: 'Transaktioner' }].map(v => (
            <button key={v.val} onClick={() => setView(v.val as any)}
              style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid #e4e0f0', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, cursor: 'pointer', background: view === v.val ? '#1a1228' : '#fff', color: view === v.val ? '#fff' : '#1a1520' }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid #6b5ca5' }}>
          <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>CPH Omsætning</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: '#6b5ca5', lineHeight: 1 }}>{formatDKK(totalCPH)}</div>
          <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>okt 2025 → nu · DKK</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid #2e8b6a' }}>
          <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>NYC Omsætning</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: '#2e8b6a', lineHeight: 1 }}>{formatUSD(totalNYC)}</div>
          <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>okt 2025 → nu · USD</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid #e4e0f0' }}>
          <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>Total transaktioner</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: '#1a1520', lineHeight: 1 }}>{totalPurchases.toLocaleString('da-DK')}</div>
          <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>Begge lokationer</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Henter historisk data...</div>
      ) : (
        <>
          {/* To separate grafer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* CPH graf */}
            <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#6b5ca5' }} />
                <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700 }}>København — DKK</div>
              </div>
              <BarChart
                months={months}
                valueKey={view === 'revenue' ? 'cph_revenue' : 'cph_purchases'}
                maxVal={view === 'revenue' ? maxCPHRev : maxCPHPur}
                color='#6b5ca5'
                formatVal={v => formatDKK(v)}
              />
            </div>

            {/* NYC graf */}
            <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#2e8b6a' }} />
                <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#2e8b6a', fontWeight: 700 }}>New York — USD</div>
              </div>
              <BarChart
                months={months}
                valueKey={view === 'revenue' ? 'nyc_revenue' : 'nyc_purchases'}
                maxVal={view === 'revenue' ? maxNYCRev : maxNYCPur}
                color='#2e8b6a'
                formatVal={v => formatUSD(v)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Månedstabel */}
            <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0f0', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>
                Månedlig omsætning
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8f7fc' }}>
                    <th style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>Måned</th>
                    <th style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>CPH (DKK)</th>
                    <th style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#2e8b6a', fontWeight: 700, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>NYC (USD)</th>
                    <th style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>Køb</th>
                  </tr>
                </thead>
                <tbody>
                  {[...months].reverse().map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0eef8', background: m.month === currentMonth ? '#f8f7fc' : 'transparent' }}>
                      <td style={{ padding: '8px 12px', fontWeight: m.month === currentMonth ? 700 : 400 }}>{monthLabel(m.month)}</td>
                      <td style={{ padding: '8px 12px', color: '#6b5ca5', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700 }}>{m.cph_revenue > 0 ? formatDKK(m.cph_revenue) : '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#2e8b6a', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700 }}>{m.nyc_revenue > 0 ? formatUSD(m.nyc_revenue) : '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#8a85a0' }}>{m.total_purchases}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top produkter */}
            <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0f0', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>
                Top produkter — okt 2025 →
              </div>
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
        </>
      )}
    </div>
  )
}