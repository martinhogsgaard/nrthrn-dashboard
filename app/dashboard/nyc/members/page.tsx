'use client'

import { useEffect, useState } from 'react'
import { SecLabel } from '@/components/ui'

function formatUSD(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

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
}

export default function NYCMembersPage() {
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [memberships, setMemberships] = useState<MembershipType[]>([])
  const [freeMemberships, setFreeMemberships] = useState<MembershipType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/members?location=48717')
      .then(r => r.json())
      .then(data => {
        setStats(data.stats)
        setMemberships(data.memberships)
        setFreeMemberships(data.free_memberships || [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Henter medlemsdata...</div>

  return (
    <div>
      <SecLabel>Medlemmer — New York</SecLabel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Aktive medlemmer', val: stats?.total_active || 0, sub: `${stats?.paying_members} betalende · ${stats?.free_members} gratis` },
          { label: 'MRR', val: formatUSD(stats?.total_mrr || 0), sub: 'Betalende abonnementer' },
          { label: 'Betalende', val: stats?.paying_members || 0, color: '#6b5ca5' },
          { label: 'Gratis', val: stats?.free_members || 0 },
        ].map((k: any, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: '3px solid #6b5ca5' }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: k.color || '#1a1520', lineHeight: 1 }}>{k.val}</div>
            {k.sub && <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div>
          {/* Betalende abonnementer */}
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 18 }}>Betalende abonnementer</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Abonnement', 'Antal', 'Pris/mdr.', 'MRR'].map(h => (
                    <th key={h} style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '0 10px 12px 0', borderBottom: '2px solid #e4e0f0', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {memberships.map((m, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #f0eef8', fontWeight: 500 }}>{m.name}</td>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #f0eef8', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700 }}>{m.count}</td>
                    <td style={{ padding: '10px 10px 10px 0', borderBottom: '1px solid #f0eef8', color: '#4a4560' }}>{formatUSD(m.price)}</td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #f0eef8', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700 }}>{formatUSD(m.mrr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gratis abonnementer */}
          {freeMemberships.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
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
        </div>

        {/* MRR fordeling */}
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, alignSelf: 'start' }}>
          <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 16 }}>MRR fordeling</div>
          {memberships.map((m, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: '#4a4560', fontWeight: 500 }}>{m.name}</span>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#6b5ca5' }}>{formatUSD(m.mrr)}</span>
              </div>
              <div style={{ height: 6, background: '#f0eef8', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round(m.mrr / (stats?.total_mrr || 1) * 100)}%`, height: '100%', background: '#6b5ca5', borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 3 }}>
                {Math.round(m.mrr / (stats?.total_mrr || 1) * 100)}% af MRR · {m.count} members
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}