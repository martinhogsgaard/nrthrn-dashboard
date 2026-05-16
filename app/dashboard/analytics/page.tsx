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

export default function AnalyticsPage() {
  const [months, setMonths] = useState<MonthData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState<'all' | 'cph' | 'nyc'>('all')
  const [view, setView] = useState<'revenue' | 'purchases'>('revenue')

  useEffect(() => {
    setLoading(true)
    const locParam = location === 'cph' ? '48718' : location === 'nyc' ? '48717' : 'all'
    fetch(`/api/analytics?location=${locParam}`)
      .then(r => r.json())
      .then(d => {
        setMonths(d.months || [])
        setTopProducts(d.top_products || [])
        setLoading(false)
      })
  }, [location])

  const showCPH = location === 'all' || location === 'cph'
  const showNYC = location === 'all' || location === 'nyc'

  const totalCPH = months.reduce((s, m) => s + m.cph_revenue, 0)
  const totalNYC = months.reduce((s, m) => s + m.nyc_revenue, 0)
  const totalPurchases = months.reduce((s, m) => s + m.total_purchases, 0)

  // Max for graf — separat for CPH og NYC da de er i forskellige valutaer
  const maxCPH = Math.max(...months.map(m => m.cph_revenue), 1)
  const maxNYC = Math.max(...months.map(m => m.nyc_revenue), 1)
  const maxPurchasesCPH = Math.max(...months.map(m => m.cph_purchases), 1)
  const maxPurchasesNYC = Math.max(...months.map(m => m.nyc_purchases), 1)

  const currentMonth = new Date().toISOString().slice(0, 7)
  const GRAPH_HEIGHT = 120

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <SecLabel>Historisk analyse — Arketa + MT</SecLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { val: 'all', label: 'Begge' },
            { val: 'cph', label: 'København' },
            { val: 'nyc', label: 'New York' },
          ].map(l => (
            <button key={l.val} onClick={() => setLocation(l.val as any)}
              style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid #e4e0f0', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, cursor: 'pointer', background: location === l.val ? '#1a1228' : '#fff', color: location === l.val ? '#fff' : '#1a1520' }}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${showCPH && showNYC ? 3 : 2},1fr)`, gap: 12, marginBottom: 20 }}>
        {showCPH && (
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid #6b5ca5' }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>CPH Omsætning</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: '#6b5ca5', lineHeight: 1 }}>{formatDKK(totalCPH)}</div>
            <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>feb 2024 → nu · DKK</div>
          </div>
        )}
        {showNYC && (
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid #2e8b6a' }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>NYC Omsætning</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: '#2e8b6a', lineHeight: 1 }}>{formatUSD(totalNYC)}</div>
            <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>okt 2025 → nu · USD</div>
          </div>
        )}
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid #e4e0f0' }}>
          <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>Total transaktioner</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: '#1a1520', lineHeight: 1 }}>{totalPurchases.toLocaleString('da-DK')}</div>
          <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>Alle køb og abonnementer</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Henter historisk data...</div>
      ) : (
        <>
          {/* Månedlig graf */}
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>Månedlig udvikling</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ val: 'revenue', label: 'Omsætning' }, { val: 'purchases', label: 'Transaktioner' }].map(v => (
                  <button key={v.val} onClick={() => setView(v.val as any)}
                    style={{ padding: '4px 12px', borderRadius: 16, border: '1px solid #e4e0f0', fontSize: 10, fontFamily: 'Inter, sans-serif', cursor: 'pointer', background: view === v.val ? '#6b5ca5' : '#fff', color: view === v.val ? '#fff' : '#8a85a0' }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: GRAPH_HEIGHT + 20, minWidth: months.length * 44 }}>
                {months.map((m, i) => {
                  const cphVal = view === 'revenue' ? m.cph_revenue : m.cph_purchases
                  const nycVal = view === 'revenue' ? m.nyc_revenue : m.nyc_purchases
                  const cphMax = view === 'revenue' ? maxCPH : maxPurchasesCPH
                  const nycMax = view === 'revenue' ? maxNYC : maxPurchasesNYC
                  // Normaliser begge mod deres egne max så de er sammenlignelige visuelt
                  const cphH = Math.max(Math.round(cphVal / cphMax * GRAPH_HEIGHT), cphVal > 0 ? 2 : 0)
                  const nycH = Math.max(Math.round(nycVal / nycMax * GRAPH_HEIGHT), nycVal > 0 ? 2 : 0)
                  const isCurrent = m.month === currentMonth

                  return (
                    <div key={i} style={{ flex: '0 0 auto', width: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: GRAPH_HEIGHT }}>
                        {showCPH && cphVal > 0 && (
                          <div style={{ width: showNYC ? 16 : 28, height: cphH, background: isCurrent ? '#8b7bc5' : '#6b5ca5', borderRadius: '3px 3px 0 0' }} title={view === 'revenue' ? formatDKK(cphVal) : String(cphVal)} />
                        )}
                        {showNYC && nycVal > 0 && (
                          <div style={{ width: showCPH ? 16 : 28, height: nycH, background: isCurrent ? '#5abd9a' : '#2e8b6a', borderRadius: '3px 3px 0 0' }} title={view === 'revenue' ? formatUSD(nycVal) : String(nycVal)} />
                        )}
                      </div>
                      <div style={{ fontSize: 8, color: isCurrent ? '#6b5ca5' : '#8a85a0', fontWeight: isCurrent ? 700 : 400, marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {monthLabel(m.month)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {showCPH && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#6b5ca5' }} />
                  <span style={{ fontSize: 10, color: '#8a85a0' }}>CPH (DKK)</span>
                </div>
              )}
              {showNYC && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#2e8b6a' }} />
                  <span style={{ fontSize: 10, color: '#8a85a0' }}>NYC (USD)</span>
                </div>
              )}
              <span style={{ fontSize: 10, color: '#8a85a0', marginLeft: 8 }}>* Søjlehøjde normaliseret pr. lokation — DKK og USD kan ikke sammenlignes direkte</span>
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
                    {showCPH && <th style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>CPH (DKK)</th>}
                    {showNYC && <th style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#2e8b6a', fontWeight: 700, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>NYC (USD)</th>}
                    <th style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>Køb</th>
                  </tr>
                </thead>
                <tbody>
                  {[...months].reverse().map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0eef8', background: m.month === currentMonth ? '#f8f7fc' : 'transparent' }}>
                      <td style={{ padding: '8px 12px', fontWeight: m.month === currentMonth ? 700 : 400 }}>{monthLabel(m.month)}</td>
                      {showCPH && <td style={{ padding: '8px 12px', color: '#6b5ca5', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700 }}>{m.cph_revenue > 0 ? formatDKK(m.cph_revenue) : '—'}</td>}
                      {showNYC && <td style={{ padding: '8px 12px', color: '#2e8b6a', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700 }}>{m.nyc_revenue > 0 ? formatUSD(m.nyc_revenue) : '—'}</td>}
                      <td style={{ padding: '8px 12px', color: '#8a85a0' }}>{m.total_purchases}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top produkter */}
            <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0f0', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>
                Top produkter — samlet historik
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