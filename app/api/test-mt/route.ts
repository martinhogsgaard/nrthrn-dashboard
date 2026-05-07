import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  
  const sessRes = await fetch(
    `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=${today}&max_date=${today}&location=48718&per_page=10`,
    { headers: MT_HEADERS }
  )
  const sessData = await sessRes.json()
  
  const sessionWithRes = sessData.data?.find((s: any) => 
    s.relationships?.reservations?.data?.length > 0
  )
  
  if (!sessionWithRes) {
    return NextResponse.json({ error: 'Ingen sessions med reservationer i dag' })
  }
  
  const reservationIds = sessionWithRes.relationships.reservations.data.map((r: any) => r.id)
  const firstResId = reservationIds[0]
  
  const resRes = await fetch(
    `https://nrthrnstrong.marianatek.com/api/reservations/${firstResId}`,
    { headers: MT_HEADERS }
  )
  const resData = await resRes.json()
  const userId = resData.data?.relationships?.user?.data?.id

  const userRes = await fetch(
    `https://nrthrnstrong.marianatek.com/api/users/${userId}`,
    { headers: MT_HEADERS }
  )
  const userData = await userRes.json()

  return NextResponse.json({
    session: sessionWithRes.attributes.class_type_display,
    session_id: sessionWithRes.id,
    total_reservations: reservationIds.length,
    first_user_id: userId,
    birth_date: userData.data?.attributes?.birth_date,
    full_name: userData.data?.attributes?.full_name,
  })
}