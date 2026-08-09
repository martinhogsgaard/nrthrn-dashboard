import { NextResponse } from 'next/server'
import { supabase, MT_BASE, mtFetch, sleep } from '@/lib/mt-sync-lib'

export const maxDuration = 300

async function syncMemberships(locationId: string) {
  let allInstances: any[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const data = await mtFetch(`${MT_BASE}/membership_instances?purchase_location=${locationId}&page=${page}`)
    totalPages = data.meta?.pagination?.pages || 1
    allInstances = [...allInstances, ...(data.data || [])]
    if (page >= totalPages) break
    page++
    await sleep(150)
  }

  const membershipsToUpsert = allInstances.map((t: any) => ({
    id: t.id,
    membership_name: t.attributes.membership_name,
    renewal_rate: parseFloat(t.attributes.renewal_rate) || 0,
    age_group: t.attributes.membership_name?.includes('30+') ? 'over30' : t.attributes.membership_name?.includes('under 30') ? 'under30' : 'other',
    purchase_location_id: t.relationships?.purchase_location?.data?.id || locationId,
    next_charge_date: t.attributes.next_charge_date,
    status: t.attributes.status || 'active',
    updated_at: new Date().toISOString(),
  }))

  if (membershipsToUpsert.length > 0) {
    const { error } = await supabase.from('membership_cache').upsert(membershipsToUpsert, { onConflict: 'id' })
    if (error) throw new Error(error.message)
  }

  return membershipsToUpsert.length
}

export async function GET() {
  const now = new Date()
  const results: any = {}

  try {
    const cphCount = await syncMemberships('48718')
    const nycCount = await syncMemberships('48717')
    results.memberships = `${cphCount + nycCount} abonnementer synkroniseret (CPH: ${cphCount}, NYC: ${nycCount})`
  } catch (e: any) {
    results.memberships = `Fejl: ${e.message}`
  }

  // Snapshot membership breakdown — kører kun d. 1. i måneden
  try {
    const isFirstOfMonth = now.getDate() === 1
    if (isFirstOfMonth) {
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const snapshotMonth = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)
        .toISOString().split('T')[0]

      for (const locId of ['48718', '48717']) {
        const { data: memberships } = await supabase
          .from('membership_cache')
          .select('membership_name, renewal_rate, age_group, purchase_location_id')
          .eq('purchase_location_id', locId)
          .eq('status', 'active')

        if (!memberships) continue

        const grouped: Record<string, { count: number; mrr: number; renewal_rate: number; age_group: string }> = {}
        for (const m of memberships) {
          if (!grouped[m.membership_name]) {
            grouped[m.membership_name] = { count: 0, mrr: 0, renewal_rate: m.renewal_rate || 0, age_group: m.age_group || 'other' }
          }
          grouped[m.membership_name].count++
          grouped[m.membership_name].mrr += m.renewal_rate || 0
        }

        const snapshots = Object.entries(grouped).map(([name, d]) => ({
          month: snapshotMonth,
          location_id: locId,
          membership_name: name,
          count: d.count,
          mrr: Math.round(d.mrr),
          age_group: d.age_group,
          renewal_rate: d.renewal_rate,
        }))

        if (snapshots.length > 0) {
          await supabase.from('membership_snapshots').upsert(snapshots, { onConflict: 'month,location_id,membership_name' })
        }
      }
      results.membership_snapshot = `Breakdown snapshot gemt for ${snapshotMonth}`
    } else {
      results.membership_snapshot = `Springer over — kun d. 1. i måneden`
    }
  } catch (e: any) {
    results.membership_snapshot = `Fejl: ${e.message}`
  }

  // MRR Snapshot — kør kun d. 1. i måneden
  try {
    const isFirstOfMonth = now.getDate() === 1
    if (isFirstOfMonth) {
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)
      const snapshotMonth = `${prevMonthStart.getFullYear()}-${String(prevMonthStart.getMonth() + 1).padStart(2, '0')}-01`

      const { data: snapshotMemberships } = await supabase
        .from('membership_cache')
        .select('renewal_rate, status')
        .eq('status', 'active')
        .eq('purchase_location_id', '48718')

      if (snapshotMemberships) {
        const paying = snapshotMemberships.filter(m => (m.renewal_rate || 0) > 0)
        const mrr = Math.round(paying.reduce((s, m) => s + (m.renewal_rate || 0), 0))

        const { error } = await supabase
          .from('mrr_snapshots')
          .upsert({ month: snapshotMonth, mrr, member_count: snapshotMemberships.length, paying_count: paying.length }, { onConflict: 'month' })

        results.mrr_snapshot = error ? `Fejl: ${error.message}` : `Snapshot gemt for ${snapshotMonth}: ${mrr} kr.`
      }
    } else {
      results.mrr_snapshot = `Springer over — kun d. 1. i måneden (i dag er d. ${now.getDate()})`
    }
  } catch (e: any) {
    results.mrr_snapshot = `Fejl: ${e.message}`
  }

  return NextResponse.json({ success: true, ...results })
}