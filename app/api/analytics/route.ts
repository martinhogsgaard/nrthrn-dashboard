import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function categorize(name: string): 'subscription' | 'pack' | 'intro' | 'kiosk' | 'event' | 'other' {
  if (!name) return 'other'
  const n = name.toLowerCase()
  if (['classes (', 'revival (', 'warrior (', '4 monthly', '8 monthly', 'fitness space', 'sauna club',
       'unlimited monthly', '2-week unlimited', 'flatiron founding membership', '4 monthly classes',
       '8 monthly classes', 'monthly membership'].some(k => n.includes(k.toLowerCase()))) return 'subscription'
  if (['first timer', '3-class intro', 'intro class', 'intro pack', 'intro offer', '1 intro',
       '3 class pack - intro'].some(k => n.includes(k.toLowerCase()))) return 'intro'
  if (['1 class', '5 class', '10 class', '30 classes', '50 classes', 'saunagus', 'massage',
       'klipkort', 'clip', 'class pack', 'drop-in', 'sag 1'].some(k => n.includes(k.toLowerCase()))) return 'pack'
  if (['marathon', 'event', 'workshop', 'bootcamp', 'buyout', 'open water', 'blackstone',
       'challenge', 'turn up', '21-day', 'bundle', 'black friday'].some(k => n.includes(k.toLowerCase()))) return 'event'
  if (['barebells', 'good habit', 'nocco', 'storm drink', 'leggins', 'polene',
       'late cancel', 'no show', 'credits', 'founding credits'].some(k => n.includes(k.toLowerCase()))) return 'kiosk'
  return 'other'
}

