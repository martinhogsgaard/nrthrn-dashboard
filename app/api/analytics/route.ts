import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || 'all'

  // Hent omsætning
  let revenueQuery = supabase.from('analytics_monthly').select('*').order('month', { ascending: true })
  if (location !== 'all') revenueQuery = revenueQuery.eq('location_id', location)
  const { data: revenueData, error: revenueError } = await revenueQuery
  if (revenueError) return NextResponse.json({ error: revenueError.message }, { status: 500 })

  // Hent members tilvækst
  let membersQuery = supabase.from('analytics_members_monthly').select('*').order('month', { ascending: true })
  if (location !== 'all') membersQuery = membersQuery.eq('location_id', location)
  const { data: membersData } = await membersQuery

  // Gruppér omsætning pr. måned
  const byMonth: Record<string, any> = {}
  for (const row of revenueData || []) {
    const month = row.month.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = {
      month,
      cph_revenue: 0, nyc_revenue: 0,
      cph_purchases: 0, nyc_purchases: 0,
      total_purchases: 0,
      cph_members: 0, nyc_members: 0,
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
    byMonth[month].total_purchases += pur
  }

  // Tilføj members tilvækst
  for (const row of membersData || []) {
    const month = row.month.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = {
      month, cph_revenue: 0, nyc_revenue: 0,
      cph_purchases: 0, nyc_purchases: 0,
      total_purchases: 0, cph_members: 0, nyc_members: 0,
    }
    if (row.location_id === '48718') byMonth[month].cph_members += Number(row.new_members) || 0
    else byMonth[month].nyc_members += Number(row.new_members) || 0
  }

  const months = Object.values(byMonth).map(m => ({
    ...m,
    cph_revenue: Math.round(m.cph_revenue),
    nyc_revenue: Math.round(m.nyc_revenue),
  })).sort((a, b) => a.month.localeCompare(b.month))

  // Top produkter
  const productTotals: Record<string, any> = {}
  for (const row of revenueData || []) {
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