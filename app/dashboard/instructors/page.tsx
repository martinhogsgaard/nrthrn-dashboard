'use client'

import { useEffect, useState } from 'react'
import { SecLabel, Card, Badge, formatDKK } from '@/components/ui'
import { calcPayroll, calcSessionBonus, type SalaryRate } from '@/lib/payroll'

interface Instructor {
  id: string
  name: string
  initials: string
  level: 'junior' | 'senior'
  employment_type: 'employed' | 'freelance'
  salary_rates: SalaryRate[]
}

// Mock sessions — erstattes med Mariana Tek data
const MOCK_SESSIONS: Record<string, Array<{date:string,hold:string,participants:number,over:number,under:number}>> = {
  'Emma Rønning': [
    {date:'Man 04/05',hold:'STRONG 07:00',participants:17,over:11,under:6},
    {date:'Man 04/05',hold:'STRONG 17:30',participants:15,over:9,under:6},
    {date:'Fre 08/05',hold:'STRONG 07:00',participants:13,over:8,under:5},
    {date:'Man 11/05',hold:'STRONG 07:00',participants:16,over:10,under:6},
    {date:'Man 11/05',hold:'STRONG 17:30',participants:14,over:8,under:6},
    {date:'Fre 15/05',hold:'STRONG 07:00',participants:14,over:9,under:5},
    {date:'Man 18/05',hold:'STRONG 07:00',participants:17,over:11,under:6},
    {date:'Man 18/05',hold:'STRONG 17:30',participants:16,over:9,under:7},
    {date:'Fre 22/05',hold:'STRONG 07:00',participants:12,over:7,under:5},
  ],
  'Lukas Berg': [
    {date:'Ons 06/05',hold:'STRONG 06:30',participants:11,over:7,under:4},
    {date:'Tor 07/05',hold:'STRONG 17:30',participants:18,over:12,under:6},
    {date:'Ons 13/05',hold:'STRONG 06:30',participants:12,over:8,under:4},
    {date:'Tor 14/05',hold:'STRONG 17:30',participants:17,over:11,under:6},
    {date:'Ons 20/05',hold:'STRONG 06:30',participants:10,over:6,under:4},
    {date:'Tor 21/05',hold:'STRONG 17:30',participants:18,over:12,under:6},
    {date:'Ons 27/05',hold:'STRONG 06:30',participants:13,over:8,under:5},
    {date:'Tor 28/05',hold:'STRONG 17:30',participants:16,over:10,under:6},
  ],
  'Sofie Munk': [
    {date:'Man 04/05',hold:'REVIVAL 09:00',participants:12,over:6,under:6},
    {date:'Tir 05/05',hold:'REVIVAL 09:00',participants:15,over:8,under:7},
    {date:'Man 11/05',hold:'REVIVAL 09:00',participants:11,over:5,under:6},
    {date:'Tir 12/05',hold:'REVIVAL 09:00',participants:14,over:7,under:7},
    {date:'Man 18/05',hold:'REVIVAL 09:00',participants:13,over:7,under:6},
    {date:'Tir 19/05',hold:'REVIVAL 09:00',participants:16,over:9,under:7},
    {date:'Man 25/05',hold:'REVIVAL 09:00',participants:12,over:6,under:6},
  ],
  'Nikolaj Holm': [
    {date:'Tor 07/05',hold:'REVIVAL 18:00',participants:14,over:7,under:7},
    {date:'Lør 09/05',hold:'REVIVAL 10:00',participants:6,over:3,under:3},
    {date:'Tor 14/05',hold:'REVIVAL 18:00',participants:15,over:8,under:7},
    {date:'Lør 16/05',hold:'REVIVAL 10:00',participants:7,over:4,under:3},
    {date:'Tor 21/05',hold:'REVIVAL 18:00',participants:13,over:7,under:6},
    {date:'Lør 23/05',hold:'REVIVAL 10:00',participants:5,over:2,under:3},
  ],
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [selected, setSelected] = useState<Instructor | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [rates, setRates] = useState<Record<string, SalaryRate>>({})

  useEffect(() => {
    fetch('/api/instructors')
      .then(r => r.json())
      .then(data => {
        setInstructors(data)
        // Byg rates-map fra Supabase data
        const ratesMap: Record<string, SalaryRate> = {}
        data.forEach((i: Instructor) => {
          const active = i.salary_rates?.find(r => !r.valid_to) || i.salary_rates?.[0]
          if (active) ratesMap[i.id] = active
        })
        setRates(ratesMap)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function getRate(i: Instructor): SalaryRate {
    return rates[i.id] || {
      rate_per_class: i.level === 'senior' ? 500 : 300,
      bonus_threshold_1: 8, bonus_threshold_2: 12, bonus_threshold_3: 15,
      bonus_tier_2: i.level === 'senior' ? 20 : 15,
      bonus_tier_3: i.level === 'senior' ? 35 : 25,
      bonus_tier_4: i.level === 'senior' ? 50 : 35,
    }
  }

  function getSessions(i: Instructor) {
    return MOCK_SESSIONS[i.name] || []
  }

  function getPayroll(i: Instructor) {
    const sessions = getSessions(i).map(s => ({
      participants: s.participants,
      participants_over_30: s.over,
      participants_under_30: s.under,
      date: s.date,
      class_name: s.hold,
    }))
    return calcPayroll(sessions, getRate(i), i.employment_type === 'freelance')
  }

  async function saveRates(i: Instructor, newRates: SalaryRate) {
    setSaving(true)
    setRates(prev => ({ ...prev, [i.id]: newRates }))
    await fetch('/api/salary-rates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructor_id: i.id, ...newRates }),
    })
    setSaving(false)
    setSavedId(i.id)
    setTimeout(() => setSavedId(null), 2500)
  }

  if (loading) return <div style={{ padding: 40, color: '#8a85a0' }}>Henter instruktører...</div>

  if (selected) {
    return <InstructorDetail
      instructor={selected}
      rate={getRate(selected)}
      sessions={getSessions(selected)}
      payroll={getPayroll(selected)}
      saving={saving}
      saved={savedId === selected.id}
      onSave={(r) => saveRates(selected, r)}
      onBack={() => setSelected(null)}
    />
  }

  return (
    <div>
      <SecLabel>Instruktøroversigt — maj 2026</SecLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background:'#fff',border:'1px solid #e4e0f0',borderRadius:10,padding:'18px 16px',borderTop:'3px solid #6b5ca5' }}>
          <div style={{ fontSize:9,letterSpacing:'.14em',textTransform:'uppercase',color:'#8a85a0',fontWeight:600,marginBottom:10 }}>Instruktører</div>
          <div style={{ fontFamily:'Barlow Condensed',fontSize:32,fontWeight:700,color:'#1a1520' }}>{instructors.length}</div>
        </div>
        <div style={{ background:'#fff',border:'1px solid #e4e0f0',borderRadius:10,padding:'18px 16px',borderTop:'3px solid #6b5ca5' }}>
          <div style={{ fontSize:9,letterSpacing:'.14em',textTransform:'uppercase',color:'#8a85a0',fontWeight:600,marginBottom:10 }}>Hold i alt</div>
          <div style={{ fontFamily:'Barlow Condensed',fontSize:32,fontWeight:700,color:'#1a1520' }}>
            {instructors.reduce((s,i) => s + getSessions(i).length, 0)}
          </div>
        </div>
        <div style={{ background:'#fff',border:'1px solid #e4e0f0',borderRadius:10,padding:'18px 16px',borderTop:'3px solid #6b5ca5' }}>
          <div style={{ fontSize:9,letterSpacing:'.14em',textTransform:'uppercase',color:'#8a85a0',fontWeight:600,marginBottom:10 }}>Total deltagere</div>
          <div style={{ fontFamily:'Barlow Condensed',fontSize:32,fontWeight:700,color:'#1a1520' }}>
            {instructors.reduce((s,i) => s + getSessions(i).reduce((ss,x) => ss+x.participants,0), 0)}
          </div>
        </div>
        <div style={{ background:'#fff',border:'1px solid #e4e0f0',borderRadius:10,padding:'18px 16px',borderTop:'3px solid #6b5ca5' }}>
          <div style={{ fontSize:9,letterSpacing:'.14em',textTransform:'uppercase',color:'#8a85a0',fontWeight:600,marginBottom:10 }}>Samlet lønomk.</div>
          <div style={{ fontFamily:'Barlow Condensed',fontSize:28,fontWeight:700,color:'#1a1520' }}>
            {formatDKK(instructors.reduce((s,i) => {
              const p = getPayroll(i)
              return s + (i.employment_type === 'freelance' ? (p.invoice_total||0) : p.subtotal)
            }, 0))}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16 }}>
        {instructors.map(i => {
          const sessions = getSessions(i)
          const p = getPayroll(i)
          const totalPart = sessions.reduce((s,x)=>s+x.participants,0)
          const totalOver = sessions.reduce((s,x)=>s+x.over,0)
          const totalUnder = sessions.reduce((s,x)=>s+x.under,0)
          const disp = i.employment_type === 'freelance' ? formatDKK(p.invoice_total||0) : formatDKK(p.subtotal)

          return (
            <div key={i.id}
              onClick={() => setSelected(i)}
              style={{ background:'#fff',border:'1px solid #e4e0f0',borderRadius:10,cursor:'pointer',transition:'all .2s',overflow:'hidden' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor='#6b5ca5')}
              onMouseLeave={e => (e.currentTarget.style.borderColor='#e4e0f0')}
            >
              <div style={{ padding:'18px 20px 0' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:40,height:40,borderRadius:'50%',background:'#6b5ca5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff' }}>
                      {i.initials}
                    </div>
                    <div>
                      <div style={{ fontSize:15,fontWeight:600,color:'#1a1520' }}>{i.name}</div>
                      <div style={{ display:'flex',gap:6,marginTop:5 }}>
                        <Badge type={i.level}>{i.level === 'junior' ? 'Junior' : 'Senior'}</Badge>
                        <Badge type={i.employment_type}>{i.employment_type === 'employed' ? 'Timeansat' : 'Selvstændig'}</Badge>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'Barlow Condensed',fontSize:18,fontWeight:700,color:'#1a1520' }}>{disp}</div>
                    <div style={{ fontSize:10,color:'#8a85a0',marginTop:2 }}>
                      {i.employment_type === 'freelance' ? 'Faktura inkl. moms' : 'Løn denne måned'}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex',gap:0,padding:'14px 20px',borderTop:'1px solid #e4e0f0',marginTop:14 }}>
                {[
                  { val: sessions.length, label: 'Hold' },
                  { val: totalPart, label: 'Deltagere' },
                  { val: totalOver, label: 'Over 30', color: '#6b5ca5' },
                  { val: totalUnder, label: 'Under 30', color: '#2e8b6a' },
                ].map((s,idx) => (
                  <div key={idx} style={{ flex:1, textAlign:'center', borderLeft: idx>0 ? '1px solid #e4e0f0' : 'none' }}>
                    <div style={{ fontFamily:'Barlow Condensed',fontSize:22,fontWeight:700,color:s.color||'#1a1520' }}>{s.val}</div>
                    <div style={{ fontSize:9,color:'#8a85a0',letterSpacing:'.1em',textTransform:'uppercase',marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InstructorDetail({ instructor, rate, sessions, payroll, saving, saved, onSave, onBack }: {
  instructor: Instructor
  rate: SalaryRate
  sessions: Array<{date:string,hold:string,participants:number,over:number,under:number}>
  payroll: ReturnType<typeof calcPayroll>
  saving: boolean
  saved: boolean
  onSave: (r: SalaryRate) => void
  onBack: () => void
}) {
  const [r, setR] = useState<SalaryRate>({ ...rate })

  function field(label: string, key: keyof SalaryRate, unit: string) {
    return (
      <div style={{ background:'#f8f7fc',border:'1px solid #e4e0f0',borderRadius:8,padding:'12px 14px' }}>
        <div style={{ fontSize:9,letterSpacing:'.12em',textTransform:'uppercase',color:'#8a85a0',fontWeight:600,marginBottom:6 }}>{label}</div>
        <div style={{ display:'flex',alignItems:'baseline',gap:6 }}>
          <input
            type="number"
            value={r[key] as number}
            onChange={e => setR(prev => ({ ...prev, [key]: parseInt(e.target.value)||0 }))}
            style={{ background:'none',border:'none',borderBottom:'2px solid #d0c8e8',color:'#1a1520',fontFamily:'Barlow Condensed',fontSize:20,fontWeight:700,width:80,outline:'none',paddingBottom:2 }}
          />
          <span style={{ fontSize:10,color:'#8a85a0' }}>{unit}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        background:'linear-gradient(90deg,#5a4898,#1a1228 60%,#5a4898)',
        borderRadius:10,padding:'20px 24px',display:'flex',justifyContent:'space-between',
        alignItems:'center',marginBottom:16
      }}>
        <div style={{ display:'flex',alignItems:'center',gap:14 }}>
          <div style={{ width:46,height:46,borderRadius:'50%',background:'rgba(255,255,255,.2)',border:'2px solid rgba(255,255,255,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:'#fff' }}>
            {instructor.initials}
          </div>
          <div>
            <div style={{ fontFamily:'Barlow Condensed',fontSize:24,fontWeight:700,color:'#fff' }}>{instructor.name}</div>
            <div style={{ display:'flex',gap:8,marginTop:4 }}>
              <Badge type={instructor.level}>{instructor.level === 'junior' ? 'Junior' : 'Senior'}</Badge>
              <Badge type={instructor.employment_type}>{instructor.employment_type === 'employed' ? 'Timeansat' : 'Selvstændig'}</Badge>
            </div>
          </div>
        </div>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.3)',color:'#fff',padding:'7px 18px',borderRadius:24,cursor:'pointer',fontSize:11,fontFamily:'Inter',letterSpacing:'.06em' }}>
          ← Alle instruktører
        </button>
      </div>

      {/* Lønsatser */}
      <Card title="Lønsatser — redigér og gem">
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10,color:'#8a85a0',marginBottom:8,letterSpacing:'.08em',textTransform:'uppercase',fontWeight:600 }}>Timepris pr. hold</div>
          {field('Kr. pr. hold', 'rate_per_class', 'kr./hold')}
        </div>
        <div style={{ background:'#f2f0f9',border:'1px solid #d0c8e8',borderRadius:8,padding:'16px 18px',marginBottom:16 }}>
          <div style={{ fontSize:9,letterSpacing:'.14em',textTransform:'uppercase',color:'#6b5ca5',fontWeight:700,marginBottom:12 }}>
            Bonusstruktur — kr. pr. deltager i hvert interval (kumulativ trappemodel)
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10 }}>
            {[
              { label: `0–${r.bonus_threshold_1} del.`, key: null, val: '0 kr.' },
              { label: `${r.bonus_threshold_1+1}–${r.bonus_threshold_2} del.`, key: 'bonus_tier_2' as keyof SalaryRate },
              { label: `${r.bonus_threshold_2+1}–${r.bonus_threshold_3} del.`, key: 'bonus_tier_3' as keyof SalaryRate },
              { label: `${r.bonus_threshold_3}+ del.`, key: 'bonus_tier_4' as keyof SalaryRate },
            ].map((t, idx) => (
              <div key={idx} style={{ background:'#fff',border:'1px solid #d0c8e8',borderRadius:7,padding:'12px 14px' }}>
                <div style={{ fontSize:9,letterSpacing:'.08em',color:'#8a85a0',fontWeight:600,textTransform:'uppercase',marginBottom:6 }}>{t.label}</div>
                {t.key ? (
                  <input
                    type="number"
                    value={r[t.key] as number}
                    onChange={e => setR(prev => ({ ...prev, [t.key!]: parseInt(e.target.value)||0 }))}
                    style={{ background:'none',border:'none',borderBottom:'2px solid #d0c8e8',color:'#1a1520',fontFamily:'Barlow Condensed',fontSize:20,fontWeight:700,width:'100%',outline:'none',paddingBottom:2 }}
                  />
                ) : (
                  <div style={{ fontFamily:'Barlow Condensed',fontSize:20,fontWeight:700,color:'#8a85a0' }}>0</div>
                )}
                <div style={{ fontSize:9,color:'#8a85a0',marginTop:4 }}>kr./deltager</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <button
            onClick={() => onSave(r)}
            disabled={saving}
            style={{ background:'#6b5ca5',border:'none',color:'#fff',padding:'9px 24px',borderRadius:24,cursor:'pointer',fontSize:12,fontFamily:'Inter',letterSpacing:'.06em',textTransform:'uppercase',fontWeight:600 }}
          >
            {saving ? 'Gemmer...' : 'Gem satser'}
          </button>
          {saved && <span style={{ fontSize:11,color:'#2e8b6a',fontWeight:500 }}>✓ Gemt i Supabase</span>}
        </div>
      </Card>

      {/* Sessions tabel */}
      <Card title="Alle sessions denne måned">
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
            <thead>
              <tr>
                {['Dato','Hold','Deltagere','Over 30','Under 30','Belægning','Timepris','Bonus','Total'].map(h => (
                  <th key={h} style={{ fontSize:9,letterSpacing:'.12em',textTransform:'uppercase',color:'#8a85a0',fontWeight:700,padding:'0 10px 12px 0',borderBottom:'2px solid #e4e0f0',textAlign:'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, idx) => {
                const bonus = calcSessionBonus(s.participants, r)
                return (
                  <tr key={idx}>
                    <td style={{ padding:'10px 10px 10px 0',borderBottom:'1px solid #e4e0f0',color:'#8a85a0' }}>{s.date}</td>
                    <td style={{ padding:'10px 10px 10px 0',borderBottom:'1px solid #e4e0f0',fontWeight:500 }}>{s.hold}</td>
                    <td style={{ padding:'10px 10px 10px 0',borderBottom:'1px solid #e4e0f0',fontWeight:600 }}>{s.participants}</td>
                    <td style={{ padding:'10px 10px 10px 0',borderBottom:'1px solid #e4e0f0',color:'#6b5ca5',fontWeight:600 }}>{s.over}</td>
                    <td style={{ padding:'10px 10px 10px 0',borderBottom:'1px solid #e4e0f0',color:'#2e8b6a',fontWeight:600 }}>{s.under}</td>
                    <td style={{ padding:'10px 10px 10px 0',borderBottom:'1px solid #e4e0f0',color:'#8a85a0' }}>{Math.round(s.participants/18*100)}%</td>
                    <td style={{ padding:'10px 10px 10px 0',borderBottom:'1px solid #e4e0f0',color:'#8a85a0' }}>{formatDKK(r.rate_per_class)}</td>
                    <td style={{ padding:'10px 10px 10px 0',borderBottom:'1px solid #e4e0f0' }}>
                      {bonus > 0 ? <span style={{ fontSize:9,padding:'2px 7px',borderRadius:10,background:'#f2f0f9',color:'#6b5ca5',border:'1px solid #d0c8e8',fontWeight:600 }}>+{formatDKK(bonus)}</span> : '—'}
                    </td>
                    <td style={{ padding:'10px 0',borderBottom:'1px solid #e4e0f0',fontWeight:700,textAlign:'right' }}>{formatDKK(r.rate_per_class+bonus)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Lønafregning */}
      <div style={{ background:'#f2f0f9',border:'1px solid #d0c8e8',borderRadius:8,padding:'18px 22px',marginTop:16 }}>
        <div style={{ fontSize:9,letterSpacing:'.16em',textTransform:'uppercase',color:'#6b5ca5',fontWeight:700,marginBottom:14 }}>Lønafregning</div>
        {[
          { label: `Timepris · ${sessions.length} hold × ${formatDKK(r.rate_per_class)}`, val: formatDKK(payroll.time_total) },
          { label: 'Bonus i alt', val: formatDKK(payroll.bonus_total) },
        ].map((row,i) => (
          <div key={i} style={{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #d0c8e8' }}>
            <span style={{ fontSize:12,color:'#4a4560' }}>{row.label}</span>
            <span style={{ fontFamily:'Barlow Condensed',fontSize:16,fontWeight:700,color:'#1a1520' }}>{row.val}</span>
          </div>
        ))}

        {instructor.employment_type === 'freelance' && payroll.vat_split_pct !== undefined && (
          <>
            <div style={{ background:'#fff8e8',border:'1px solid #f0d080',borderRadius:6,padding:'10px 14px',margin:'10px 0',fontSize:11,color:'#9a6200',lineHeight:1.7 }}>
              <strong>Freelance-faktura med differentieret moms:</strong> Hele fakturabeløbet (timepris + bonus) splittes på over/under 30-andelen. Over 30 ({payroll.vat_split_pct}%): momspligtig. Under 30: momsfri.
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #d0c8e8' }}>
              <div>
                <div style={{ fontSize:12,color:'#4a4560' }}>Samlet faktura ekskl. moms</div>
              </div>
              <span style={{ fontFamily:'Barlow Condensed',fontSize:16,fontWeight:700,color:'#1a1520' }}>{formatDKK(payroll.subtotal)}</span>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #d0c8e8' }}>
              <div>
                <div style={{ fontSize:12,color:'#4a4560' }}>Moms ({payroll.vat_split_pct}% af faktura × 25%)</div>
              </div>
              <span style={{ fontFamily:'Barlow Condensed',fontSize:16,fontWeight:700,color:'#6b5ca5' }}>{formatDKK(payroll.vat_amount||0)}</span>
            </div>
          </>
        )}

        <div style={{ display:'flex',justifyContent:'space-between',padding:'12px 0 0' }}>
          <span style={{ fontSize:13,fontWeight:700,color:'#1a1520' }}>
            {instructor.employment_type === 'freelance' ? 'Faktura inkl. korrekt moms' : 'Samlet udbetaling'}
          </span>
          <span style={{ fontFamily:'Barlow Condensed',fontSize:28,fontWeight:700,color:'#1a1520' }}>
            {instructor.employment_type === 'freelance' ? formatDKK(payroll.invoice_total||0) : formatDKK(payroll.subtotal)}
          </span>
        </div>
      </div>
    </div>
  )
}
