import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || 'all'

  // Hent monthly analytics fra view
  let query = supabase
    .from('analytics_monthly')
    .select('*')
    .order('month', { ascending: true })

  if (location !== 'all') {
    query = query.eq('location_id', location)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Gruppér pr. måned
  const byMonth: Record<string, any> = {}
  for (const row of data || []) {
    const month = row.month.slice(0, 7) // YYYY-MM
    if (!byMonth[month]) byMonth[month] = {
      month,
      cph_revenue: 0, nyc_revenue: 0, total_revenue: 0,
      cph_purchases: 0, nyc_purchases: 0, total_purchases: 0,
      products: {}
    }

    const rev = Number(row.revenue) || 0
    const pur = Number(row.purchases) || 0

    if (row.location_id === '48718') {
      byMonth[month].cph_revenue += rev
      byMonth[month].cph_purchases += pur
    } else {
      byMonth[month].nyc_revenue += rev
      byMonth[month].nyc_purchases += pur
    }
    byMonth[month].total_revenue += rev
    byMonth[month].total_purchases += pur

    // Produktfordeling
    const key = `${row.location}:${row.product}`
    if (!byMonth[month].products[key]) byMonth[month].products[key] = { location: row.location, product: row.product, type: row.type, revenue: 0, purchases: 0 }
    byMonth[month].products[key].revenue += rev
    byMonth[month].products[key].purchases += pur
  }

  const months = Object.values(byMonth).map(m => ({
    ...m,
    cph_revenue: Math.round(m.cph_revenue),
    nyc_revenue: Math.round(m.nyc_revenue),
    total_revenue: Math.round(m.total_revenue),
    products: Object.values(m.products).sort((a: any, b: any) => b.revenue - a.revenue),
  }))

  // Top produkter samlet
  const productTotals: Record<string, any> = {}
  for (const row of data || []) {
    const key = `${row.location_id}:${row.product}`
    if (!productTotals[key]) productTotals[key] = { location: row.location, product: row.product, type: row.type, location_id: row.location_id, revenue: 0, purchases: 0 }
    productTotals[key].revenue += Number(row.revenue) || 0
    productTotals[key].purchases += Number(row.purchases) || 0
  }

  const topProducts = Object.values(productTotals)
    .map(p => ({ ...p, revenue: Math.round(p.revenue) }))
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 20)

  return NextResponse.json({ months, top_products: topProducts })
}