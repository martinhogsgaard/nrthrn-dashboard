'use client'

import { useEffect, useState } from 'react'
import { SecLabel, formatDKK } from '@/components/ui'

interface MonthData {
  month: string
  cph_revenue: number
  nyc_revenue: number
  total_revenue: number
  cph_purchases: number
  nyc_purchases: number
  total_purchases: number
  products: { location: string, product: string, type: string, revenue: number, purchases: number }[]
}

interface TopProduct {
  location: string
  location_id: string
  product: string
  type: string
  revenue: number
  purchases: number
}

export default function AnalyticsPage() {
  const [months, setMonths] = useState<MonthData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState('all')
  const [view, setView] = useState<'revenue' | 'purchases'>('revenue')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics?location=${location}`)
      .then(r => r.json())
      .then(d => {
        setMonths(d.months || [])
        setTopProducts(d.top_products || [])
        setLoading(false)
      })
  }, [location])

  const maxRevenue = Math.max(...months.map(m => m.total_revenue), 1)
  const maxPurchases = Math.max(...months.map(m => m.total_purchases), 1)

  const totalRevenue = months.reduce((s, m) => s + m.total_revenue, 0)
  const totalPurchases = months.reduce((s, m) => s + m.total_purchases, 0)
  const cphRevenue = months.reduce((s, m) => s + m.cph_revenue, 0)
  const nycRevenue = months.reduce((s, m) => s + m.nyc_revenue, 0)

  function monthLabel(m: string) {
    const d = new Date(m + '-01')
    return d.toLocaleDateString('da-DK', { month: 'short', year: '2-digit' })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <SecLabel>Historisk analyse — Arketa + MT</SecLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { val: 'all', label: 'Begge' },
            { val: '48718', label: 'CPH' },
            { val: '48717', label: 'NYC' },
          ].map(l => (
            <button key={l.val} onClick={() => setLocation(l.val)}
              style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid #e4e0f0', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, cursor: 'pointer', background: location === l.val ? '#1a1228' : '#fff', color: location === l.val ? '#fff' : '#1a1520' }}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total omsætning', val: formatDKK(totalRevenue), sub: 'Arketa + MT kombineret' },
          { label: 'CPH omsætning', val: formatDKK(cphRevenue), sub: 'feb 2024 → nu', color: '#6b5ca5' },
          { label: 'NYC omsætning', val: formatDKK(nycRevenue), sub: 'okt 2025 → nu', color: '#2e8b6a' },
          { label: 'Total transaktioner', val: totalPurchases.toLocaleString('da-DK'), sub: 'Alle køb og abonnementer' },
        ].map((k: any, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: `3px solid ${k.color || '#e4e0f0'}` }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: k.color || '#1a1520', lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
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
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, overflowX: 'auto' }}>
              {months.map((m, i) => {
                const val = view === 'revenue' ? m.total_revenue : m.total_purchases
                const max = view === 'revenue' ? maxRevenue : maxPurchases
                const cphVal = view === 'revenue' ? m.cph_revenue : m.cph_purchases
                const nycVal = view === 'revenue' ? m.nyc_revenue : m.nyc_purchases
                const height = Math.max(Math.round(val / max * 100), 2)
                const cphHeight = val > 0 ? Math.round(cphVal / val * height) : 0
                const nycHeight = height - cphHeight
                const isCurrent = m.month === new Date().toISOString().slice(0, 7)
                return (
                  <div key={i} style={{ flex: '0 0 auto', width: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ fontSize: 8, color: '#8a85a0', marginBottom: 2 }}>
                      {view === 'revenue' ? Math.round(val / 1000) + 'k' : val}
                    </div>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={{ width: '100%', height: cphHeight + 'px', background: isCurrent ? '#8b7bc5' : '#6b5ca5', borderRadius: nycVal === 0 ? '3px 3px 0 0' : '0' }} />
                      {nycVal > 0 && <div style={{ width: '100%', height: nycHeight + 'px', background: isCurrent ? '#5abd9a' : '#2e8b6a', borderRadius: '3px 3px 0 0' }} />}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4, overflowX: 'auto' }}>
              {months.map((m, i) => (
                <div key={i} style={{ flex: '0 0 auto', width: 32, textAlign: 'center', fontSize: 8, color: m.month === new Date().toISOString().slice(0, 7) ? '#6b5ca5' : '#8a85a0', fontWeight: m.month === new Date().toISOString().slice(0, 7) ? 700 : 400 }}>
                  {monthLabel(m.month)}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#6b5ca5' }} />
                <span style={{ fontSize: 10, color: '#8a85a0' }}>CPH</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#2e8b6a' }} />
                <span style={{ fontSize: 10, color: '#8a85a0' }}>NYC</span>
              </div>
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
                    {['Måned', 'CPH', 'NYC', 'Total', 'Køb'].map(h => (
                      <th key={h} style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...months].reverse().slice(0, 15).map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0eef8', background: m.month === new Date().toISOString().slice(0, 7) ? '#f8f7fc' : 'transparent' }}>
                      <td style={{ padding: '8px 12px', fontWeight: m.month === new Date().toISOString().slice(0, 7) ? 700 : 400 }}>{monthLabel(m.month)}</td>
                      <td style={{ padding: '8px 12px', color: '#6b5ca5', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700 }}>{m.cph_revenue > 0 ? formatDKK(m.cph_revenue) : '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#2e8b6a', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700 }}>{m.nyc_revenue > 0 ? '$' + Math.round(m.nyc_revenue).toLocaleString('en-US') : '—'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700 }}>{formatDKK(m.total_revenue)}</td>
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
                    {['Produkt', 'Lokation', 'Køb', 'Omsætning'].map(h => (
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
                      <td style={{ padding: '8px 12px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700 }}>
                        {p.revenue > 0 ? (p.location_id === '48718' ? formatDKK(p.revenue) : '$' + Math.round(p.revenue).toLocaleString('en-US')) : '—'}
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