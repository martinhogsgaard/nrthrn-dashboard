import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const ARKETA_BASE = 'https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0'

async function arketaFetch(path: string) {
  const res = await fetch(`${ARKETA_BASE}/${process.env.ARKETA_PARTNER_ID}${path}`, {
    headers: { 'Authorization': `Bearer ${process.env.ARKETA_API_KEY}` }
  })
  return res.json()
}

async function fetchAllPages(path: string) {
  let items: any[] = []
  let cursor = ''
  
  while (true) {
    const url = `${path}${path.includes('?') ? '&' : '?'}limit=100${cursor ? `&startAfter=${cursor}` : ''}`
    const data = await arketaFetch(url)
    items = [...items, ...(data.items || [])]
    if (!data.pagination?.hasMore) break
    cursor = data.pagination.nextStartAfterId
  }
  
  return items
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'all'
  const results: any = {}

  // Sync sessions
  if (type === 'all' || type === 'sessions') {
    const sessions = await fetchAllPages(
      const start = searchParams.get('start') || '2025-10-01'
const end = searchParams.get('end') || '2025-10-31'
const sessions = await fetchAllPages(
  `/classes?startDate=${start}&endDate=${end}`
)

    const toUpsert = sessions.map((s: any) => ({
      id: s.id,
      name: s.name,
      date: s.start_time ? s.start_time.split('T')[0] : null,
      start_time: s.start_time,
      duration: s.duration,
      location_id: s.location_id,
      instructor_name: s.instructor_name,
      max_capacity: s.max_capacity,
      total_booked: s.total_booked,
      canceled: s.canceled || false,
      updated_at: new Date().toISOString(),
    }))

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from('arketa_sessions')
        .upsert(toUpsert, { onConflict: 'id' })
      results.sessions = error ? `Fejl: ${error.message}` : `${toUpsert.length} sessions gemt`
    }
  }

  // Sync clients
  if (type === 'all' || type === 'clients') {
    const clients = await fetchAllPages('/clients')

    const toUpsert = clients.map((c: any) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone,
      date_of_birth: c.date_of_birth ? new Date(c.date_of_birth).toISOString().split('T')[0] : null,
      gender: c.gender,
      removed: c.removed || false,
      created_at: c.created_at,
      updated_at: new Date().toISOString(),
    }))

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from('arketa_clients')
        .upsert(toUpsert, { onConflict: 'id' })
      results.clients = error ? `Fejl: ${error.message}` : `${toUpsert.length} klienter gemt`
    }
  }

  // Sync purchases
  if (type === 'all' || type === 'purchases') {
    const purchases = await fetchAllPages('/purchases')

    const toUpsert = purchases.map((p: any) => ({
      id: p.id,
      client_id: p.client_id,
      offering_id: p.offering_id,
      name: p.name,
      type: p.type,
      status: p.status,
      price: p.price,
      start_date: p.start_date,
      end_date: p.end_date,
      remaining_uses: p.remaining_uses,
      updated_at: new Date().toISOString(),
    }))

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from('arketa_purchases')
        .upsert(toUpsert, { onConflict: 'id' })
      results.purchases = error ? `Fejl: ${error.message}` : `${toUpsert.length} køb gemt`
    }
  }

  return NextResponse.json({ success: true, ...results })
}