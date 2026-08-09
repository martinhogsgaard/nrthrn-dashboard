import { NextResponse } from 'next/server'
import { supabase, MT_BASE, mtFetch, sleep } from '@/lib/mt-sync-lib'

export const maxDuration = 300

async function syncSessions(locationId: string, sessionStart: string, sessionEnd: string) {
  let allSessions: any[] = []
  let page = 1

  while (true) {
    const data = await mtFetch(
      `${MT_BASE}/class_sessions?min_date=${sessionStart}&max_date=${sessionEnd}&location=${locationId}&per_page=100&page=${page}`
    )
    if (!data.data?.length) break
    allSessions = [...allSessions, ...data.data]
    if (data.meta?.pagination?.pages <= page) break
    page++
    await sleep(150)
  }

  const timeZone = locationId === '48718' ? 'Europe/Copenhagen' : 'America/New_York'

  const sessionsToUpsert = allSessions.map((s: any) => {
    const startDT = new Date(s.attributes.start_datetime)
    const time = startDT.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone })
    return {
      id: s.id,
      date: s.attributes.start_date,
      time,
      class_type: s.attributes.class_type_display,
      instructor_name: s.attributes.instructor_names?.[0] || '',
      instructor_profile_id: s.relationships?.employee_public_profiles?.data?.[0]?.id || null,
      capacity: s.attributes.capacity || 0,
      participants: s.attributes.standard_reservation_user_count || 0,
      is_cancelled: s.attributes.cancellation_datetime !== null,
      cancellation_datetime: s.attributes.cancellation_datetime || null,
      location_id: s.relationships?.location?.data?.id || locationId,
      updated_at: new Date().toISOString(),
    }
  })

  if (sessionsToUpsert.length > 0) {
    const { error } = await supabase.from('sessions_cache').upsert(sessionsToUpsert, { onConflict: 'id' })
    if (error) throw new Error(error.message)
  }

  return sessionsToUpsert.length
}

async function syncClassSessionTypes() {
  let allTypes: any[] = []
  let page = 1

  while (true) {
    const data = await mtFetch(`${MT_BASE}/class_session_types?page=${page}`)
    if (!data.data?.length) break
    allTypes = [...allTypes, ...data.data]
    if (data.meta?.pagination?.pages <= page) break
    page++
    await sleep(150)
  }

  const typesToUpsert = allTypes.map((t: any) => ({
    id: t.id,
    name: t.attributes.name,
    duration: t.attributes.duration,
    is_real_class: t.attributes.description !== null,
    enabled: t.attributes.enabled,
    updated_at: new Date().toISOString(),
  }))

  if (typesToUpsert.length > 0) {
    const { error } = await supabase.from('class_session_types').upsert(typesToUpsert, { onConflict: 'id' })
    if (error) throw new Error(error.message)
  }

  return typesToUpsert.length
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const now = new Date()
  const sessionStart = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const sessionEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const results: any = {}

  try {
    const cphCount = await syncSessions('48718', sessionStart, sessionEnd)
    const nycCount = await syncSessions('48717', sessionStart, sessionEnd)
    results.sessions = `${cphCount + nycCount} sessions synkroniseret (CPH: ${cphCount}, NYC: ${nycCount})`
  } catch (e: any) {
    results.sessions = `Fejl: ${e.message}`
  }

  try {
    const count = await syncClassSessionTypes()
    results.class_session_types = `${count} class session types synkroniseret`
  } catch (e: any) {
    results.class_session_types = `Fejl: ${e.message}`
  }

  return NextResponse.json({ success: true, ...results })
}