export async function GET() {
  const MT_START = '2026-05-01'

  const [
    { data: arketaMonthly },
    { data: mtData },
    { data: memberships },
    { data: cphClients },
    { data: nycClients },
    { data: arketaTopProducts },
  ] = await Promise.all([
    // Aggregeret view — kun ~20 rækker
    supabase.from('arketa_monthly_summary').select('*'),
    // MT orders fra maj 2026
    supabase.from('orders_cache').select('total, date_placed, summary, location_id').gte('date_placed', MT_START),
    // Aktive medlemmer
    supabase.from('active_memberships').select('purchase_location_id, renewal_rate, status'),
    // Aldersfordeling
    supabase.from('arketa_clients').select('date_of_birth').eq('location_id', '48718').not('date_of_birth', 'is', null),
    supabase.from('arketa_clients').select('date_of_birth').eq('location_id', '48717').not('date_of_birth', 'is', null),
    // Top produkter fra arketa — aggregeret i DB
    supabase.from('arketa_transactions')
      .select('pricing_option, location_id, currency, amount')
      .eq('status', 'Succeeded')
      .lt('created_at', MT_START + 'T00:00:00Z')
      .limit(1000),
  ])

  // Byg månedlig data fra arketa view
  const byMonth: Record<string, any> = {}

  const addMonth = (month: string) => {
    if (!byMonth[month]) byMonth[month] = {
      month,
      cph_revenue: 0, nyc_revenue: 0,
      cph_subscription_revenue: 0, nyc_subscription_revenue: 0,
      cph_pack_revenue: 0, nyc_pack_revenue: 0,
      cph_intro_revenue: 0, nyc_intro_revenue: 0,
      cph_kiosk_revenue: 0, nyc_kiosk_revenue: 0,
      cph_purchases: 0, nyc_purchases: 0,
      cph_packs: 0, nyc_packs: 0,
      source: 'arketa',
    }
  }

  // Arketa månedsoversigt fra view
  for (const row of arketaMonthly || []) {
    const month = row.month.slice(0, 7)
    addMonth(month)
    const isCPH = row.location_id === '48718'
    const prefix = isCPH ? 'cph' : 'nyc'
    byMonth[month][`${prefix}_revenue`] += Math.round(Number(row.revenue) || 0)
    byMonth[month][`${prefix}_purchases`] += Number(row.purchases) || 0
    byMonth[month][`${prefix}_subscription_revenue`] += Math.round(Number(row.subscription_revenue) || 0)
    byMonth[month][`${prefix}_pack_revenue`] += Math.round(Number(row.pack_revenue) || 0)
    byMonth[month][`${prefix}_packs`] += Number(row.packs_sold) || 0
    byMonth[month][`${prefix}_intro_revenue`] += Math.round(Number(row.intro_revenue) || 0)
    byMonth[month][`${prefix}_members`] += Number(row.new_subscriptions) || 0
  }

  // MT data
  for (const row of mtData || []) {
    const month = row.date_placed.slice(0, 7)
    addMonth(month)
    byMonth[month].source = 'mt'
    const amount = Number(row.total) || 0
    const isCPH = row.location_id === '48718'
    const prefix = isCPH ? 'cph' : 'nyc'
    const cat = categorize(row.summary || '')
    byMonth[month][`${prefix}_revenue`] += amount
    byMonth[month][`${prefix}_purchases`]++
    if (cat === 'subscription') byMonth[month][`${prefix}_subscription_revenue`] += amount
    else if (cat === 'intro') byMonth[month][`${prefix}_intro_revenue`] += amount
    else if (cat === 'pack') { byMonth[month][`${prefix}_pack_revenue`] += amount; byMonth[month][`${prefix}_packs`]++ }
    else if (cat === 'kiosk') byMonth[month][`${prefix}_kiosk_revenue`] += amount
  }

  const months = Object.values(byMonth)
    .map(m => ({
      ...m,
      cph_revenue: Math.round(m.cph_revenue),
      nyc_revenue: Math.round(m.nyc_revenue),
      cph_subscription_revenue: Math.round(m.cph_subscription_revenue),
      nyc_subscription_revenue: Math.round(m.nyc_subscription_revenue),
      cph_pack_revenue: Math.round(m.cph_pack_revenue),
      nyc_pack_revenue: Math.round(m.nyc_pack_revenue),
      cph_intro_revenue: Math.round(m.cph_intro_revenue),
      nyc_intro_revenue: Math.round(m.nyc_intro_revenue),
      cph_kiosk_revenue: Math.round(m.cph_kiosk_revenue),
      nyc_kiosk_revenue: Math.round(m.nyc_kiosk_revenue),
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Aktive medlemmer
  const cphActive = (memberships || []).filter(m => m.purchase_location_id === '48718' && m.renewal_rate > 0).length
  const nycActive = (memberships || []).filter(m => m.purchase_location_id === '48717' && m.renewal_rate > 0).length

  // Aldersfordeling
  const now = new Date()
  const getAgeGroup = (dob: string) => {
    const age = now.getFullYear() - new Date(dob).getFullYear()
    if (age < 30) return 'Gen Z (under 30)'
    if (age < 45) return 'Millennial (30-44)'
    if (age < 60) return 'Gen X (45-59)'
    return 'Boomer (60+)'
  }
  const ageCPH: Record<string, number> = {}
  const ageNYC: Record<string, number> = {}
  for (const c of cphClients || []) { const g = getAgeGroup(c.date_of_birth); ageCPH[g] = (ageCPH[g] || 0) + 1 }
  for (const c of nycClients || []) { const g = getAgeGroup(c.date_of_birth); ageNYC[g] = (ageNYC[g] || 0) + 1 }
  const ageOrder = ['Gen Z (under 30)', 'Millennial (30-44)', 'Gen X (45-59)', 'Boomer (60+)']
  const totalCPHAge = Object.values(ageCPH).reduce((s, v) => s + v, 0)
  const totalNYCAge = Object.values(ageNYC).reduce((s, v) => s + v, 0)
  const age_distribution = ageOrder.map(group => ({
    group,
    cph_count: ageCPH[group] || 0,
    nyc_count: ageNYC[group] || 0,
    cph_pct: totalCPHAge > 0 ? Math.round((ageCPH[group] || 0) / totalCPHAge * 100) : 0,
    nyc_pct: totalNYCAge > 0 ? Math.round((ageNYC[group] || 0) / totalNYCAge * 100) : 0,
  }))

  // Top produkter — kombiner arketa (første 1000) + MT
  const productTotals: Record<string, any> = {}
  for (const row of arketaTopProducts || []) {
    const product = row.pricing_option || 'Ukendt'
    const key = `${row.location_id}:${product}`
    if (!productTotals[key]) productTotals[key] = {
      product, location_id: row.location_id,
      location: row.location_id === '48718' ? 'CPH' : 'NYC',
      currency: row.currency || (row.location_id === '48718' ? 'DKK' : 'USD'),
      category: categorize(product), revenue: 0, purchases: 0
    }
    productTotals[key].revenue += Number(row.amount) || 0
    productTotals[key].purchases++
  }
  for (const row of mtData || []) {
    const product = row.summary || 'Ukendt'
    const key = `${row.location_id}:${product}`
    if (!productTotals[key]) productTotals[key] = {
      product, location_id: row.location_id,
      location: row.location_id === '48718' ? 'CPH' : 'NYC',
      currency: row.location_id === '48718' ? 'DKK' : 'USD',
      category: categorize(product), revenue: 0, purchases: 0
    }
    productTotals[key].revenue += Number(row.total) || 0
    productTotals[key].purchases++
  }
  const top_products = Object.values(productTotals)
    .map(p => ({ ...p, revenue: Math.round(p.revenue) }))
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 30)

  return NextResponse.json({
    months,
    age_distribution,
    top_products,
    summary: {
      cph_active_members: cphActive,
      nyc_active_members: nycActive,
      data_sources: { arketa_months: arketaMonthly?.length || 0, mt_rows: mtData?.length || 0 },
      month_count: months.length,
      first_month: months[0]?.month,
      last_month: months[months.length - 1]?.month,
    }
  })
}