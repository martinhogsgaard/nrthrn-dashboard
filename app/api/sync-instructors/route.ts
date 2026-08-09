import { NextResponse } from 'next/server'
import { supabase, MT_BASE, MT_HEADERS, mtFetch, sleep } from '@/lib/mt-sync-lib'

export const maxDuration = 300

export async function GET() {
  const results: any = {}

  try {
    // Hent alle profiler (7 sider paginering)
    let allProfiles: any[] = []
    for (let page = 1; page <= 7; page++) {
      const data = await mtFetch(`${MT_BASE}/employee_public_profiles?per_page=10&page=${page}`)
      allProfiles = [...allProfiles, ...(data.data || [])]
      await sleep(150)
    }

    // Cache locations-opslag så vi ikke rammer Supabase per instruktør
    const { data: locations } = await supabase
      .from('locations')
      .select('id, mariana_tek_location_id')
    const locationMap = new Map((locations || []).map(l => [l.mariana_tek_location_id, l.id]))

    // Sekventielt — IKKE Promise.all — for at undgå MT rate-limit (429)
    const instructorsToUpsert: any[] = []
    for (const p of allProfiles) {
      const employeeId = p.relationships?.employee?.data?.id
      if (!employeeId) continue

      try {
        const empData = await mtFetch(`${MT_BASE}/employees/${employeeId}`)
        await sleep(150)
        const userId = empData?.data?.relationships?.user?.data?.id
        if (!userId) continue

        const userData = await mtFetch(`${MT_BASE}/users/${userId}`)
        await sleep(150)
        const u = userData.data?.attributes
        const firstName = u?.first_name || ''
        const lastName = u?.last_name || ''
        const homeLocationId = userData.data?.relationships?.home_location?.data?.id

        instructorsToUpsert.push({
          mariana_tek_id: employeeId,
          mariana_tek_profile_id: p.id,
          name: `${firstName} ${lastName}`.trim() || 'Ukendt',
          initials: [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase().slice(0, 2) || '??',
          email: u?.email || null,
          birth_date: u?.birth_date || null,
          location_id: locationMap.get(homeLocationId) || null,
          level: 'junior' as const,
          employment_type: 'employed' as const,
          is_active: p.attributes.enabled ?? true,
        })
      } catch (e: any) {
        // Én instruktør må ikke vælte hele trinnet
        console.log(`Instruktør ${employeeId} fejlede: ${e.message}`)
      }
    }

    if (instructorsToUpsert.length > 0) {
      const { error } = await supabase
        .from('employees')
        .upsert(instructorsToUpsert, { onConflict: 'mariana_tek_id', ignoreDuplicates: false })
      if (error) throw new Error(error.message)
    }
    results.instructors = `${instructorsToUpsert.length} instruktører opdateret`
  } catch (e: any) {
    results.instructors = `Fejl: ${e.message}`
  }

  return NextResponse.json({ success: true, ...results })
}