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
  const type = searchParams.get('type') || 'mt' // 'mt' eller 'bruce'

  let newCount = 0
  let converted = 0

  if (type === 'mt') {
    // Hent MT first timers via tag — alle sider
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const res = await fetch(
        `https://nrthrnstrong.marianatek.com/api/reservations?tag=first-timer&min_datetime=${start}&max_datetime=${end}&per_page=100&page=${page}&include=tags`,
        { headers: MT_HEADERS }
      )
      const data = await res.json()
      totalPages = data.meta?.pagination?.pages || 1

      for (const r of data.data || []) {
        const userId = r.relationships?.user?.data?.id
        const sessionId = r.relationships?.class_session?.data?.id
        if (!userId || userId === '53027') continue

        // Tjek duplikat
        const { data: existing } = await supabase
          .from('first_timers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        if (existing) continue

        const visitDate = r.attributes.creation_date?.split('T')[0] || start

        await supabase.from('first_timers').insert({
          source: 'mariana_tek',
          user_id: userId,
          first_visit_date: visitDate,
          session_id: sessionId,
          location_id: '48718',
        })
        newCount++
      }

      if (page >= totalPages) break
      page++
    }
  }

  if (type === 'conversions') {
    // Tjek konverteringer for MT first timers
    const { data: unconverted } = await supabase
      .from('first_timers')
      .select('*')
      .eq('converted', false)
      .eq('source', 'mariana_tek')
      .not('user_id', 'is', null)
      .limit(50)

    for (const ft of unconverted || []) {
      const res = await fetch(
        `https://nrthrnstrong.marianatek.com/api/orders?user=${ft.user_id}&per_page=20`,
        { headers: MT_HEADERS }
      )
      const data = await res.json()

      const membershipOrder = data.data?.find((o: any) => {
        const name = o.attributes.summary?.[0] || ''
        return o.attributes.status === 'Completed' &&
          (name.includes('Monthly') || name.includes('Classes') || name.includes('Revival') || name.includes('Warrior') || name.includes('Unlimited')) &&
          !name.toLowerCase().includes('first timer')
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
  }

  return NextResponse.json({
    success: true,
    type,
    new_first_timers: newCount,
    newly_converted: converted,
  })
}
