'use client'

import { useEffect, useState } from 'react'
import { SecLabel, formatDKK } from '@/components/ui'

interface OrderItem {
  name: string
  count: number
  total: number
  age_group: string
}

interface FreelancerSession {
  date: string
  class_name: string
  participants: number
  over30: number
  under30: number
  base_rate: number
  bonus: number
  total_amount: number
  over30_amount: number
  under30_amount: number
  vat_amount: number
  invoice_total: number
}

interface FreelancerData {
  instructor: { id: string, name: string, initials: string, email: string | null, level: string }
  sessions: FreelancerSession[]
  totals: {
    sessions: number, participants: number, over30: number, under30: number,
    base_total: number, bonus_total: number, amount_excl_vat: number,
    over30_amount: number, under30_amount: number, vat_amount: number, invoice_total: number
  }
}

interface SplitsData {
  period: { start: string, end: string }
  split_pct: { over30: number, under30: number }
  mrr: { total: number, over30: number, under30: number, vat: number }
  orders: { total: number, over30: number, under30: number, vat: number, breakdown: OrderItem[] }
  bruce: { total: number, over30: number, under30: number, vat: number, months: number }
  total_revenue: { total: number, over30: number, under30: number, vat: number }
  sessions: { total: number, participants: number }
  freelancers: FreelancerData[]
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

export default function SplitsPage() {
  const [data, setData] = useState<SplitsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(getCurrentMonthRange())
  const [selected, setSelected] = useState<FreelancerData | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => { loadData() }, [period])

