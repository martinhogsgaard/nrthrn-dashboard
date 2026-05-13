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
      { href: '/dashboard/instructors', label: 'Instruktører' },
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
  { label: 'Opsætning', href: '/dashboard/setup' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => router.push('/dashboard/overview')}>
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
