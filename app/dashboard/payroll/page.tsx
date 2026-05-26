'use client'
import { useEffect, useState } from 'react'
import { SecLabel, formatDKK, Badge } from '@/components/ui'

interface Session {
  date: string
  class_name: string
  participants: number
  participants_over_30: number
  participants_under_30: number
  is_estimated: boolean
  base_rate: number
  bonus: number
  total_amount: number
  capacity: number
}

interface PayrollResult {
  sessions_count: number
  total_participants: number
  participants_over_30: number
  participants_under_30: number
  time_total: number
  bonus_total: number
  subtotal: number
  is_freelance: boolean
  invoice_total?: number
}

interface InstructorPayroll {
  instructor: {
    id: string
    name: string
    initials: string
    level: 'junior' | 'senior'
    employment_type: 'employed' | 'freelance'
  }
  sessions_count: number
  sessions: Session[]
  payroll: PayrollResult
}

interface SalaryPreviewLine {
  date: string
  time: string
  class_type: string
  participants: number
  holdlon: number
  bonus: number
  total: number
  title: string
}

interface SalaryPreviewEmployee {
  name: string
  sessions: number
  totalHoldlon: number
  totalBonus: number
  total: number
  lines: SalaryPreviewLine[]
}

interface SalaryPreview {
  month: string
  dispositionDate: string
  employeeCount: number
  lineCount: number
  totalAmount: number
  employees: SalaryPreviewEmployee[]
}

interface SlingShift {
  date: string
  position: string
  duration_minutes: number
  hours: number
  amount: number
}

interface SlingEmployee {
  employee_id: string
  name: string
  hourly_rate: number
  total_hours: number
  total_amount: number
  shifts: SlingShift[]
}

interface SlingData {
  month: string
  employeeCount: number
  totalAmount: number
  employees: SlingEmployee[]
}

function getCurrentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return { start: `${year}-${month}-01`, end: `${year}-${month}-${day}` }
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function SalaryExportSection({ month }: { month: string }) {
  const [preview, setPreview] = useState<SalaryPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number, errors: number, totalAmount: number } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dispositionDate, setDispositionDate] = useState('')

  async function loadPreview() {
    setLoading(true)
    setResult(null)
    const res = await fetch(`/api/salary-payroll?month=${month}`)
    const data = await res.json()
    setPreview(data)
    setDispositionDate(data.dispositionDate || '')
    setLoading(false)
  }

  async function sendToSalary() {
    setSending(true)
    setShowConfirm(false)
    const res = await fetch('/api/salary-payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, dispositionDate })
    })
    const data = await res.json()
    setResult(data)
    setSending(false)
    setPreview(null)
  }

  return (
    <div style={{ marginTop: 24, background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4e0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1520' }}>Send løn til Salary.dk</div>
          <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 2 }}>Sender én linje per hold som kladde til godkendelse i Salary</div>
        </div>
        {!preview && !result && (
          <button onClick={loadPreview} disabled={loading}
            style={{ background: '#6b5ca5', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em' }}>
            {loading ? 'Henter...' : '↓ Vis lønpreview'}
          </button>
        )}
      </div>

      {/* Resultat efter afsendelse */}
      {result && (
        <div style={{ padding: 20 }}>
          <div style={{ background: result.errors > 0 ? '#fff3d4' : '#e8f5ef', border: `1px solid ${result.errors > 0 ? '#f0d080' : '#b0d8c4'}`, borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: result.errors > 0 ? '#9a6200' : '#2e8b6a', marginBottom: 6 }}>
              {result.errors > 0 ? '⚠ Delvist sendt' : '✓ Sendt til Salary'}
            </div>
            <div style={{ fontSize: 12, color: '#4a4560' }}>
              {result.sent} lønlinjer sendt · {formatDKK(result.totalAmount)} i alt
              {result.errors > 0 && ` · ${result.errors} fejlede`}
            </div>
            <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 6 }}>
              Lønkladderne afventer godkendelse i Salary.dk
            </div>
          </div>
          <button onClick={() => setResult(null)} style={{ marginTop: 12, background: '#f8f7fc', border: '1px solid #e4e0f0', color: '#1a1520', padding: '7px 16px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
            Nulstil
          </button>
        </div>
      )}

      {/* Preview */}
      {preview && !result && (
        <div style={{ padding: 20 }}>
          {/* Overblik */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Medarbejdere', val: preview.employeeCount },
              { label: 'Lønlinjer', val: preview.lineCount },
              { label: 'Samlet beløb', val: formatDKK(preview.totalAmount) },
            ].map((k, i) => (
              <div key={i} style={{ background: '#f8f7fc', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1520' }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Per medarbejder */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {preview.employees.map(emp => (
              <div key={emp.name} style={{ border: '1px solid #e4e0f0', borderRadius: 8, overflow: 'hidden' }}>
                <div
                  onClick={() => setExpanded(expanded === emp.name ? null : emp.name)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', background: expanded === emp.name ? '#f8f7fc' : '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#6b5ca5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                      {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1520' }}>{emp.name}</div>
                      <div style={{ fontSize: 11, color: '#8a85a0' }}>{emp.sessions} hold · {formatDKK(emp.totalHoldlon)} løn{emp.totalBonus > 0 ? ` + ${formatDKK(emp.totalBonus)} bonus` : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#1a1520' }}>{formatDKK(emp.total)}</div>
                    <span style={{ color: '#8a85a0', fontSize: 12 }}>{expanded === emp.name ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expanded === emp.name && (
                  <div style={{ borderTop: '1px solid #e4e0f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: '#f8f7fc' }}>
                          {['Dato', 'Tid', 'Hold', 'Del.', 'Løn', 'Bonus', 'Total'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, borderBottom: '1px solid #e4e0f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {emp.lines.map((line, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f0eef8' }}>
                            <td style={{ padding: '8px 12px', color: '#8a85a0' }}>{line.date}</td>
                            <td style={{ padding: '8px 12px', color: '#8a85a0' }}>{line.time}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{line.class_type}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>{line.participants}</td>
                            <td style={{ padding: '8px 12px' }}>{formatDKK(line.holdlon)}</td>
                            <td style={{ padding: '8px 12px' }}>
                              {line.bonus > 0
                                ? <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: '#f2f0f9', color: '#6b5ca5', fontWeight: 600 }}>+{formatDKK(line.bonus)}</span>
                                : '—'}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>{formatDKK(line.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Dispositionsdato + send knap */}
          <div style={{ background: '#f8f7fc', border: '1px solid #e4e0f0', borderRadius: 8, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <label style={{ fontSize: 12, color: '#4a4560' }}>
              Dispositionsdato
              <input type="date" value={dispositionDate} onChange={e => setDispositionDate(e.target.value)}
                style={{ display: 'block', marginTop: 4, padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif' }} />
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPreview(null)}
                style={{ background: '#f8f7fc', border: '1px solid #e4e0f0', color: '#1a1520', padding: '9px 20px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
                Annuller
              </button>
              <button onClick={() => setShowConfirm(true)}
                style={{ background: '#2e8b6a', border: 'none', color: '#fff', padding: '9px 24px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em' }}>
                Send {preview.lineCount} linjer til Salary →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bekræftelsesdialog */}
      {showConfirm && preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 440, boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1520', marginBottom: 8 }}>Bekræft afsendelse</div>
            <div style={{ fontSize: 13, color: '#4a4560', marginBottom: 20, lineHeight: 1.6 }}>
              Du er ved at sende <strong>{preview.lineCount} lønlinjer</strong> for <strong>{preview.employeeCount} medarbejdere</strong> til Salary.dk som kladder til godkendelse.<br /><br />
              Samlet beløb: <strong>{formatDKK(preview.totalAmount)}</strong><br />
              Dispositionsdato: <strong>{dispositionDate}</strong>
            </div>
            <div style={{ background: '#fff3d4', border: '1px solid #f0d080', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 11, color: '#9a6200' }}>
              Lønkladderne skal godkendes manuelt i Salary.dk inden udbetaling.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={sendToSalary} disabled={sending}
                style={{ flex: 1, background: '#2e8b6a', border: 'none', color: '#fff', padding: '10px', borderRadius: 24, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                {sending ? 'Sender...' : 'Ja, send til Salary'}
              </button>
              <button onClick={() => setShowConfirm(false)}
                style={{ flex: 1, background: '#f8f7fc', border: '1px solid #e4e0f0', color: '#1a1520', padding: '10px', borderRadius: 24, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                Annuller
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SlingSection({ month }: { month: string }) {
  const [data, setData] = useState<SlingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/sling-shifts?month=${month}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [month])

  if (loading) return <div style={{ padding: 20, color: '#8a85a0', fontSize: 12 }}>Henter Sling vagter...</div>
  if (!data || data.employeeCount === 0) return (
    <div style={{ padding: '16px 20px', color: '#8a85a0', fontSize: 12 }}>Ingen front desk / facilities vagter fundet i Sling</div>
  )

  return (
    <div style={{ marginTop: 24, background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4e0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1520' }}>Front Desk & Facilities — Sling</div>
          <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 2 }}>{data.employeeCount} medarbejdere · {formatDKK(data.totalAmount)} i alt</div>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f8f7fc' }}>
            {['Medarbejder', 'Stilling', 'Timer', 'Timesats', 'I alt', ''].map(h => (
              <th key={h} style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #e4e0f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.employees.map(emp => (
            <>
              <tr key={emp.employee_id}
                onClick={() => setExpanded(expanded === emp.employee_id ? null : emp.employee_id)}
                style={{ cursor: 'pointer', borderBottom: '1px solid #f0eef8' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8f7fc')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2e8b6a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                      {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: '#1a1520' }}>{emp.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#e8f5ef', color: '#2e8b6a', border: '1px solid #b0d8c4', fontWeight: 600 }}>
                    {emp.shifts[0]?.position || '—'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700 }}>{emp.total_hours}</td>
                <td style={{ padding: '12px 16px', color: '#4a4560' }}>{formatDKK(emp.hourly_rate)}/t</td>
                <td style={{ padding: '12px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#1a1520' }}>{formatDKK(emp.total_amount)}</td>
                <td style={{ padding: '12px 16px', color: '#8a85a0' }}>{expanded === emp.employee_id ? '▲' : '▼'}</td>
              </tr>
              {expanded === emp.employee_id && (
                <tr key={`${emp.employee_id}-detail`} style={{ borderBottom: '1px solid #e4e0f0' }}>
                  <td colSpan={6} style={{ padding: '0 16px 12px 58px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr>
                          {['Dato', 'Stilling', 'Timer', 'Beløb'].map(h => (
                            <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, borderBottom: '1px solid #e4e0f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {emp.shifts.map((s, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f8f7fc' }}>
                            <td style={{ padding: '6px 8px', color: '#8a85a0' }}>{s.date}</td>
                            <td style={{ padding: '6px 8px' }}>{s.position}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{s.hours}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{formatDKK(s.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#e8f5ef', borderTop: '2px solid #b0d8c4' }}>
            <td colSpan={2} style={{ padding: '14px 16px', fontWeight: 700, fontSize: 13, color: '#1a1520' }}>I alt</td>
            <td style={{ padding: '14px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700 }}>
              {Math.round(data.employees.reduce((s, e) => s + e.total_hours, 0) * 10) / 10}
            </td>
            <td></td>
            <td style={{ padding: '14px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: '#2e8b6a' }}>{formatDKK(data.totalAmount)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function PayrollPage() {
  const [data, setData] = useState<InstructorPayroll[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(getCurrentMonthRange())
  const [selected, setSelected] = useState<InstructorPayroll | null>(null)

  useEffect(() => { loadData() }, [period])

  async function loadData() {
    setLoading(true)
    const res = await fetch(`/api/payroll?start=${period.start}&end=${period.end}&location=48718`)
    const json = await res.json()
    setData(json.payroll || [])
    setLoading(false)
  }

  const totalSessions = data.reduce((s, i) => s + i.sessions_count, 0)
  const totalParticipants = data.reduce((s, i) => s + i.payroll.total_participants, 0)
  const totalPayroll = data.reduce((s, i) => s + (i.instructor.employment_type === 'freelance' ? (i.payroll.invoice_total || 0) : i.payroll.subtotal), 0)
  const totalBonus = data.reduce((s, i) => s + i.payroll.bonus_total, 0)
  const totalTime = data.reduce((s, i) => s + i.payroll.time_total, 0)
  const currentMonth = period.start.slice(0, 7)

  function exportCSV() {
    const rows = [
      ['Instruktør', 'Niveau', 'Ansættelse', 'Hold', 'Deltagere', 'Løn', 'Bonus', 'I alt'],
      ...data.map(d => [
        d.instructor.name, d.instructor.level,
        d.instructor.employment_type === 'freelance' ? 'Selvstændig' : 'Timeansat',
        d.sessions_count, d.payroll.total_participants,
        d.payroll.time_total, d.payroll.bonus_total,
        d.instructor.employment_type === 'freelance' ? (d.payroll.invoice_total || 0) : d.payroll.subtotal,
      ])
    ]
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loen-${period.start}-${period.end}.csv`
    a.click()
  }

  if (selected) return <InstructorDetail data={selected} period={period} onBack={() => setSelected(null)} />

  return (
    <div>
      <SecLabel>Lønafregning — København</SecLabel>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: '#8a85a0', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Periode:</div>
        <input type="date" value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <span style={{ color: '#8a85a0' }}>→</span>
        <input type="date" value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))}
          style={{ padding: '6px 12px', border: '1px solid #e4e0f0', borderRadius: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1520' }} />
        <button onClick={exportCSV}
          style={{ marginLeft: 'auto', background: '#1a1228', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const }}>
          ↓ Eksporter CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Samlet lønomk.', val: formatDKK(totalPayroll), color: '#6b5ca5' },
          { label: 'Heraf timepris', val: formatDKK(totalTime) },
          { label: 'Heraf bonus', val: formatDKK(totalBonus) },
          { label: 'Hold / Deltagere', val: `${totalSessions} / ${totalParticipants}` },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: '18px 16px', borderTop: `3px solid ${(k as any).color || '#e4e0f0'}` }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: (k as any).color || '#1a1520' }}>{k.val}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, color: '#8a85a0', textAlign: 'center' }}>Beregner løn...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f7fc' }}>
                {['Instruktør', 'Type', 'Hold', 'Deltagere', 'Løn', 'Bonus', 'I alt', ''].map(h => (
                  <th key={h} style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #e4e0f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.instructor.id}
                  onClick={() => setSelected(d)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #f0eef8' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8f7fc')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6b5ca5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {d.instructor.initials}
                      </div>
                      <span style={{ fontWeight: 600, color: '#1a1520' }}>{d.instructor.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <Badge type={d.instructor.level}>{d.instructor.level === 'junior' ? 'Junior' : 'Senior'}</Badge>
                      <Badge type={d.instructor.employment_type}>{d.instructor.employment_type === 'employed' ? 'Timeansat' : 'Selvstændig'}</Badge>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700 }}>{d.sessions_count}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700 }}>{d.payroll.total_participants}</td>
                  <td style={{ padding: '12px 16px', color: '#4a4560' }}>{formatDKK(d.payroll.time_total)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {d.payroll.bonus_total > 0
                      ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f2f0f9', color: '#6b5ca5', border: '1px solid #d0c8e8', fontWeight: 600 }}>+{formatDKK(d.payroll.bonus_total)}</span>
                      : <span style={{ color: '#8a85a0' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#1a1520' }}>
                    {formatDKK(d.instructor.employment_type === 'freelance' ? (d.payroll.invoice_total || 0) : d.payroll.subtotal)}
                    {d.instructor.employment_type === 'freelance' && <div style={{ fontSize: 9, color: '#8a85a0', fontFamily: 'Inter, sans-serif' }}>inkl. moms</div>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#8a85a0' }}>›</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f2f0f9', borderTop: '2px solid #d0c8e8' }}>
                <td colSpan={2} style={{ padding: '14px 16px', fontWeight: 700, fontSize: 13, color: '#1a1520' }}>I alt</td>
                <td style={{ padding: '14px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700 }}>{totalSessions}</td>
                <td style={{ padding: '14px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700 }}>{totalParticipants}</td>
                <td style={{ padding: '14px 16px', fontWeight: 600 }}>{formatDKK(totalTime)}</td>
                <td style={{ padding: '14px 16px', fontWeight: 600 }}>{formatDKK(totalBonus)}</td>
                <td style={{ padding: '14px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: '#6b5ca5' }}>{formatDKK(totalPayroll)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Sling front desk sektion */}
      <SlingSection month={currentMonth} />

      {/* Salary export sektion */}
      <SalaryExportSection month={currentMonth} />
    </div>
  )
}

function InstructorDetail({ data: d, period, onBack }: { data: InstructorPayroll, period: { start: string, end: string }, onBack: () => void }) {
  const totalAmount = d.instructor.employment_type === 'freelance' ? (d.payroll.invoice_total || 0) : d.payroll.subtotal

  return (
    <div>
      <div style={{ background: 'linear-gradient(90deg,#5a4898,#1a1228 60%,#5a4898)', borderRadius: 10, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.2)', border: '2px solid rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {d.instructor.initials}
          </div>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 700, color: '#fff' }}>{d.instructor.name}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Badge type={d.instructor.level}>{d.instructor.level === 'junior' ? 'Junior' : 'Senior'}</Badge>
              <Badge type={d.instructor.employment_type}>{d.instructor.employment_type === 'employed' ? 'Timeansat' : 'Selvstændig'}</Badge>
            </div>
          </div>
        </div>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', padding: '7px 18px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
          ← Alle instruktører
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0f0', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>
          Sessions — {period.start} til {period.end}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f7fc' }}>
              {['Dato', 'Hold', 'Deltagere', 'Over 30', 'Under 30', 'Kapacitet', 'Belægning', 'Løn', 'Bonus', 'Total'].map(h => (
                <th key={h} style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #e4e0f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.sessions.map((s, idx) => {
              const capacity = s.capacity || 18
              const pct = s.participants > 0 ? Math.round(s.participants / capacity * 100) : 0
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #f0eef8' }}>
                  <td style={{ padding: '10px 14px', color: '#8a85a0' }}>{s.date}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{s.class_name}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{s.participants}</td>
                  <td style={{ padding: '10px 14px', color: '#6b5ca5', fontWeight: 600 }}>{s.participants_over_30}</td>
                  <td style={{ padding: '10px 14px', color: '#2e8b6a', fontWeight: 600 }}>{s.participants_under_30}</td>
                  <td style={{ padding: '10px 14px', color: '#8a85a0' }}>{capacity > 0 ? capacity : '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#8a85a0' }}>{s.participants > 0 ? `${pct}%` : '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#4a4560' }}>{formatDKK(s.base_rate || 0)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {(s.bonus || 0) > 0
                      ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f2f0f9', color: '#6b5ca5', border: '1px solid #d0c8e8', fontWeight: 600 }}>+{formatDKK(s.bonus)}</span>
                      : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1a1520' }}>{formatDKK(s.total_amount || s.base_rate || 0)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#f2f0f9', border: '1px solid #d0c8e8', borderRadius: 10, padding: '20px 24px' }}>
        <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b5ca5', fontWeight: 700, marginBottom: 16 }}>Lønafregning</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { label: `Timepris · ${d.sessions_count} hold`, val: formatDKK(d.payroll.time_total) },
            { label: 'Bonus i alt', val: formatDKK(d.payroll.bonus_total) },
            ...(d.instructor.employment_type === 'freelance' ? [
              { label: 'Subtotal ekskl. moms', val: formatDKK(d.payroll.subtotal) },
              { label: 'Moms 25%', val: formatDKK(Math.round(d.payroll.subtotal * 0.25)) },
            ] : []),
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #d0c8e8' }}>
              <span style={{ fontSize: 12, color: '#4a4560' }}>{row.label}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#1a1520' }}>{row.val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1520' }}>
              {d.instructor.employment_type === 'freelance' ? 'Fakturabeløb inkl. moms' : 'Samlet udbetaling'}
            </span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, fontWeight: 700, color: '#1a1520' }}>{formatDKK(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}