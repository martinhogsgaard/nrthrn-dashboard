import { NextResponse } from 'next/server'
import { supabase, MT_BASE, mtFetch, sleep } from '@/lib/mt-sync-lib'

export const maxDuration = 300

// Henter purchased_items for ordrer der mangler lines.
// Kører batch-vis — tager kun så mange den kan nå inden for tidsbudgettet.
// Resten tages næste dag. Nye ordrer prioriteres (nyeste først via RPC).
const MAX_ORDERS_PER_RUN = 600

export async function GET() {
  const results: any = {}

  try {
    // Hent ordrer der mangler lines (fra 1. maj 2026 og frem)
    const { data: missingOrders, error } = await supabase
      .rpc('get_orders_missing_lines', { p_start: '2026-05-01' })

    if (error) throw new Error(`RPC fejl: ${error.message}`)

    const orders = (missingOrders || []).slice(0, MAX_ORDERS_PER_RUN)
    let processed = 0
    let failed = 0

    for (const order of orders) {
      try {
        const detail = await mtFetch(`${MT_BASE}/orders/${order.id}`)
        const purchasedItems = detail?.data?.attributes?.purchased_items || []
        if (purchasedItems.length === 0) {
          processed++
          await sleep(150)
          continue
        }

        // Dedupliker på order_line_id — MT kan sende samme id to gange
        const seen = new Set<string>()
        const lines = purchasedItems
          .filter((item: any) => {
            if (seen.has(item.order_line_id)) return false
            seen.add(item.order_line_id)
            return true
          })
          .map((item: any) => ({
            id: item.order_line_id,
            order_id: order.id,
            product_title: item.product_title,
            quantity: 1,
            unit_price: parseFloat(item.price) || 0,
            line_total: parseFloat(item.price_incl_tax) || 0,
            refunded: item.refunded || false,
            date_placed: order.date_placed,
            location: order.location,
            location_id: order.location_id,
            updated_at: new Date().toISOString(),
          }))

        const { error: upsertError } = await supabase
          .from('order_lines_cache')
          .upsert(lines, { onConflict: 'id' })

        if (upsertError) throw new Error(upsertError.message)
        processed++
      } catch (e: any) {
        failed++
      }
      await sleep(150)
    }

    const remaining = (missingOrders || []).length - processed
    results.order_lines = `${processed} ordrer behandlet, ${failed} fejlede, ${remaining} mangler stadig`
  } catch (e: any) {
    results.order_lines = `Fejl: ${e.message}`
  }

  return NextResponse.json({ success: true, ...results })
}