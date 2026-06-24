'use client'

import { useEffect, useState } from 'react'

interface ClassTypeStat {
  class_type: string
  sessions: number
  avg_participants: number
  avg_occupancy: number
  total_participants: number
}

interface InstructorStat {
  instructor_name: string
  sessions: number
  avg_participants: number
  avg_occupancy: number
}

interface HeatmapCell {
  weekday: string
  hour: string
  sessions: number
  avg_occupancy: number
}

interface InsightsBlock {
  period: { start: string; end: string }
  sessions_total: number
  participants_total: number
  avg_occupancy: number
  class_types: ClassTypeStat[]
  instructors: InstructorStat[]
  heatmap: { cells: HeatmapCell[]; weekday_order: string[]; hours: string[] }
}

interface InsightsResponse {
  current: InsightsBlock
  compare: InsightsBlock | null
}

const weekdayLabel: Record<string, string> = {
  mandag: 'Man', tirsdag: 'Tir', onsdag: 'Ons', torsdag: 'Tor',
  fredag: 'Fre', lørdag: 'Lør', søndag: 'Søn',
}

function Delta({ current, prev, suffix = '' }: { current: number; prev: number | undefined; suffix?: string }) {
  if (prev === undefined || prev === null) return null
  const diff = current - prev
  if (diff === 0) return <span style={{ fontSize: 11, color: '#8a85a0', marginLeft: 6 }}>– 0{suffix}</span>
  const up = diff > 0
  return (
    <span style={{ fontSize: 11, color: up ? '#2e8b6a' : '#c0392b', marginLeft: 6, fontWeight: 600 }}>
      {up ? '▲' : '▼'} {Math.abs(diff)}{suffix}
    </span>
  )
}

