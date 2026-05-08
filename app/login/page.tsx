import { login } from './actions'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #5a4898 0%, #1a1228 50%, #5a4898 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '48px 40px',
        width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: '#6b5ca5', letterSpacing: '0.1em' }}>
            NRTHRN STRONG
          </div>
          <div style={{ fontSize: 12, color: '#8a85a0', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4 }}>
            Ledelsesdashboard
          </div>
        </div>

        <form action={login}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8a85a0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8a85a0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              Adgangskode
            </label>
            <input
              name="password"
              type="password"
              required
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
            />
          </div>

          {searchParams.error && (
            <div style={{ background: '#fdecea', color: '#c0392b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              Forkert email eller adgangskode
            </div>
          )}

          <button
            type="submit"
            style={{ width: '100%', padding: '12px', background: '#6b5ca5', color: '#fff', border: 'none', borderRadius: 24, fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          >
            Log ind
          </button>
        </form>
      </div>
    </div>
  )
}