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
  const now = new Date()
  const start = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = searchParams.get('end') || now.toISOString().split('T')[0]

  let newMT = 0
  let newBruce = 0
  let converted = 0

  // 1. Hent MT first timers via "First Time At This Location" tag
  let page = 1
  while (true) {
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/reservations?tag=first-timer&min_datetime=${start}&per_page=100&page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    if (!data.data?.length) break

    for (const r of data.data) {
      const userId = r.relationships?.user?.data?.id
      const sessionId = r.relationships?.class_session?.data?.id
      if (!userId || userId === '53027') continue // Skip Bruce

      // Tjek om vi allerede kender denne first timer
      const { data: existing } = await supabase
        .from('first_timers')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (existing) continue

      // Hent session info
      let classType = null
      let visitDate = r.attributes.creation_date?.split('T')[0]
      if (sessionId) {
        const sr = await fetch(`https://nrthrnstrong.marianatek.com/api/class_sessions/${sessionId}`, { headers: MT_HEADERS })
        const sd = await sr.json()
        classType = sd.data?.attributes?.class_type_display
        visitDate = sd.data?.attributes?.start_date || visitDate
      }

      await supabase.from('first_timers').insert({
        source: 'mariana_tek',
        user_id: userId,
        first_visit_date: visitDate,
        session_id: sessionId,
        class_type: classType,
        location_id: '48718',
      })
      newMT++
    }

    if (data.meta?.pagination?.pages <= page) break
    page++
  }

  // 2. Hent Bruce first timers via @brucepass.com emails
  // Hent sessions i perioden
  let allSessions: any[] = []
  page = 1
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

  for (const session of allSessions) {
    const reservationIds = session.relationships?.reservations?.data?.map((r: any) => r.id) || []
    
    for (const resId of reservationIds) {
      const res = await fetch(`https://nrthrnstrong.marianatek.com/api/reservations/${resId}`, { headers: MT_HEADERS })
      const data = await res.json()
      const r = data.data

      // Kun Bruce reservationer
      if (r?.relationships?.broker?.data?.id !== '53027') continue
      
      const guestEmail = r.attributes.guest_email
      const guestName = r.attributes.guest_name
      if (!guestEmail?.includes('@brucepass.com')) continue

      // Tjek om vi allerede kender denne Bruce first timer
      const { data: existing } = await supabase
        .from('first_timers')
        .select('id')
        .eq('guest_email', guestEmail)
        .single()

      if (existing) continue

      await supabase.from('first_timers').insert({
        source: 'bruce',
        guest_email: guestEmail,
        guest_name: guestName,
        first_visit_date: session.attributes.start_date,
        session_id: session.id,
        class_type: session.attributes.class_type_display,
        location_id: '48718',
      })
      newBruce++
    }
  }

  // 3. Tjek konverteringer — first timers der har købt abonnement
  const { data: unconverted } = await supabase
    .from('first_timers')
    .select('*')
    .eq('converted', false)
    .eq('source', 'mariana_tek')
    .not('user_id', 'is', null)

  for (const ft of unconverted || []) {
    // Hent orders for denne bruger
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/orders?user=${ft.user_id}&per_page=10`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    
    const membershipOrder = data.data?.find((o: any) => {
      const name = o.attributes.summary?.[0] || ''
      return o.attributes.status === 'Completed' &&
        (name.includes('Monthly') || name.includes('Classes') || name.includes('Revival') || name.includes('Warrior') || name.includes('Unlimited')) &&
        !name.includes('First timer')
    })

    if (membershipOrder) {
      await supabase.from('first_timers').update({
        converted: true,
        converted_date: membershipOrder.attributes.date_placed?.split('T')[0],
        converted_product: membershipOrder.attributes.summary?.[0],
      }).eq('id', ft.id)
      converted++
    }
  }

  return NextResponse.json({
    success: true,
    new_mt_first_timers: newMT,
    new_bruce_first_timers: newBruce,
    newly_converted: converted,
  })
}
