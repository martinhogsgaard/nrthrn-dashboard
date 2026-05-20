'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { label: 'Overblik', href: '/dashboard/overview' },
  {
    label: 'København',
    children: [
      { href: '/dashboard/overview', label: 'Overblik' },
      { href: '/dashboard/classes', label: 'Hold' },
      { href: '/dashboard/members', label: 'Medlemmer' },
      { href: '/dashboard/payroll', label: 'Løn' },
      { href: '/dashboard/splits', label: 'Split-moms' },
      { href: '/dashboard/bruce', label: 'Bruce' },
    ]
  },
  {
    label: 'New York',
    children: [
      { href: '/dashboard/nyc/overview', label: 'Overblik' },
      { href: '/dashboard/nyc/classes', label: 'Hold' },
      { href: '/dashboard/nyc/members', label: 'Medlemmer' },
      { href: '/dashboard/nyc/instructors', label: 'Instruktører' },
      { href: '/dashboard/nyc/payroll', label: 'Løn' },
    ]
  },
  { label: 'NRTHRN Salg', href: '/dashboard/sales' },
  { label: 'Personale', href: '/dashboard/setup' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) window.location.href = '/login'
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7fc', fontFamily: 'Inter, sans-serif' }}>
      <div style={{
        background: 'linear-gradient(90deg, #5a4898 0%, #1a1228 50%, #5a4898 100%)',
        padding: '0 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => router.push('/dashboard/overview')}>
          <img src="data:image/avif;base64,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" alt="NRTHRN Strong" style={{ height: '36px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,.25)' }} />
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', letterSpacing: '.18em', textTransform: 'uppercase' }}>
            Ledelsesdashboard
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {NAV.map(n => (
            'children' in n ? (
              <div key={n.label} style={{ position: 'relative' }}
                onMouseEnter={() => setOpenDropdown(n.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button style={{
                  padding: '6px 14px', borderRadius: 24, fontSize: 11,
                  letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer',
                  fontWeight: 500, border: '1px solid rgba(255,255,255,.25)',
                  background: openDropdown === n.label ? '#fff' : 'transparent',
                  color: openDropdown === n.label ? '#6b5ca5' : 'rgba(255,255,255,.8)',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {n.label} ▾
                </button>
                {openDropdown === n.label && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 0,
                    background: '#fff', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.15)',
                    border: '1px solid #e4e0f0', minWidth: 160, zIndex: 200, overflow: 'hidden',
                  }}>
                    {n.children!.map(c => (
                      <button key={c.href} onClick={() => { router.push(c.href); setOpenDropdown(null) }}
                        style={{
                          display: 'block', width: '100%', padding: '10px 16px', fontSize: 12,
                          textAlign: 'left', background: pathname === c.href ? '#f2f0f9' : '#fff',
                          color: pathname === c.href ? '#6b5ca5' : '#1a1520', border: 'none',
                          cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: pathname === c.href ? 600 : 400,
                          borderBottom: '1px solid #f0eef8',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8f7fc')}
                        onMouseLeave={e => (e.currentTarget.style.background = pathname === c.href ? '#f2f0f9' : '#fff')}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button key={n.href} onClick={() => router.push(n.href!)}
                style={{
                  padding: '6px 14px', borderRadius: 24, fontSize: 11,
                  letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer',
                  fontWeight: pathname === n.href ? 600 : 500,
                  border: '1px solid ' + (pathname === n.href ? '#fff' : 'rgba(255,255,255,.25)'),
                  background: pathname === n.href ? '#fff' : 'transparent',
                  color: pathname === n.href ? '#6b5ca5' : 'rgba(255,255,255,.8)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {n.label}
              </button>
            )
          ))}
          <button onClick={handleLogout} style={{
            marginLeft: 8, padding: '6px 14px', borderRadius: 24, fontSize: 11,
            letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer',
            border: '1px solid rgba(255,255,255,.2)', background: 'transparent',
            color: 'rgba(255,255,255,.5)', fontFamily: 'Inter, sans-serif',
          }}>
            Log ud
          </button>
        </div>
      </div>

      <div style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  )
}