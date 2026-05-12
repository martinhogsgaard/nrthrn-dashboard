'use client'

import { useEffect, useState } from 'react'
import { SecLabel, formatDKK } from '@/components/ui'

interface SessionDetail {
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
  sessions: SessionDetail[]
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
  sessions: { total: number, participants: number, over30: number, under30: number }
  freelancers: FreelancerData[]
}

function getCurrentMonthRange() {
  const now = new Date()
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    end: now.toISOString().split('T')[0]
  }
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

  async function sendPayslip(freelancer: FreelancerData) {
    if (!freelancer.instructor.email) {
      alert('Ingen email registreret for denne instruktør')
      return
    }
    setSending(true)
    // Byg email indhold
    const subject = `Lønkladde ${period.start} – ${period.end}`
    const body = buildEmailBody(freelancer)
    
    // Åbn mail-klient
    const mailto = `mailto:${freelancer.instructor.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailto)
    setSending(false)
    setSent(true)
    setTimeout(() => setSent(false), 3000)
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
      `  - Over 30: ${f.totals.over30} (${data?.split_pct.over30}%)`,
      `  - Under 30: ${f.totals.under30} (${data?.split_pct.under30}%)`,
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

  if (loading || !data) return <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Beregner split-moms...</div>

  if (selected) {
    return (
      <div>
        <div style={{ background: 'linear-gradient(90deg,#5a4898,#1a1228 60%,#5a4898)', borderRadius: 10, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {selected.instructor.initials}
            </div>
            <div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 700, color: '#fff' }}>{selected.instructor.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>Lønkladde {period.start} → {period.end}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => sendPayslip(selected)} disabled={sending}
              style={{ background: '#2e8b6a', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              {sent ? '✓ Sendt' : sending ? 'Sender...' : '✉ Send til instruktør'}
            </button>
            <button onClick={() => setSelected(null)}
              style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', padding: '8px 18px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
              ← Tilbage
            </button>
          </div>
        </div>

        {/* Totaler */}
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

        {/* Sessions tabel */}
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

        {/* Faktura opsummering */}
        <div style={{ background: '#f2f0f9', border: '1px solid #d0c8e8', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 16 }}>Faktura opsummering</div>
          {[
            { label: `Over 30 (${data.split_pct.over30}%) — momspligtig`, val: formatDKK(selected.totals.over30_amount), sub: true },
            { label: '+ Moms 25%', val: formatDKK(selected.totals.vat_amount), color: '#9a6200' },
            { label: `Under 30 (${data.split_pct.under30}%) — momsfri`, val: formatDKK(selected.totals.under30_amount), sub: true },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #d0c8e8' }}>
              <span style={{ fontSize: 12, color: r.sub ? '#4a4560' : '#8a85a0', paddingLeft: r.sub ? 0 : 16 }}>{r.label}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: r.color || '#1a1520' }}>{r.val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1520' }}>Faktura total inkl. moms</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, fontWeight: 700, color: '#6b5ca5' }}>{formatDKK(selected.totals.invoice_total)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SecLabel>Split-moms — København</SecLabel>

      {/* Periode */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#8a85a0', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Periode:</div>
        <input type="date" value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <span style={{ color: '#8a85a0' }}>→</span>
        <input type="date" value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
      </div>

      {/* Moms oversigt */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 16 }}>MRR — momsfordeling</div>
          {[
            { label: `Over 30 (${data.split_pct.over30}%)`, val: formatDKK(data.mrr.over30), color: '#6b5ca5' },
            { label: '+ Moms 25%', val: formatDKK(data.mrr.vat), color: '#9a6200', indent: true },
            { label: `Under 30 (${data.split_pct.under30}%)`, val: formatDKK(data.mrr.under30), color: '#2e8b6a' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0eef8', paddingLeft: r.indent ? 16 : 0 }}>
              <span style={{ fontSize: 12, color: '#4a4560' }}>{r.label}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: r.color }}>{r.val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Moms at afregne</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: '#9a6200' }}>{formatDKK(data.mrr.vat)}</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 16 }}>Hold — aldersfordeling</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Over 30', val: data.sessions.over30, pct: data.split_pct.over30, color: '#6b5ca5', bg: '#f2f0f9' },
              { label: 'Under 30', val: data.sessions.under30, pct: data.split_pct.under30, color: '#2e8b6a', bg: '#e8f5ef' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, borderRadius: 8, padding: '14px' }}>
                <div style={{ fontSize: 9, color: s.color, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 2 }}>{s.pct}% af deltagere</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#8a85a0' }}>
            Baseret på {data.sessions.participants} deltagere fordelt på {data.sessions.total} hold
          </div>
        </div>
      </div>

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
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#6b5ca5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      {f.instructor.initials}
                    </div>
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
