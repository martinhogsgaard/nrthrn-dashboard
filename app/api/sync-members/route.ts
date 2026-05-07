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

function calcIsOver30(birthDate: string | null): boolean | null {
  if (!birthDate) return null
  const dob = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age >= 30
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id påkrævet' }, { status: 400 })
  }

  // Hent session
  const sessRes = await fetch(
    `https://nrthrnstrong.marianatek.com/api/class_sessions/${sessionId}`,
    { headers: MT_HEADERS }
  )
  const sessData = await sessRes.json()
  const reservationIds = sessData.data?.relationships?.reservations?.data?.map((r: any) => r.id) || []

  const processedUsers = new Set<string>()
  let synced = 0
  let skipped = 0
  let no_birthdate = 0

  // Hent alle reservationer parallelt
  const reservationPromises = reservationIds.map((resId: string) =>
    fetch(`https://nrthrnstrong.marianatek.com/api/reservations/${resId}`, { headers: MT_HEADERS })
      .then(r => r.json())
      .catch(() => null)
  )
  const reservations = await Promise.all(reservationPromises)

  // Saml unikke user IDs
  const userIds = [...new Set(
    reservations
      .filter(Boolean)
      .map((r: any) => r.data?.relationships?.user?.data?.id)
      .filter(Boolean)
  )] as string[]

  // Tjek hvilke vi allerede har
  const { data: existing } = await supabase
    .from('members')
    .select('mariana_tek_user_id, birth_date')
    .in('mariana_tek_user_id', userIds)

  const existingWithDOB = new Set(
    existing?.filter(e => e.birth_date).map(e => e.mariana_tek_user_id) || []
  )

  // Hent kun dem vi ikke kender
  const newUserIds = userIds.filter(id => !existingWithDOB.has(id))

  const userPromises = newUserIds.map((userId: string) =>
    fetch(`https://nrthrnstrong.marianatek.com/api/users/${userId}`, { headers: MT_HEADERS })
      .then(r => r.json())
      .then(data => ({ userId, data }))
      .catch(() => null)
  )
  const users = await Promise.all(userPromises)

  // Gem i Supabase
  const toUpsert = users
    .filter(Boolean)
    .map((u: any) => {
      const attrs = u.data?.data?.attributes
      if (!attrs?.birth_date) no_birthdate++
      return {
        mariana_tek_user_id: u.userId,
        first_name: attrs?.first_name,
        last_name: attrs?.last_name,
        email: attrs?.email,
        birth_date: attrs?.birth_date || null,
        is_over_30: calcIsOver30(attrs?.birth_date),
        home_location_id: u.data?.data?.relationships?.home_location?.data?.id || null,
        is_active: true,
        joined_date: attrs?.date_joined ? attrs.date_joined.split('T')[0] : null,
      }
    })

  if (toUpsert.length > 0) {
    await supabase.from('members').upsert(toUpsert, { onConflict: 'mariana_tek_user_id' })
    synced = toUpsert.length
  }

  skipped = userIds.length - newUserIds.length

  return NextResponse.json({
    session_id: sessionId,
    reservations: reservationIds.length,
    synced,
    skipped,
    no_birthdate,
  })
}