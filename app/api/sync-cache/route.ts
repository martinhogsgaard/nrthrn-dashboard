import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'all'
  const start = searchParams.get('start') || new Date().toISOString().split('T')[0]
  const end = searchParams.get('end') || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]

  const results: any = {}

  // Sync sessions
  if (type === 'all' || type === 'sessions') {
    let allSessions: any[] = []
    let page = 1

    while (true) {
      const res = await fetch(
        `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=${start}&max_date=${end}&location=48718&per_page=100&page=${page}`,
        { headers: MT_HEADERS }
      )
      const data = await res.json()
      if (!data.data?.length) break
      allSessions = [...allSessions, ...data.data]
      if (data.meta?.pagination?.pages <= page) break
      page++
    }

    const sessionsToUpsert = allSessions.map((s: any) => {
      const startDT = new Date(s.attributes.start_datetime)
      const time = startDT.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' })
      return {
        id: s.id,
        date: s.attributes.start_date,
        time,
        class_type: s.attributes.class_type_display,
        instructor_name: s.attributes.instructor_names?.[0] || '',
        instructor_profile_id: s.relationships?.employee_public_profiles?.data?.[0]?.id || null,
        capacity: s.attributes.capacity || 0,
        participants: s.attributes.standard_reservation_user_count || 0,
        location_id: s.relationships?.location?.data?.id || '48718',
        updated_at: new Date().toISOString(),
      }
    })

    if (sessionsToUpsert.length > 0) {
      const { error } = await supabase
        .from('sessions_cache')
        .upsert(sessionsToUpsert, { onConflict: 'id' })
      results.sessions = error ? `Fejl: ${error.message}` : `${sessionsToUpsert.length} sessions synkroniseret`
    } else {
      results.sessions = '0 sessions fundet'
    }
  }

  // Sync memberships
  if (type === 'all' || type === 'memberships') {
    let allInstances: any[] = []
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const res = await fetch(
        `https://nrthrnstrong.marianatek.com/api/membership_instances?status=active&purchase_location=48718&per_page=100&page=${page}`,
        { headers: MT_HEADERS }
      )
      const data = await res.json()
      totalPages = data.meta?.pagination?.pages || 1
      allInstances = [...allInstances, ...(data.data || [])]
      if (page >= totalPages) break
      page++
    }

    const membershipsToUpsert = allInstances.map((t: any) => ({
      id: t.id,
      membership_name: t.attributes.membership_name,
      renewal_rate: parseFloat(t.attributes.renewal_rate) || 0,
      age_group: t.attributes.membership_name?.includes('30+') ? 'over30' : t.attributes.membership_name?.includes('under 30') ? 'under30' : 'other',
      purchase_location_id: t.relationships?.purchase_location?.data?.id || '48718',
      next_charge_date: t.attributes.next_charge_date,
      status: t.attributes.status || 'active',
      updated_at: new Date().toISOString(),
    }))

    if (membershipsToUpsert.length > 0) {
      const { error } = await supabase
        .from('membership_cache')
        .upsert(membershipsToUpsert, { onConflict: 'id' })
      results.memberships = error ? `Fejl: ${error.message}` : `${membershipsToUpsert.length} abonnementer synkroniseret`
    }
  }

  return NextResponse.json({ success: true, ...results })
}