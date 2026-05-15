'use client'

import { useEffect, useState } from 'react'
import { SecLabel, formatDKK } from '@/components/ui'

interface Sale {
  id: string
  name: string
  quantity: number
  sale_price: number
  cost_price: number
  sale_date: string
  notes: string | null
}

interface SalesSummary {
  total_revenue: number
  total_cost: number
  total_profit: number
  total_items: number
  margin_pct: number
}

function getCurrentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return { start: `${year}-${month}-01`, end: `${year}-${month}-${day}` }
}

const emptyForm = { name: '', quantity: 1, sale_price: '', cost_price: '', sale_date: new Date().toISOString().split('T')[0], notes: '' }

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(getCurrentMonthRange())
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { loadData() }, [period])

  async function loadData() {
    setLoading(true)
    const res = await fetch(`/api/sales?start=${period.start}&end=${period.end}&location=48718`)
    const json = await res.json()
    setSales(json.sales || [])
    setSummary(json.summary || null)
    setLoading(false)
  }

  async function saveSale() {
    if (!form.name || !form.sale_price) return
    setSaving(true)
    await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        quantity: Number(form.quantity),
        sale_price: Number(form.sale_price),
        cost_price: Number(form.cost_price) || 0,
        sale_date: form.sale_date,
        notes: form.notes || null,
        location_id: '48718',
      }),
    })
    setSaving(false)
    setForm(emptyForm)
    setShowForm(false)
    loadData()
  }

  async function deleteSale(id: string) {
    await fetch(`/api/sales?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <SecLabel>NRTHRN Salg — København</SecLabel>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: '#1a1228', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const }}>
          {showForm ? '✕ Annuller' : '+ Registrer salg'}
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginBottom: 20, borderTop: '3px solid #6b5ca5' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b5ca5', marginBottom: 16 }}>Nyt salg</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'Produkt/maskine', key: 'name', type: 'text', placeholder: 'Fx. Løbebånd X3' },
              { label: 'Antal', key: 'quantity', type: 'number', placeholder: '1' },
              { label: 'Salgspris (kr.)', key: 'sale_price', type: 'number', placeholder: '0' },
              { label: 'Kostpris (kr.)', key: 'cost_price', type: 'number', placeholder: '0' },
              { label: 'Dato', key: 'sale_date', type: 'date', placeholder: '' },
            ].map(f => (
              <label key={f.key} style={{ fontSize: 10, color: '#8a85a0', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                {f.label}
                <input
                  type={f.type}
                  value={(form as any)[f.key]}
                  placeholder={f.placeholder}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }}
                />
              </label>
            ))}
          </div>
          <label style={{ fontSize: 10, color: '#8a85a0', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Note (valgfri)
            <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Fx. solgt til Jens Hansen"
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
          </label>
          <button onClick={saveSale} disabled={saving || !form.name || !form.sale_price}
            style={{ marginTop: 16, background: '#2e8b6a', border: 'none', color: '#fff', padding: '9px 24px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, opacity: (!form.name || !form.sale_price) ? 0.5 : 1 }}>
            {saving ? 'Gemmer...' : 'Gem salg'}
          </button>
        </div>
      )}

      {/* Periode */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#8a85a0', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Periode:</div>
        <input type="date" value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <span style={{ color: '#8a85a0' }}>→</span>
        <input type="date" value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
      </div>

      {/* KPIs */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Omsætning', val: formatDKK(summary.total_revenue), color: '#6b5ca5' },
            { label: 'Kostpris', val: formatDKK(summary.total_cost) },
            { label: 'Avance', val: formatDKK(summary.total_profit), color: summary.total_profit >= 0 ? '#2e8b6a' : '#c0392b' },
            { label: 'Margin', val: `${summary.margin_pct}%`, color: summary.margin_pct >= 30 ? '#2e8b6a' : '#9a6200' },
            { label: 'Antal solgt', val: summary.total_items },
          ].map((k: any, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: `3px solid ${k.color || '#e4e0f0'}` }}>
              <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: k.color || '#1a1520' }}>{k.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Salgsliste */}
      {loading ? (
        <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Henter salgsdata...</div>
      ) : sales.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 40, textAlign: 'center', color: '#8a85a0' }}>
          Ingen salg registreret i denne periode
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f7fc' }}>
                {['Dato', 'Produkt', 'Antal', 'Salgspris', 'Kostpris', 'Avance', 'Note', ''].map(h => (
                  <th key={h} style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #e4e0f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((s, i) => {
                const revenue = s.sale_price * s.quantity
                const cost = s.cost_price * s.quantity
                const profit = revenue - cost
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f0eef8' }}>
                    <td style={{ padding: '10px 16px', color: '#8a85a0' }}>{s.sale_date}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700 }}>{s.quantity}</td>
                    <td style={{ padding: '10px 16px' }}>{formatDKK(revenue)}</td>
                    <td style={{ padding: '10px 16px', color: '#8a85a0' }}>{s.cost_price > 0 ? formatDKK(cost) : '—'}</td>
                    <td style={{ padding: '10px 16px', color: profit >= 0 ? '#2e8b6a' : '#c0392b', fontWeight: 600 }}>{s.cost_price > 0 ? formatDKK(profit) : '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#8a85a0' }}>{s.notes || '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => deleteSale(s.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                        Slet
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f2f0f9', borderTop: '2px solid #d0c8e8' }}>
                <td colSpan={2} style={{ padding: '12px 16px', fontWeight: 700 }}>I alt</td>
                <td style={{ padding: '12px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700 }}>{summary?.total_items}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#6b5ca5' }}>{formatDKK(summary?.total_revenue || 0)}</td>
                <td style={{ padding: '12px 16px', color: '#8a85a0' }}>{formatDKK(summary?.total_cost || 0)}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2e8b6a' }}>{formatDKK(summary?.total_profit || 0)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}