  async function loadData() {
    setLoading(true)
    const res = await fetch(`/api/splits?start=${period.start}&end=${period.end}&location=48718`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  function buildEmailBody(f: FreelancerData): string {
    const lines = [
      `Hej ${f.instructor.name.split(' ')[0]},`,
      ``,
      `Her er din lønkladde for perioden ${period.start} til ${period.end}.`,
      ``,
      `OVERSIGT`,
      `Antal hold: ${f.totals.sessions}`,
      `Antal deltagere: ${f.totals.participants}`,
      `  - Over 30 (${data?.split_pct.over30}%): ${f.totals.over30}`,
      `  - Under 30 (${data?.split_pct.under30}%): ${f.totals.under30}`,
      ``,
      `BEREGNING`,
      `Timepris i alt: ${f.totals.base_total} kr.`,
      `Bonus i alt: ${f.totals.bonus_total} kr.`,
      `Beløb ekskl. moms: ${f.totals.amount_excl_vat} kr.`,
      ``,
      `FAKTURA OPDELING`,
      `Over 30 (momspligtig): ${f.totals.over30_amount} kr.`,
      `  + Moms 25%: ${f.totals.vat_amount} kr.`,
      `Under 30 (momsfri): ${f.totals.under30_amount} kr.`,
      ``,
      `FAKTURA TOTAL: ${f.totals.invoice_total} kr.`,
      ``,
      `HOLD DETALJER`,
      ...f.sessions.map(s =>
        `${s.date} | ${s.class_name} | ${s.participants} del. (${s.over30} over 30 / ${s.under30} under 30) | ${s.total_amount} kr.`
      ),
      ``,
      `Venlig hilsen`,
      `NRTHRN STRONG`,
    ]
    return lines.join('\n')
  }

  async function sendPayslip(freelancer: FreelancerData) {
    if (!freelancer.instructor.email) { alert('Ingen email registreret'); return }
    setSending(true)
    const mailto = `mailto:${freelancer.instructor.email}?subject=${encodeURIComponent(`Lønkladde ${period.start} – ${period.end}`)}&body=${encodeURIComponent(buildEmailBody(freelancer))}`
    window.open(mailto)
    setSending(false)
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  if (loading || !data) return <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Beregner split-moms...</div>

  if (selected) {
    return (
      <div>
        <div style={{ background: 'linear-gradient(90deg,#5a4898,#1a1228 60%,#5a4898)', borderRadius: 10, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>{selected.instructor.initials}</div>
            <div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 700, color: '#fff' }}>{selected.instructor.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>Lønkladde {period.start} → {period.end}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => sendPayslip(selected)} disabled={sending}
              style={{ background: '#2e8b6a', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              {sent ? '✓ Åbnet' : '✉ Send til instruktør'}
            </button>
            <button onClick={() => setSelected(null)}
              style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', padding: '8px 18px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
              ← Tilbage
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Faktura total', val: formatDKK(selected.totals.invoice_total), color: '#6b5ca5' },
            { label: 'Ekskl. moms', val: formatDKK(selected.totals.amount_excl_vat) },
            { label: 'Moms 25%', val: formatDKK(selected.totals.vat_amount), color: '#9a6200' },
            { label: 'Hold / Deltagere', val: `${selected.totals.sessions} / ${selected.totals.participants}` },
          ].map((k, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '16px', borderTop: `3px solid ${k.color || '#e4e0f0'}` }}>
              <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 700, color: k.color || '#1a1520' }}>{k.val}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f7fc' }}>
                {['Dato', 'Hold', 'Del.', 'Over 30', 'Under 30', 'Timepris', 'Bonus', 'Ekskl. moms', 'Moms', 'Faktura'].map(h => (
                  <th key={h} style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e4e0f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selected.sessions.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0eef8' }}>
                  <td style={{ padding: '10px 12px', color: '#8a85a0' }}>{s.date}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{s.class_name}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{s.participants}</td>
                  <td style={{ padding: '10px 12px', color: '#6b5ca5', fontWeight: 600 }}>{s.over30}</td>
                  <td style={{ padding: '10px 12px', color: '#2e8b6a', fontWeight: 600 }}>{s.under30}</td>
                  <td style={{ padding: '10px 12px' }}>{formatDKK(s.base_rate)}</td>
                  <td style={{ padding: '10px 12px', color: '#6b5ca5' }}>{s.bonus > 0 ? `+${formatDKK(s.bonus)}` : '—'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{formatDKK(s.total_amount)}</td>
                  <td style={{ padding: '10px 12px', color: '#9a6200' }}>{formatDKK(s.vat_amount)}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{formatDKK(s.invoice_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f2f0f9', borderTop: '2px solid #d0c8e8' }}>
                <td colSpan={2} style={{ padding: '12px', fontWeight: 700 }}>I alt</td>
                <td style={{ padding: '12px', fontWeight: 700 }}>{selected.totals.participants}</td>
                <td style={{ padding: '12px', color: '#6b5ca5', fontWeight: 700 }}>{selected.totals.over30}</td>
                <td style={{ padding: '12px', color: '#2e8b6a', fontWeight: 700 }}>{selected.totals.under30}</td>
                <td style={{ padding: '12px', fontWeight: 600 }}>{formatDKK(selected.totals.base_total)}</td>
                <td style={{ padding: '12px', color: '#6b5ca5', fontWeight: 600 }}>{formatDKK(selected.totals.bonus_total)}</td>
                <td style={{ padding: '12px', fontWeight: 700 }}>{formatDKK(selected.totals.amount_excl_vat)}</td>
                <td style={{ padding: '12px', color: '#9a6200', fontWeight: 700 }}>{formatDKK(selected.totals.vat_amount)}</td>
                <td style={{ padding: '12px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#6b5ca5' }}>{formatDKK(selected.totals.invoice_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ background: '#f2f0f9', border: '1px solid #d0c8e8', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 16 }}>Faktura opsummering</div>
          {[
            { label: `Over 30 (${data.split_pct.over30}%) — momspligtig`, val: formatDKK(selected.totals.over30_amount) },
            { label: '+ Moms 25%', val: formatDKK(selected.totals.vat_amount), color: '#9a6200', indent: true },
            { label: `Under 30 (${data.split_pct.under30}%) — momsfri`, val: formatDKK(selected.totals.under30_amount) },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #d0c8e8', paddingLeft: r.indent ? 16 : 0 }}>
              <span style={{ fontSize: 12, color: '#4a4560' }}>{r.label}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: r.color || '#1a1520' }}>{r.val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0' }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Faktura total inkl. moms</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, fontWeight: 700, color: '#6b5ca5' }}>{formatDKK(selected.totals.invoice_total)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SecLabel>Split-moms — København</SecLabel>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#8a85a0', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Periode:</div>
        <input type="date" value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <span style={{ color: '#8a85a0' }}>→</span>
        <input type="date" value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
      </div>

      {/* Samlet moms oversigt */}
      <div style={{ background: '#f2f0f9', border: '2px solid #6b5ca5', borderRadius: 10, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 16 }}>Samlet moms at afregne denne periode</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Total omsætning', val: formatDKK(data.total_revenue.total), sub: `MRR + nye køb + Bruce` },
            { label: 'Momspligtig (over 30)', val: formatDKK(data.total_revenue.over30), sub: `${data.split_pct.over30}% af omsætning`, color: '#6b5ca5' },
            { label: 'Moms at afregne (25%)', val: formatDKK(data.total_revenue.vat), sub: `Skal angives til SKAT`, color: '#9a6200' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '16px' }}>
              <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: k.color || '#1a1520', lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MRR og Nye køb side om side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* MRR */}
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 16 }}>MRR — løbende abonnementer</div>
          {[
            { label: `Over 30 (${data.split_pct.over30}%)`, val: formatDKK(data.mrr.over30), color: '#6b5ca5' },
            { label: '+ Moms 25%', val: formatDKK(data.mrr.vat), color: '#9a6200', indent: true },
            { label: `Under 30 (${data.split_pct.under30}%)`, val: formatDKK(data.mrr.under30), color: '#2e8b6a' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0eef8', paddingLeft: r.indent ? 16 : 0 }}>
              <span style={{ fontSize: 12, color: '#4a4560' }}>{r.label}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: r.color }}>{r.val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Total MRR</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700 }}>{formatDKK(data.mrr.total)}</span>
          </div>
        </div>

        {/* Nye køb */}
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 16 }}>Nye køb — klipkort og engangskøb</div>
          {data.orders.breakdown.map((o, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0eef8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 9, padding: '1px 6px', borderRadius: 8, fontWeight: 600,
                  background: o.age_group === 'over30' ? '#f2f0f9' : o.age_group === 'under30' ? '#e8f5ef' : '#f0f0f0',
                  color: o.age_group === 'over30' ? '#6b5ca5' : o.age_group === 'under30' ? '#2e8b6a' : '#666',
                }}>
                  {o.age_group === 'over30' ? '30+' : o.age_group === 'under30' ? 'U30' : 'Andet'}
                </span>
                <span style={{ fontSize: 12, color: '#1a1520' }}>{o.name} ×{o.count}</span>
              </div>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700 }}>{formatDKK(o.total)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Total nye køb</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700 }}>{formatDKK(data.orders.total)}</span>
          </div>
        </div>
      </div>

{/* Bruce */}
      {data.bruce && data.bruce.total > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 16 }}>Bruce — partneraftale ({data.bruce.months} måned{data.bruce.months !== 1 ? 'er' : ''})</div>
          {[
            { label: `Over 30 — visits/no shows m. moms`, val: formatDKK(data.bruce.over30), color: '#6b5ca5' },
            { label: '+ Moms 25%', val: formatDKK(data.bruce.vat), color: '#9a6200', indent: true },
            { label: `Under 30 — visits/no shows u. moms`, val: formatDKK(data.bruce.under30), color: '#2e8b6a' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0eef8', paddingLeft: r.indent ? 16 : 0 }}>
              <span style={{ fontSize: 12, color: '#4a4560' }}>{r.label}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: r.color }}>{r.val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Total Bruce</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700 }}>{formatDKK(data.bruce.total)}</span>
          </div>
        </div>
      )}

