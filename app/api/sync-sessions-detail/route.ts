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

const MT_BASE = 'https://nrthrnstrong.marianatek.com/api'
const CANCEL_STATUSES = ['standard cancel', 'penalty cancel', 'admin cancel', 'late cancel']

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // Default: kun i går — aldrig halvt afholdte dage
  const date = searchParams.get('date') || getYesterday()

  const results: any = { date }

  try {
    // Hent alle members med is_over_30 i ét kald
    const { data: allMembers } = await supabase
      .from('members')
      .select('mariana_tek_user_id, is_over_30')
      .not('is_over_30', 'is', null)

    const over30Set = new Set(allMembers?.filter(m => m.is_over_30 === true).map(m => m.mariana_tek_user_id) || [])
    const under30Set = new Set(allMembers?.filter(m => m.is_over_30 === false).map(m => m.mariana_tek_user_id) || [])

    // Hent sessions for datoen
    const res = await fetch(
      `${MT_BASE}/class_sessions?location=48718&min_date=${date}&max_date=${date}&per_page=100`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    const sessions = data.data || []

    results.sessions_found = sessions.length

    const toUpdate = []
    const newMembers = []

    for (const s of sessions) {
      // Hent alle reservationer for sessionen
      let sessionReservations: any[] = []
      let resPage = 1
      while (true) {
        const rRes = await fetch(
          `${MT_BASE}/reservations?class_session=${s.id}&per_page=100&page=${resPage}`,
          { headers: MT_HEADERS }
        )
        const rData = await rRes.json()
        if (!rData.data?.length) break
        sessionReservations = [...sessionReservations, ...rData.data]
        if (rData.meta?.pagination?.pages <= resPage) break
        resPage++
      }

      let over30 = 0, under30 = 0, unknown = 0, bruceCount = 0

      for (const r of sessionReservations) {
        const status = r.attributes?.status
        if (CANCEL_STATUSES.includes(status)) continue

        // Bruce spots
        if (r.relationships?.broker?.data?.id === '53027') {
          bruceCount++
          continue
        }

        // Kun checked in for over/under 30
        if (status !== 'check in') continue

        const userId = r.relationships?.user?.data?.id
        if (!userId) continue

        if (over30Set.has(userId)) over30++
        else if (under30Set.has(userId)) under30++
        else {
          unknown++
          // Gem til members-sync
          newMembers.push(userId)
        }
      }

      // Fordel ukendte proportionalt
      if (unknown > 0 && (over30 + under30) > 0) {
        const ratio = over30 / (over30 + under30)
        over30 += Math.round(unknown * ratio)
        under30 += unknown - Math.round(unknown * ratio)
      } else if (unknown > 0) {
        over30 += Math.round(unknown * 0.5)
        under30 += unknown - Math.round(unknown * 0.5)
      }

      toUpdate.push({ id: s.id, participants_over_30: over30, participants_under_30: under30, bruce_spots: bruceCount })
    }

    // Opdater sessions_cache
    let updated = 0
    for (const row of toUpdate) {
      const { error } = await supabase
        .from('sessions_cache')
        .update({ participants_over_30: row.participants_over_30, participants_under_30: row.participants_under_30, bruce_spots: row.bruce_spots })
        .eq('id', row.id)
      if (!error) updated++
    }
    results.sessions_updated = updated

    // Sync fødselsdatoer for nye members
    const uniqueNewMembers = [...new Set(newMembers)]
    let membersSynced = 0
    for (const userId of uniqueNewMembers) {
      try {
        const { data: existing } = await supabase.from('members').select('id, birth_date').eq('mariana_tek_user_id', userId).single()
        if (existing?.birth_date) continue

        const userRes = await fetch(`${MT_BASE}/users/${userId}`, { headers: MT_HEADERS })
        const userData = await userRes.json()
        const u = userData.data?.attributes
        const dob = u?.birth_date || null
        const isOver30 = dob ? (() => {
          const d = new Date(dob), t = new Date()
          let age = t.getFullYear() - d.getFullYear()
          const m = t.getMonth() - d.getMonth()
          if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--
          return age >= 30
        })() : null

        await supabase.from('members').upsert({
          mariana_tek_user_id: userId,
          first_name: u?.first_name, last_name: u?.last_name, email: u?.email,
          birth_date: dob, is_over_30: isOver30,
          home_location_id: userData.data?.relationships?.home_location?.data?.id || null,
          is_active: true,
          joined_date: u?.date_joined ? u.date_joined.split('T')[0] : null,
        }, { onConflict: 'mariana_tek_user_id' })
        membersSynced++
      } catch { }
    }
    results.members_synced = membersSynced

  } catch (e: any) {
    results.error = e.message
  }

  return NextResponse.json({ success: true, ...results })
}