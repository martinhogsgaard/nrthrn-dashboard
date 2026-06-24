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

function StatWithCompare({ label, val, prev, suffix = '' }: { label: string; val: number; prev: number | undefined; suffix?: string }) {
  return (
    <div style={{ background: '#f8f7fc', borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: '#1a1520' }}>{val}{suffix}</span>
        {prev !== undefined && prev !== null && (
          <span style={{ fontSize: 12, color: '#8a85a0' }}>
            vs <span style={{ fontWeight: 600, color: val >= prev ? '#2e8b6a' : '#c0392b' }}>{prev}{suffix}</span>
          </span>
        )}
      </div>
    </div>
  )
}

// Horisontal bjælke-liste (holdtyper / instruktører)
function BarList({ title, rows, compareMap, nameKey, onSelect, selected }: {
  title: string
  rows: { name: string; sessions: number; avg_participants: number; avg_occupancy: number }[]
  compareMap: Map<string, { avg_occupancy: number }>
  nameKey: string
  onSelect: (name: string) => void
  selected: string
}) {
  const maxOcc = Math.max(...rows.map(r => r.avg_occupancy), 1)
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => {
          const prev = compareMap.get(r.name)
          const isSelected = selected === r.name
          return (
            <div key={i} onClick={() => onSelect(isSelected ? '' : r.name)}
              style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: 6, background: isSelected ? '#f2f0f9' : 'transparent' }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa' }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: '#1a1520' }}>{r.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1520' }}>
                  {r.avg_occupancy}%
                  {prev !== undefined && (
                    <span style={{ fontSize: 10, color: r.avg_occupancy >= prev.avg_occupancy ? '#2e8b6a' : '#c0392b', marginLeft: 4 }}>
                      ({prev.avg_occupancy}%)
                    </span>
                  )}
                </span>
              </div>
              <div style={{ height: 8, background: '#f0eef8', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(r.avg_occupancy / maxOcc) * 100}%`, background: isSelected ? '#6b5ca5' : '#a89bd0', borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 2 }}>{r.sessions} hold · {r.avg_participants} avg. deltagere</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Lodret søjle-graf (ugedag / tidspunkt)
function BarChart({ title, data, labelMap, onSelect, selected }: {
  title: string
  data: { key: string; sessions: number; avg_occupancy: number }[]
  labelMap?: Record<string, string>
  onSelect: (key: string) => void
  selected: string
}) {
  const maxOcc = Math.max(...data.map(d => d.avg_occupancy), 1)
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 700, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
        {data.map((d, i) => {
          const isSelected = selected === d.key
          const hasData = d.sessions > 0
          return (
            <div key={i} onClick={() => hasData && onSelect(isSelected ? '' : d.key)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: hasData ? 'pointer' : 'default' }}>
              <div style={{ fontSize: 9, color: '#8a85a0', fontWeight: 600 }}>{hasData ? `${d.avg_occupancy}%` : ''}</div>
              <div style={{
                width: '100%',
                height: hasData ? Math.max((d.avg_occupancy / maxOcc) * 70, 3) : 2,
                background: !hasData ? '#f0eef8' : isSelected ? '#6b5ca5' : '#a89bd0',
                borderRadius: '3px 3px 0 0',
              }} />
              <div style={{ fontSize: 10, color: isSelected ? '#6b5ca5' : '#8a85a0', fontWeight: isSelected ? 700 : 500 }}>
                {labelMap?.[d.key] || d.key}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ClassInsights({ location, start, end }: { location: string; start: string; end: string }) {
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [classTypeFilter, setClassTypeFilter] = useState('')
  const [instructorFilter, setInstructorFilter] = useState('')
  const [weekdayFilter, setWeekdayFilter] = useState('')
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [compareStart, setCompareStart] = useState('')
  const [compareEnd, setCompareEnd] = useState('')
  const [appliedCompareStart, setAppliedCompareStart] = useState('')
  const [appliedCompareEnd, setAppliedCompareEnd] = useState('')

  useEffect(() => {
    if (!start || !end) return
    const s = new Date(start)
    const e = new Date(end)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return
    s.setFullYear(s.getFullYear() - 1)
    e.setFullYear(e.getFullYear() - 1)
    const cs = s.toISOString().split('T')[0]
    const ce = e.toISOString().split('T')[0]
    setCompareStart(cs)
    setCompareEnd(ce)
    setAppliedCompareStart(cs)
    setAppliedCompareEnd(ce)
  }, [start, end])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ location, start, end })
    if (classTypeFilter) params.set('classType', classTypeFilter)
    if (instructorFilter) params.set('instructor', instructorFilter)
    if (weekdayFilter) params.set('weekday', weekdayFilter)
    if (compareEnabled && appliedCompareStart && appliedCompareEnd) {
      params.set('compareStart', appliedCompareStart)
      params.set('compareEnd', appliedCompareEnd)
    }
    fetch(`/api/class-insights?${params.toString()}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [location, start, end, classTypeFilter, instructorFilter, weekdayFilter, compareEnabled, appliedCompareStart, appliedCompareEnd])

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

  const cmpClassTypeMap = new Map((cmp?.class_types || []).map(c => [c.class_type, { avg_occupancy: c.avg_occupancy }]))
  const cmpInstructorMap = new Map((cmp?.instructors || []).map(i => [i.instructor_name, { avg_occupancy: i.avg_occupancy }]))

  // Aggreger heatmap-celler til ugedag-niveau
  const weekdayAgg: Record<string, { sessions: number; participants: number; capacitySum: number }> = {}
  for (const wd of cur.heatmap.weekday_order) weekdayAgg[wd] = { sessions: 0, participants: 0, capacitySum: 0 }
  for (const cell of cur.heatmap.cells) {
    weekdayAgg[cell.weekday].sessions += cell.sessions
    // Vi har ikke participants/capacity direkte her, så vi bruger den allerede beregnede avg_occupancy vægtet med sessions
    weekdayAgg[cell.weekday].participants += cell.avg_occupancy * cell.sessions
    weekdayAgg[cell.weekday].capacitySum += cell.sessions
  }
  const weekdayData = cur.heatmap.weekday_order.map(wd => ({
    key: wd,
    sessions: weekdayAgg[wd].sessions,
    avg_occupancy: weekdayAgg[wd].capacitySum > 0 ? Math.round(weekdayAgg[wd].participants / weekdayAgg[wd].capacitySum) : 0,
  }))

  // Aggreger heatmap-celler til time-niveau
  const hourAgg: Record<string, { sessions: number; participants: number; capacitySum: number }> = {}
  for (const hr of cur.heatmap.hours) hourAgg[hr] = { sessions: 0, participants: 0, capacitySum: 0 }
  for (const cell of cur.heatmap.cells) {
    if (!hourAgg[cell.hour]) hourAgg[cell.hour] = { sessions: 0, participants: 0, capacitySum: 0 }
    hourAgg[cell.hour].sessions += cell.sessions
    hourAgg[cell.hour].participants += cell.avg_occupancy * cell.sessions
    hourAgg[cell.hour].capacitySum += cell.sessions
  }
  const hourData = cur.heatmap.hours.map(hr => ({
    key: hr,
    sessions: hourAgg[hr].sessions,
    avg_occupancy: hourAgg[hr].capacitySum > 0 ? Math.round(hourAgg[hr].participants / hourAgg[hr].capacitySum) : 0,
  }))

  function applyCompare() {
    setAppliedCompareStart(compareStart)
    setAppliedCompareEnd(compareEnd)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 24, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2e8b6a' }} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2e8b6a' }}>
            Hold-performance — {start} til {end}
          </div>
        </div>

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
          {(classTypeFilter || instructorFilter || weekdayFilter) && (
            <button onClick={() => { setClassTypeFilter(''); setInstructorFilter(''); setWeekdayFilter('') }}
              style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e4e0f0', fontSize: 11, fontFamily: 'Inter, sans-serif', background: '#fff', color: '#c0392b', cursor: 'pointer' }}>
              Nulstil filtre
            </button>
          )}
        </div>
      </div>

      {/* Aktive filtre vist tydeligt */}
      {(classTypeFilter || instructorFilter || weekdayFilter) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {classTypeFilter && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: '#f2f0f9', color: '#6b5ca5', fontWeight: 600 }}>Hold: {classTypeFilter}</span>}
          {instructorFilter && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: '#f2f0f9', color: '#6b5ca5', fontWeight: 600 }}>Instruktør: {instructorFilter}</span>}
          {weekdayFilter && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: '#f2f0f9', color: '#6b5ca5', fontWeight: 600 }}>Dag: {weekdayLabel[weekdayFilter] || weekdayFilter}</span>}
        </div>
      )}

      {/* Sammenligning */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: '#f8f7fc', borderRadius: 8, flexWrap: 'wrap' }}>
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
            <button onClick={applyCompare}
              style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, border: 'none', background: '#6b5ca5', color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Opdater
            </button>
          </>
        )}
      </div>

      {/* Toplinje nøgletal med begge tal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        <StatWithCompare label="Hold afholdt" val={cur.sessions_total} prev={cmp?.sessions_total} />
        <StatWithCompare label="Deltagere" val={cur.participants_total} prev={cmp?.participants_total} />
        <StatWithCompare label="Avg. belægning" val={cur.avg_occupancy} prev={cmp?.avg_occupancy} suffix="%" />
      </div>

      {/* Ugedag og tidspunkt grafer side om side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid #f0eef8' }}>
        <BarChart title="Belægning pr. ugedag" data={weekdayData} labelMap={weekdayLabel} onSelect={setWeekdayFilter} selected={weekdayFilter} />
        <BarChart title="Belægning pr. tidspunkt" data={hourData} onSelect={() => {}} selected="" />
      </div>

      {/* Holdtyper + Instruktører som bjælker */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <BarList
          title="Holdtyper — efter belægning"
          rows={cur.class_types.map(c => ({ name: c.class_type, sessions: c.sessions, avg_participants: c.avg_participants, avg_occupancy: c.avg_occupancy }))}
          compareMap={cmpClassTypeMap}
          nameKey="class_type"
          onSelect={setClassTypeFilter}
          selected={classTypeFilter}
        />
        <BarList
          title="Instruktører — efter belægning"
          rows={cur.instructors.map(i => ({ name: i.instructor_name, sessions: i.sessions, avg_participants: i.avg_participants, avg_occupancy: i.avg_occupancy }))}
          compareMap={cmpInstructorMap}
          nameKey="instructor_name"
          onSelect={setInstructorFilter}
          selected={instructorFilter}
        />
      </div>

      <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 16, fontStyle: 'italic' }}>
        Klik på en holdtype, instruktør eller ugedag for at filtrere hele oversigten.
      </div>
    </div>
  )
}
