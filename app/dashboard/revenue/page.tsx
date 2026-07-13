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
  over30_count: number
  under30_count: number
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

export default function SalgPage() {
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [memberships, setMemberships] = useState<MembershipType[]>([])
  const [freeMemberships, setFreeMemberships] = useState<MembershipType[]>([])
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [loading, setLoading] = useState(true)

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
      setMemberships(membersData.memberships)
      setFreeMemberships(membersData.free_memberships || [])
      setOrders(splitsData.orders?.breakdown || [])
      setTotalOrders(splitsData.orders?.total || 0)
      setLoading(false)
    })
  }

  useEffect(() => { loadData() }, [])

  const over30MRR = memberships.filter(m => m.age_group === 'over30').reduce((s, m) => s + m.mrr, 0)
  const under30MRR = memberships.filter(m => m.age_group === 'under30').reduce((s, m) => s + m.mrr, 0)
  const otherMRR = memberships.filter(m => m.age_group === 'other').reduce((s, m) => s + m.mrr, 0)

  // Kategoriser ordrer
  const isSubscription = (name: string) => ['Classes', '4 Monthly', 'Fitness Space', 'Unlimited', 'Monthly', 'Warrior', 'Sauna', 'Revival'].some(k => name.includes(k))
  const isClipcard = (name: string) => ['Class (', 'Classes (', 'clip', 'timer', 'First timer', 'Massage'].some(k => name.toLowerCase().includes(k.toLowerCase()))
  const isEvent = (name: string) => ['Marathon', 'Event', 'Workshop', 'Saunagus'].some(k => name.includes(k))

  const subscriptionOrders = orders.filter(o => isSubscription(o.name))
  const clipcardOrders = orders.filter(o => !isSubscription(o.name) && isClipcard(o.name))
  const eventOrders = orders.filter(o => !isSubscription(o.name) && !isClipcard(o.name) && isEvent(o.name))
  const kioskOrders = orders.filter(o => !isSubscription(o.name) && !isClipcard(o.name) && !isEvent(o.name))

  const ageGroupBadge = (ag: string) => ({
    label: ag === 'over30' ? '30+' : ag === 'under30' ? 'U30' : 'Andet',
    bg: ag === 'over30' ? '#f2f0f9' : ag === 'under30' ? '#e8f5ef' : '#f0f0f0',
    color: ag === 'over30' ? '#6b5ca5' : ag === 'under30' ? '#2e8b6a' : '#666',
    border: ag === 'over30' ? '#d0c8e8' : ag === 'under30' ? '#b0d8c4' : '#d8d8d8',
  })

  const OrderTable = ({ items, title }: { items: OrderItem[], title: string }) => {
    if (items.length === 0) return null
    const subtotal = items.reduce((s, o) => s + o.total, 0)
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>{title}</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#1a1520' }}>{formatDKK(subtotal)}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Produkt', 'Antal', 'Total', ''].map(h => (
                <th key={h} style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '0 10px 10px 0', borderBottom: '2px solid #e4e0f0', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((o, idx) => {
              const badge = ageGroupBadge(o.age_group)
              return (
                <tr key={idx}>
                  <td style={{ padding: '9px 10px 9px 0', borderBottom: '1px solid #f0eef8', fontWeight: 500 }}>{o.name}</td>
                  <td style={{ padding: '9px 10px 9px 0', borderBottom: '1px solid #f0eef8', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 700 }}>{o.count}</td>
                  <td style={{ padding: '9px 10px 9px 0', borderBottom: '1px solid #f0eef8', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700 }}>{formatDKK(o.total)}</td>
                  <td style={{ padding: '9px 0', borderBottom: '1px solid #f0eef8' }}>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  if (loading) return <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Henter data...</div>
  

  return (
    <div>
      <SecLabel>Salg — København</SecLabel>

      {noSnapshot && (
        <div style={{ background: '#fff3d4', border: '1px solid #f0d080', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#9a6200' }}>
          ⚠ Ingen historisk snapshot for denne periode — abonnementstal vises som nuværende live-data
        </div>
      )}

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

      {/* KPIs */}
      {!noSnapshot && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Aktive medlemmer', val: stats?.total_active || 0, sub: `${stats?.paying_members} betalende · ${stats?.free_members} gratis` },
          { label: 'MRR', val: formatDKK(stats?.total_mrr || 0), sub: 'Betalende abonnementer' },
          { label: '30+ abonnenter', val: stats?.over30_count || 0, sub: `MRR: ${formatDKK(over30MRR)}`, color: '#6b5ca5' },
          { label: 'Under 30 abonnenter', val: stats?.under30_count || 0, sub: `MRR: ${formatDKK(under30MRR)}`, color: '#2e8b6a' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid #6b5ca5' }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: k.color || '#1a1520', lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>}

      {!noSnapshot && (
<div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>

        {/* Venstre — abonnementer */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 18 }}>Betalende abonnementer</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Abonnement', 'Antal', 'Pris/mdr.', 'MRR', ''].map(h => (
                    <th key={h} style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '0 10px 12px 0', borderBottom: '2px solid #e4e0f0', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {memberships.map((m, idx) => {
                  const badge = ageGroupBadge(m.age_group)
                  return (
                    <tr key={idx}>
                      <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #f0eef8', fontWeight: 500 }}>{m.name}</td>
                      <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #f0eef8', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700 }}>{m.count}</td>
                      <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #f0eef8', color: '#4a4560' }}>{m.price.toLocaleString('da-DK')} kr.</td>
                      <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #f0eef8', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700 }}>{formatDKK(m.mrr)}</td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #f0eef8' }}>
                        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {freeMemberships.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>Gratis / inkluderede abonnementer</div>
                <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: '#fff3d4', color: '#9a6200', border: '1px solid #f0d080', fontWeight: 600 }}>{stats?.free_members} i alt</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Abonnement', 'Antal'].map(h => (
                      <th key={h} style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '0 10px 12px 0', borderBottom: '2px solid #e4e0f0', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {freeMemberships.map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #f0eef8', fontWeight: 500 }}>{m.name}</td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #f0eef8', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700 }}>{m.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Køb denne måned */}
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>Køb denne måned</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#1a1520' }}>{formatDKK(totalOrders)}</div>
            </div>
            <OrderTable items={subscriptionOrders} title="Abonnementer" />
            <OrderTable items={clipcardOrders} title="Klipkort & enkeltklip" />
            <OrderTable items={eventOrders} title="Events & workshops" />
            <OrderTable items={kioskOrders} title="Kiosk & merchandise" />
          </div>
        </div>

        {/* Højre */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* MRR fordeling */}
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
            <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 16 }}>MRR fordeling</div>
            {[
              { label: '30+ abonnementer', val: over30MRR, color: '#6b5ca5', bg: '#f2f0f9' },
              { label: 'Under 30 abonnementer', val: under30MRR, color: '#2e8b6a', bg: '#e8f5ef' },
              { label: 'Øvrige (sauna, fitness osv.)', val: otherMRR, color: '#9a6200', bg: '#fff3d4' },
            ].map((r, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#4a4560', fontWeight: 500 }}>{r.label}</span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: r.color }}>{formatDKK(r.val)}</span>
                </div>
                <div style={{ height: 6, background: '#f0eef8', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(r.val / (stats?.total_mrr || 1) * 100)}%`, height: '100%', background: r.color, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 3 }}>
                  {Math.round(r.val / (stats?.total_mrr || 1) * 100)}% af MRR
                </div>
              </div>
            ))}
          </div>

          {/* Fødselsdato dækning */}
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
            <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 16 }}>Fødselsdato dækning</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 36, fontWeight: 700, color: '#1a1520', marginBottom: 4 }}>
              {stats ? Math.round(stats.birthdate_coverage / Math.max(stats.birthdate_coverage, stats.total_active) * 100) : 0}%
            </div>
            <div style={{ fontSize: 11, color: '#8a85a0', marginBottom: 14 }}>
              {stats?.birthdate_coverage} med fødselsdato · {stats?.total_active} aktive abonnementer
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, background: '#f2f0f9', border: '1px solid #d0c8e8', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 9, color: '#6b5ca5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>Over 30</div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 700, color: '#6b5ca5' }}>{stats?.birthdate_over30}</div>
                <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 2 }}>
                  {stats ? Math.round(stats.birthdate_over30 / stats.birthdate_coverage * 100) : 0}%
                </div>
              </div>
              <div style={{ flex: 1, background: '#e8f5ef', border: '1px solid #b0d8c4', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 9, color: '#2e8b6a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>Under 30</div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 700, color: '#2e8b6a' }}>{stats?.birthdate_under30}</div>
                <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 2 }}>
                  {stats ? Math.round(stats.birthdate_under30 / stats.birthdate_coverage * 100) : 0}%
                </div>
              </div>
            </div>
            {stats && stats.birthdate_coverage < stats.total_active && (
              <div style={{ marginTop: 12, background: '#fff3d4', border: '1px solid #f0d080', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#9a6200' }}>
                ⚠ {stats.total_active - stats.birthdate_coverage} mangler fødselsdato
              </div>
            )}
          </div>

        </div>
      </div>
)}
    </div>
  )
}