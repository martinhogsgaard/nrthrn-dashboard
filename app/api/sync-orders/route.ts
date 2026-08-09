import { NextResponse } from 'next/server'
import { supabase, MT_BASE, mtFetch, sleep } from '@/lib/mt-sync-lib'

export const maxDuration = 300

const RELEVANT_STATUSES = new Set(['Completed', 'Refunded', 'Partially Refunded'])

function mapOrder(o: any) {
  const total = Number(o.attributes.total ?? 0)
  const totalRefunded = Number(o.attributes.total_amount_refunded ?? 0)
  return {
    id: o.id,
    order_number: o.attributes.number,
    date_placed: o.attributes.date_placed,
    location: o.attributes.location,
    location_id:
      o.attributes.location === 'Copenhagen' ? '48718'
      : o.attributes.location === 'Flatiron' ? '48717'
      : null,
    status: o.attributes.status,
    total: total,
    net_total: total - totalRefunded,
    total_refunded: totalRefunded,
    contains_refund: o.attributes.contains_refund ?? false,
    summary: Array.isArray(o.attributes.summary)
      ? o.attributes.summary.join(', ')
      : (o.attributes.summary || null),
    updated_at: new Date().toISOString(),
  }
}

export async function GET() {
  const results: any = {}

  try {
    // Cutoff: nyeste i cache, men aldrig mere end 14 dage tilbage
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    const { data: latestRow, error: latestErr } = await supabase
      .from('orders_cache')
      .select('date_placed')
      .order('date_placed', { ascending: false })
      .limit(1)
      .single()

    if (latestErr && latestErr.code !== 'PGRST116') {
      throw new Error(`Cutoff-opslag fejlede: ${latestErr.message}`)
    }

    let cutoff: Date
    if (latestRow?.date_placed) {
      const latestInCache = new Date(latestRow.date_placed)
      cutoff = latestInCache < fourteenDaysAgo ? latestInCache : fourteenDaysAgo
    } else {
      cutoff = fourteenDaysAgo
    }
    const cutoffISO = cutoff.toISOString()

    let page = 1
    let upserted = 0
    let skipped = 0
    let stoppedAt: string | null = null
    let done = false

    while (!done && page <= 500) {
      const data = await mtFetch(`${MT_BASE}/orders?ordering=-date_placed&page=${page}`)
      const rows: any[] = data?.data ?? []
      if (rows.length === 0) break

      const relevantRows = rows.filter(o => RELEVANT_STATUSES.has(o.attributes.status))
      const toUpsert = relevantRows.map(mapOrder)
      skipped += rows.length - toUpsert.length

      if (toUpsert.length > 0) {
        const { error } = await supabase
          .from('orders_cache')
          .upsert(toUpsert, { onConflict: 'id' })
        if (error) throw new Error(`Upsert side ${page}: ${error.message}`)
        upserted += toUpsert.length
      }

      const oldestOnPage = rows[rows.length - 1]
      const oldestDate = oldestOnPage?.attributes?.date_placed ?? ''
      if (oldestDate && oldestDate < cutoffISO) {
        stoppedAt = oldestDate
        done = true
      }

      page++
      await sleep(150)
    }

    results.orders = [
      `${upserted} ordrer upserted`,
      `${page - 1} sider hentet`,
      `cutoff: ${cutoffISO.slice(0, 10)}`,
      stoppedAt ? `stoppede ved ${stoppedAt.slice(0, 10)}` : 'kørte til ende',
      skipped > 0 ? `(${skipped} skippet pga. status)` : '',
    ].filter(Boolean).join(' | ')
  } catch (e: any) {
    results.orders = `Fejl: ${e.message}`
  }

  return NextResponse.json({ success: true, ...results })
}