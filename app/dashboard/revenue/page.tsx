'use client'
import { useEffect, useState } from 'react'
import { SecLabel, formatDKK } from '@/components/ui'

interface MembershipType {
  name: string
  count: number
  price: number
  mrr: number
  age_group: 'over30' | 'under30' | 'other'
  is_free: boolean
}

interface MemberStats {
  total_active: number
  paying_members: number
  free_members: number
  total_mrr: number
  over30_mrr: number
  under30_mrr: number
  other_mrr: number
  over30_total: number
  over30_paying: number
  over30_free: number
  under30_total: number
  under30_paying: number
  under30_free: number
  birthdate_coverage: number
  birthdate_over30: number
  birthdate_under30: number
}

interface OrderItem {
  name: string
  count: number
  total: number
  age_group: 'over30' | 'under30' | 'other'
}

function KpiBox({ label, value, color, rows }: {
  label: string
  value: string | number
  color?: string
  rows: { label: string; value: string | number }[]
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: `3px solid ${color || '#6b5ca5'}` }}>
      <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: color || '#1a1520', lineHeight: 1, marginBottom: 10 }}>{value}</div>
      <div style={{ borderTop: '1px solid #f0eef8', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#8a85a0' }}>{r.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#4a4560' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SalgPage() {
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [memberships, setMemberships] = useState<MembershipType[]>([])
  const [freeMemberships, setFreeMemberships] = useState<MembershipType[]>([])
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [loading, setLoading] = useState(true)
  const [noSnapshot, setNoSnapshot] = useState(false)

  const now = new Date()
  const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const defaultEnd = now.toISOString().split('T')[0]
  const [period, setPeriod] = useState({ start: defaultStart, end: defaultEnd })

  function loadData() {
    setLoading(true)
    Promise.all([
      fetch(`/api/members?location=48718&start=${period.start}`).then(r => r.json()),
      fetch(`/api/splits?start=${period.start}&end=${period.end}&location=48718`).then(r => r.json()),
    ]).then(([membersData, splitsData]) => {
      setStats(membersData.stats)
      setNoSnapshot(membersData.no_snapshot === true)
      setMemberships(membersData.memberships || [])
      setFreeMemberships(membersData.free_memberships || [])
      setOrders(splitsData.orders?.breakdown || [])
      setTotalOrders(splitsData.orders?.total || 0)
      setLoading(false)
    })
  }

  useEffect(() => { loadData() }, [])

  function isSubscription(name: string) { return name.includes('Monthly') || name.includes('Classes (') || name.includes('Warrior') || name.includes('Revival (') }
  function isClipcard(name: string) { return name.includes('Classes') && !name.includes('(') }
  function isEvent(name: string) { return name.includes('Event') || name.includes('Challenge') || name.includes('Marathon') }

  const subscriptionOrders = orders.filter(o => isSubscription(o.name))
  const clipcardOrders = orders.filter(o => !isSubscription(o.name) && isClipcard(o.name))
  const eventOrders = orders.filter(o => !isSubscription(o.name) && !isClipcard(o.name) && isEvent(o.name))
  const kioskOrders = orders.filter(o => !isSubscription(o.name) && !isClipcard(o.name) && !isEvent(o.name))

  if (loading) return <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Henter data...</div>

  return (
    <div>
      <SecLabel>Salg — København</SecLabel>

      {/* Advarsel hvis ingen historisk snapshot */}
      {noSnapshot && (
        <div style={{ background: '#fff3d4', border: '1px solid #f0d080', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: '#9a6200', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚠</span>
          <span>Ingen historisk abonnementsdata for denne periode — MRR og medlemstal vises ikke. Salgstal (køb og klipkort) er korrekte. Historisk abonnementsdata gemmes automatisk fra 1. august 2026.</span>
        </div>
      )}

      {/* Periode-vælger */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: '#8a85a0', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Periode:</div>
        <input type="date" value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <span style={{ color: '#8a85a0' }}>→</span>
        <input type="date" value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <button onClick={loadData}
          style={{ padding: '6px 16px', background: '#6b5ca5', border: 'none', color: '#fff', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600, cursor: 'pointer' }}>
          Hent data
        </button>
      </div>

      {/* KPI bokse — kun hvis snapshot */}
      {!noSnapshot && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          <KpiBox
            label="Aktive medlemmer"
            value={stats.total_active}
            rows={[
              { label: 'Betalende', value: stats.paying_members },
              { label: 'Gratis', value: stats.free_members },
            ]}
          />
          <KpiBox
            label="MRR"
            value={`${formatDKK(stats.total_mrr)} kr.`}
            rows={[
              { label: '30+ abonnementer', value: `${formatDKK(stats.over30_mrr)} kr.` },
              { label: 'Under 30 abonnementer', value: `${formatDKK(stats.under30_mrr)} kr.` },
              { label: 'Sauna & fitness', value: `${formatDKK(stats.other_mrr)} kr.` },
            ]}
          />
          <KpiBox
            label="30+ abonnenter"
            value={stats.over30_total}
            color="#6b5ca5"
            rows={[
              { label: 'Betalende', value: stats.over30_paying },
              { label: 'Gratis', value: stats.over30_free },
            ]}
          />
          <KpiBox
            label="Under 30 abonnenter"
            value={stats.under30_total}
            color="#2e8b6a"
            rows={[
              { label: 'Betalende', value: stats.under30_paying },
              { label: 'Gratis', value: stats.under30_free },
            ]}
          />
        </div>
      )}

      {/* Hoved-grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>

        {/* Venstre — abonnementer (kun hvis snapshot) */}
        {!noSnapshot && (
          <div>
            <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 4 }}>Aktive abonnementer — MRR snapshot</div>
              <div style={{ fontSize: 10, color: '#8a85a0', marginBottom: 14, fontStyle: 'italic' }}>Viser abonnementernes samlede månedlige værdi — ikke hvad der er opkrævet i perioden</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e4e0f0' }}>
                    {['Abonnement', 'Antal', 'Pris/mdr.', 'MRR', ''].map(h => (
                      <th key={h} style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '0 8px 10px', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0eef8' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 500 }}>{m.name}</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700 }}>{m.count}</td>
                      <td style={{ padding: '10px 8px', color: '#8a85a0' }}>{formatDKK(m.price)} kr.</td>
                      <td style={{ padding: '10px 8px', fontWeight: 700 }}>{formatDKK(m.mrr)} kr.</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, fontWeight: 600,
                          background: m.age_group === 'over30' ? '#f2f0f9' : m.age_group === 'under30' ? '#e8f5ef' : '#f0f0f0',
                          color: m.age_group === 'over30' ? '#6b5ca5' : m.age_group === 'under30' ? '#2e8b6a' : '#888' }}>
                          {m.age_group === 'over30' ? '30+' : m.age_group === 'under30' ? 'U30' : 'Andet'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MRR Fordeling */}
            {stats && (
              <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
                <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 16 }}>MRR Fordeling</div>
                {[
                  { label: '30+ abonnementer', val: stats.over30_mrr, color: '#6b5ca5', pct: stats.total_mrr ? Math.round(stats.over30_mrr / stats.total_mrr * 100) : 0 },
                  { label: 'Under 30 abonnementer', val: stats.under30_mrr, color: '#2e8b6a', pct: stats.total_mrr ? Math.round(stats.under30_mrr / stats.total_mrr * 100) : 0 },
                  { label: 'Sauna & fitness', val: stats.other_mrr, color: '#e67e22', pct: stats.total_mrr ? Math.round(stats.other_mrr / stats.total_mrr * 100) : 0 },
                ].map((r, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#4a4560' }}>{r.label}</span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: r.color }}>{formatDKK(r.val)} kr.</span>
                    </div>
                    <div style={{ height: 6, background: '#f0eef8', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 3 }}>{r.pct}% af MRR</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Højre — køb (vises altid) */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
              <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>Opkrævet denne periode</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#1a1520' }}>{formatDKK(totalOrders)} kr.</div>
            </div>
            {[
              { label: 'Abonnementer', items: subscriptionOrders },
              { label: 'Klipkort', items: clipcardOrders },
              { label: 'Events', items: eventOrders },
              { label: 'Andet', items: kioskOrders },
            ].filter(g => g.items.length > 0).map((group, gi) => (
              <div key={gi} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f0eef8' }}>
                  {group.label} <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#1a1520', float: 'right' }}>
                    {formatDKK(group.items.reduce((s, o) => s + o.total, 0))} kr.
                  </span>
                </div>
                {group.items.map((o, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f8f7fc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, fontWeight: 600,
                        background: o.age_group === 'over30' ? '#f2f0f9' : o.age_group === 'under30' ? '#e8f5ef' : '#f0f0f0',
                        color: o.age_group === 'over30' ? '#6b5ca5' : o.age_group === 'under30' ? '#2e8b6a' : '#888' }}>
                        {o.age_group === 'over30' ? '30+' : o.age_group === 'under30' ? 'U30' : 'Andet'}
                      </span>
                      <span style={{ fontSize: 12 }}>{o.name} ×{o.count}</span>
                    </div>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700 }}>{formatDKK(o.total)} kr.</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Fødselsdato dækning — kun hvis snapshot */}
          {!noSnapshot && stats && (
            <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
              <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 12 }}>Fødselsdato dækning</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 36, fontWeight: 700, color: '#1a1520' }}>
                {Math.round(stats.birthdate_coverage / stats.total_active * 100)}%
              </div>
              <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 4, marginBottom: 16 }}>
                {stats.birthdate_coverage} med fødselsdato · {stats.total_active} aktive abonnementer
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, background: '#f2f0f9', border: '1px solid #d0c8e8', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, color: '#6b5ca5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>Over 30</div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 700, color: '#6b5ca5' }}>{stats.birthdate_over30}</div>
                  <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 2 }}>
                    {Math.round(stats.birthdate_over30 / stats.birthdate_coverage * 100)}%
                  </div>
                </div>
                <div style={{ flex: 1, background: '#e8f5ef', border: '1px solid #b0d8c4', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, color: '#2e8b6a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>Under 30</div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 700, color: '#2e8b6a' }}>{stats.birthdate_under30}</div>
                  <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 2 }}>
                    {Math.round(stats.birthdate_under30 / stats.birthdate_coverage * 100)}%
                  </div>
                </div>
              </div>
              {stats.birthdate_coverage < stats.total_active && (
                <div style={{ marginTop: 12, background: '#fff3d4', border: '1px solid #f0d080', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#9a6200' }}>
                  ⚠ {stats.total_active - stats.birthdate_coverage} mangler fødselsdato
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}