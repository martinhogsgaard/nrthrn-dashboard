import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  const [
    { data: revenueData },
    { data: membersData },
    { data: activeData },
    { data: ageData },
    { data: packData },
  ] = await Promise.all([
    supabase.from('analytics_monthly').select('*').order('month'),
    supabase.from('analytics_members_monthly').select('*').order('month'),
    supabase.from('analytics_active_clients').select('*').order('month'),
    supabase.from('analytics_age_distribution').select('*'),
    supabase.from('analytics_pack_sales').select('*').order('month'),
  ])

  // Gruppér pr. måned
  const byMonth: Record<string, any> = {}

  const addMonth = (month: string) => {
    if (!byMonth[month]) byMonth[month] = {
      month,
      cph_revenue: 0, nyc_revenue: 0,
      cph_purchases: 0, nyc_purchases: 0,
      total_purchases: 0,
      cph_members: 0, nyc_members: 0,
      cph_active: 0, nyc_active: 0,
      cph_packs: 0, nyc_packs: 0,
      cph_pack_revenue: 0, nyc_pack_revenue: 0,
    }
  }

  for (const row of revenueData || []) {
    const month = row.month.slice(0, 7)
    addMonth(month)
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

  for (const row of membersData || []) {
    const month = row.month.slice(0, 7)
    addMonth(month)
    if (row.location_id === '48718') byMonth[month].cph_members += Number(row.new_members) || 0
    else byMonth[month].nyc_members += Number(row.new_members) || 0
  }

  for (const row of activeData || []) {
    const month = row.month.slice(0, 7)
    addMonth(month)
    if (row.location_id === '48718') byMonth[month].cph_active = Number(row.active_clients) || 0
    else byMonth[month].nyc_active = Number(row.active_clients) || 0
  }

  for (const row of packData || []) {
    const month = row.month.slice(0, 7)
    addMonth(month)
    if (row.location_id === '48718') {
      byMonth[month].cph_packs = Number(row.packs_sold) || 0
      byMonth[month].cph_pack_revenue = Math.round(Number(row.revenue) || 0)
    } else {
      byMonth[month].nyc_packs = Number(row.packs_sold) || 0
      byMonth[month].nyc_pack_revenue = Math.round(Number(row.revenue) || 0)
    }
  }

  const months = Object.values(byMonth)
    .map(m => ({ ...m, cph_revenue: Math.round(m.cph_revenue), nyc_revenue: Math.round(m.nyc_revenue) }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Aldersfordeling
  const ageOrder = ['Gen Z (under 30)', 'Millennial (30-44)', 'Gen X (45-59)', 'Boomer (60+)']
  const ageCPH: Record<string, number> = {}
  const ageNYC: Record<string, number> = {}
  for (const row of ageData || []) {
    if (row.location_id === '48718') ageCPH[row.age_group] = Number(row.count) || 0
    else ageNYC[row.age_group] = Number(row.count) || 0
  }
  const totalCPH = Object.values(ageCPH).reduce((s, v) => s + v, 0)
  const totalNYC = Object.values(ageNYC).reduce((s, v) => s + v, 0)
  const ageDistribution = ageOrder.map(group => ({
    group,
    cph_count: ageCPH[group] || 0,
    nyc_count: ageNYC[group] || 0,
    cph_pct: totalCPH > 0 ? Math.round((ageCPH[group] || 0) / totalCPH * 100) : 0,
    nyc_pct: totalNYC > 0 ? Math.round((ageNYC[group] || 0) / totalNYC * 100) : 0,
  }))

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

  return NextResponse.json({ months, age_distribution: ageDistribution, top_products: topProducts })
}