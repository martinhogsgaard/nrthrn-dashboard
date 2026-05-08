'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard/overview',    label: 'Overblik' },
  { href: '/dashboard/splits',      label: 'Split-moms' },
  { href: '/dashboard/classes',     label: 'Hold' },
  { href: '/dashboard/members',     label: 'Medlemmer' },
  { href: '/dashboard/instructors', label: 'Instruktører' },
  { href: '/dashboard/payroll',     label: 'Løn' },
  { href: '/dashboard/setup',       label: 'Opsætning' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
const [checked, setChecked] = useState(false)

useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) {
      window.location.href = '/login'
    } else {
      setChecked(true)
    }
  })
}, [])

if (!checked) return null

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7fc', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#fff3d4', borderBottom: '1px solid #f0d080', padding: '7px 32px', fontSize: 10, color: '#9a6200', letterSpacing: '.1em', textAlign: 'center', fontWeight: 500, textTransform: 'uppercase' }}>
        Demo — Fiktive tal til illustration · Kobles til Mariana Tek API for live data
      </div>
      <div style={{ background: 'linear-gradient(90deg, #5a4898 0%, #1a1228 50%, #5a4898 100%)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '.12em' }}>NRTHRN STRONG</div>
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,.25)' }} />
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', letterSpacing: '.18em', textTransform: 'uppercase' }}>Ledelsesdashboard</div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {NAV.map(n => (
            <button key={n.href} onClick={() => router.push(n.href)} style={{ padding: '6px 14px', borderRadius: 24, fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: pathname === n.href ? 600 : 500, border: '1px solid ' + (pathname === n.href ? '#fff' : 'rgba(255,255,255,.25)'), background: pathname === n.href ? '#fff' : 'transparent', color: pathname === n.href ? '#6b5ca5' : 'rgba(255,255,255,.8)', fontFamily: 'Inter, sans-serif', transition: 'all .15s' }}>
              {n.label}
            </button>
          ))}
          <button onClick={handleLogout} style={{ marginLeft: 8, padding: '6px 14px', borderRadius: 24, fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontFamily: 'Inter, sans-serif' }}>
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