      {/* Selvstændige instruktører */}
      <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 12 }}>
        Selvstændige instruktører — lønkladder ({data.freelancers.length})
      </div>

      {data.freelancers.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 32, textAlign: 'center', color: '#8a85a0' }}>
          Ingen selvstændige instruktører med hold i denne periode
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
          {data.freelancers.map(f => (
            <div key={f.instructor.id} onClick={() => setSelected(f)}
              style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, cursor: 'pointer', overflow: 'hidden' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#6b5ca5')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e4e0f0')}
            >
              <div style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#6b5ca5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{f.instructor.initials}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1520' }}>{f.instructor.name}</div>
                      <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 2 }}>{f.instructor.email || 'Ingen email'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#6b5ca5' }}>{formatDKK(f.totals.invoice_total)}</div>
                    <div style={{ fontSize: 10, color: '#8a85a0' }}>inkl. moms</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', borderTop: '1px solid #e4e0f0' }}>
                {[
                  { val: f.totals.sessions, label: 'Hold' },
                  { val: f.totals.participants, label: 'Del.' },
                  { val: f.totals.over30, label: 'Over 30', color: '#6b5ca5' },
                  { val: f.totals.under30, label: 'Under 30', color: '#2e8b6a' },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderLeft: i > 0 ? '1px solid #e4e0f0' : 'none' }}>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: s.color || '#1a1520' }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: '#8a85a0', letterSpacing: '.1em', textTransform: 'uppercase' }}>{s.label}</div>
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
