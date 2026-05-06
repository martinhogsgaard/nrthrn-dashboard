// Delte UI komponenter til dashboard

export function KpiCard({
  label, value, sub, subColor
}: {
  label: string
  value: string | number
  sub?: string
  subColor?: 'green' | 'red' | 'default'
}) {
  const subColors = { green: '#2e8b6a', red: '#c0392b', default: '#8a85a0' }
  return (
    <div style={{
      background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10,
      padding: '18px 16px', borderTop: '3px solid #6b5ca5'
    }}>
      <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, fontWeight: 700, color: '#1a1520', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: subColors[subColor || 'default'], marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export function Card({
  title, children
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24 }}>
      {title && (
        <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 18 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

export function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600,
      letterSpacing: '.2em', textTransform: 'uppercase', color: '#6b5ca5',
      marginBottom: 24, paddingBottom: 12, borderBottom: '2px solid #d0c8e8'
    }}>
      <div style={{ width: 4, height: 16, background: '#6b5ca5', borderRadius: 2 }} />
      {children}
    </div>
  )
}

export function Badge({ children, type }: { children: React.ReactNode, type: 'junior' | 'senior' | 'employed' | 'freelance' }) {
  const styles = {
    junior:   { bg: '#e8f5ef', color: '#2e8b6a', border: '#b0d8c4' },
    senior:   { bg: '#f2f0f9', color: '#6b5ca5', border: '#d0c8e8' },
    employed: { bg: '#eef0f8', color: '#5060a0', border: '#c0c8e8' },
    freelance:{ bg: '#fff3d4', color: '#9a6200', border: '#f0d080' },
  }
  const s = styles[type]
  return (
    <span style={{
      fontSize: 9, padding: '2px 9px', borderRadius: 12, fontWeight: 600,
      letterSpacing: '.04em', border: `1px solid ${s.border}`,
      background: s.bg, color: s.color
    }}>
      {children}
    </span>
  )
}

export function formatDKK(n: number) {
  return Math.round(n).toLocaleString('da-DK') + ' kr.'
}