export default function ClassInsights({ location, start, end }: { location: string; start: string; end: string }) {
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [classTypeFilter, setClassTypeFilter] = useState('')
  const [instructorFilter, setInstructorFilter] = useState('')
  const [weekdayFilter, setWeekdayFilter] = useState('')
  const [heatmapMetric, setHeatmapMetric] = useState<'occupancy' | 'sessions'>('occupancy')
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [compareStart, setCompareStart] = useState('')
  const [compareEnd, setCompareEnd] = useState('')

  useEffect(() => {
    if (!start || !end) return
    const s = new Date(start)
    const e = new Date(end)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return
    s.setFullYear(s.getFullYear() - 1)
    e.setFullYear(e.getFullYear() - 1)
    setCompareStart(s.toISOString().split('T')[0])
    setCompareEnd(e.toISOString().split('T')[0])
  }, [start, end])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ location, start, end })
    if (classTypeFilter) params.set('classType', classTypeFilter)
    if (instructorFilter) params.set('instructor', instructorFilter)
    if (weekdayFilter) params.set('weekday', weekdayFilter)
    if (compareEnabled && compareStart && compareEnd) {
      params.set('compareStart', compareStart)
      params.set('compareEnd', compareEnd)
    }
    fetch(`/api/class-insights?${params.toString()}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [location, start, end, classTypeFilter, instructorFilter, weekdayFilter, compareEnabled, compareStart, compareEnd])

  if (loading && !data) return (
    <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 40, textAlign: 'center', color: '#8a85a0' }}>
      Henter hold-data...
    </div>
  )
  if (!data) return null

  const cur = data.current
  const cmp = data.compare

  const allClassTypes = cur.class_types.map(c => c.class_type)
  const allInstructors = cur.instructors.map(i => i.instructor_name)

  const maxHeat = Math.max(
    ...cur.heatmap.cells.map(c => heatmapMetric === 'occupancy' ? c.avg_occupancy : c.sessions),
    1
  )

  function getCell(weekday: string, hour: string) {
    return cur.heatmap.cells.find(c => c.weekday === weekday && c.hour === hour)
  }

  const cmpClassTypeMap = new Map((cmp?.class_types || []).map(c => [c.class_type, c]))
  const cmpInstructorMap = new Map((cmp?.instructors || []).map(i => [i.instructor_name, i]))

  return (
    <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2e8b6a' }} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2e8b6a' }}>
            Hold-performance — {start} til {end}
          </div>
        </div>

        {/* Filtre */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={classTypeFilter} onChange={e => setClassTypeFilter(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e4e0f0', fontSize: 11, fontFamily: 'Inter, sans-serif', background: '#f8f7fc', color: '#1a1520' }}>
            <option value="">Alle holdtyper</option>
            {allClassTypes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={instructorFilter} onChange={e => setInstructorFilter(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e4e0f0', fontSize: 11, fontFamily: 'Inter, sans-serif', background: '#f8f7fc', color: '#1a1520' }}>
            <option value="">Alle instruktører</option>
            {allInstructors.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={weekdayFilter} onChange={e => setWeekdayFilter(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e4e0f0', fontSize: 11, fontFamily: 'Inter, sans-serif', background: '#f8f7fc', color: '#1a1520' }}>
            <option value="">Alle ugedage</option>
            {cur.heatmap.weekday_order.map(w => <option key={w} value={w}>{weekdayLabel[w] || w}</option>)}
          </select>
        </div>
      </div>

      {/* Sammenligning toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: '#f8f7fc', borderRadius: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#4a4560', cursor: 'pointer' }}>
          <input type="checkbox" checked={compareEnabled} onChange={e => setCompareEnabled(e.target.checked)} />
          Sammenlign med periode
        </label>
        {compareEnabled && (
          <>
            <input type="date" value={compareStart} onChange={e => setCompareStart(e.target.value)}
              style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #e4e0f0', borderRadius: 6, color: '#1a1520' }} />
            <span style={{ fontSize: 11, color: '#8a85a0' }}>–</span>
            <input type="date" value={compareEnd} onChange={e => setCompareEnd(e.target.value)}
              style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #e4e0f0', borderRadius: 6, color: '#1a1520' }} />
          </>
        )}
      </div>

      {/* Toplinje nøgletal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Hold afholdt', val: cur.sessions_total, prev: cmp?.sessions_total },
          { label: 'Deltagere', val: cur.participants_total, prev: cmp?.participants_total },
          { label: 'Avg. belægning', val: cur.avg_occupancy, prev: cmp?.avg_occupancy, suffix: '%' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#f8f7fc', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 6 }}>{k.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: '#1a1520' }}>{k.val}{k.suffix || ''}</span>
              <Delta current={k.val} prev={k.prev} suffix={k.suffix} />
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700 }}>Belægning pr. ugedag og tidspunkt</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setHeatmapMetric('occupancy')}
              style={{ fontSize: 10, padding: '4px 10px', borderRadius: 14, border: '1px solid ' + (heatmapMetric === 'occupancy' ? '#6b5ca5' : '#e4e0f0'), background: heatmapMetric === 'occupancy' ? '#f2f0f9' : '#fff', color: heatmapMetric === 'occupancy' ? '#6b5ca5' : '#8a85a0', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Belægning %
            </button>
            <button onClick={() => setHeatmapMetric('sessions')}
              style={{ fontSize: 10, padding: '4px 10px', borderRadius: 14, border: '1px solid ' + (heatmapMetric === 'sessions' ? '#6b5ca5' : '#e4e0f0'), background: heatmapMetric === 'sessions' ? '#f2f0f9' : '#fff', color: heatmapMetric === 'sessions' ? '#6b5ca5' : '#8a85a0', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Antal hold
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 50 }}></th>
                {cur.heatmap.hours.map(h => (
                  <th key={h} style={{ fontSize: 9, color: '#8a85a0', fontWeight: 600, padding: '2px 4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cur.heatmap.weekday_order.map(wd => (
                <tr key={wd}>
                  <td style={{ fontSize: 10, color: '#8a85a0', fontWeight: 600, paddingRight: 8, textAlign: 'right' }}>{weekdayLabel[wd] || wd}</td>
                  {cur.heatmap.hours.map(hr => {
                    const cell = getCell(wd, hr)
                    const val = cell ? (heatmapMetric === 'occupancy' ? cell.avg_occupancy : cell.sessions) : 0
                    const intensity = val / maxHeat
                    return (
                      <td key={hr} title={cell ? `${cell.sessions} hold, ${cell.avg_occupancy}% belægning` : 'Ingen hold'}
                        style={{
                          width: 28, height: 28, textAlign: 'center', fontSize: 9, fontWeight: 600,
                          background: cell ? `rgba(107,92,165,${0.1 + intensity * 0.75})` : '#f8f7fc',
                          color: intensity > 0.5 ? '#fff' : '#4a4560',
                          border: '1px solid #fff',
                        }}>
                        {cell ? val : ''}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Holdtyper + Instruktører side om side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 10 }}>Holdtyper — efter belægning</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f7fc' }}>
                {['Hold', 'Antal', 'Avg del.', 'Belægning'].map(h => (
                  <th key={h} style={{ fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '8px 10px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cur.class_types.map((c, i) => {
                const prev = cmpClassTypeMap.get(c.class_type)
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f0eef8' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>{c.class_type}</td>
                    <td style={{ padding: '8px 10px' }}>{c.sessions}</td>
                    <td style={{ padding: '8px 10px' }}>{c.avg_participants}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                      {c.avg_occupancy}%
                      <Delta current={c.avg_occupancy} prev={prev?.avg_occupancy} suffix="%" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 10 }}>Instruktører — efter belægning</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f7fc' }}>
                {['Instruktør', 'Antal', 'Avg del.', 'Belægning'].map(h => (
                  <th key={h} style={{ fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, padding: '8px 10px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cur.instructors.map((ins, i) => {
                const prev = cmpInstructorMap.get(ins.instructor_name)
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f0eef8' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>{ins.instructor_name}</td>
                    <td style={{ padding: '8px 10px' }}>{ins.sessions}</td>
                    <td style={{ padding: '8px 10px' }}>{ins.avg_participants}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                      {ins.avg_occupancy}%
                      <Delta current={ins.avg_occupancy} prev={prev?.avg_occupancy} suffix="%" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
