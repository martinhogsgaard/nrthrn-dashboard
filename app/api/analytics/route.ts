import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Kategorisering baseret på produktnavn
function categorize(name: string): 'subscription' | 'pack' | 'intro' | 'kiosk' | 'event' | 'other' {
  if (!name) return 'other'
  const n = name.toLowerCase()
  // Subscriptions
  if (['classes (', 'revival (', 'warrior (', '4 monthly', '8 monthly', 'fitness space', 'sauna club',
       'unlimited monthly', '2-week unlimited', 'flatiron founding membership', '4 monthly classes',
       '8 monthly classes', 'monthly membership'].some(k => n.includes(k.toLowerCase()))) return 'subscription'
  // Intro
  if (['first timer', '3-class intro', 'intro class', 'intro pack', 'intro offer', '1 intro',
       '3 class pack - intro'].some(k => n.includes(k.toLowerCase()))) return 'intro'
  // Packs
  if (['1 class', '5 class', '10 class', '30 classes', '50 classes', 'saunagus', 'massage',
       'klipkort', 'clip', 'class pack', 'drop-in', 'sag 1'].some(k => n.includes(k.toLowerCase()))) return 'pack'
  // Events
  if (['marathon', 'event', 'workshop', 'bootcamp', 'buyout', 'open water', 'blackstone',
       'challenge', 'turn up', '21-day', 'bundle', 'black friday'].some(k => n.includes(k.toLowerCase()))) return 'event'
  // Kiosk
  if (['barebells', 'good habit', 'nocco', 'storm drink', 'leggins', 'polene',
       'late cancel', 'no show', 'credits', 'founding credits'].some(k => n.includes(k.toLowerCase()))) return 'kiosk'
  return 'other'
}

export async function GET() {
  const MT_START = '2026-05-01'

  // Hent Arketa transaktioner (før MT)
  const { data: arketaData } = await supabase
    .from('arketa_transactions')
    .select('amount, status, created_at, category, pricing_option, location_id, currency')
    .eq('status', 'Succeeded')
    .lt('created_at', MT_START + 'T00:00:00Z')
    .limit(50000)

  // Hent MT orders (fra maj 2026)
  const { data: mtData } = await supabase
    .from('orders_cache')
    .select('total, date_placed, summary, location_id')
    .gte('date_placed', MT_START)

  // Hent aktive medlemmer fra membership_cache
  const { data: memberships } = await supabase
    .from('membership_cache')
    .select('purchase_location_id, renewal_rate, status')
    .eq('status', 'active')

  // Hent aldersfordeling fra arketa_clients
  const { data: cphClients } = await supabase
    .from('arketa_clients')
    .select('date_of_birth')
    .eq('location_id', '48718')
    .not('date_of_birth', 'is', null)

  const { data: nycClients } = await supabase
    .from('arketa_clients')
    .select('date_of_birth')
    .eq('location_id', '48717')
    .not('date_of_birth', 'is', null)

  // Byg månedlig data
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
      cph_members: 0, nyc_members: 0,
      source: 'arketa',
    }
  }

  // Arketa data
  for (const row of arketaData || []) {
    const month = row.created_at.slice(0, 7)
    addMonth(month)
    const amount = Number(row.amount) || 0
    const isCPH = row.location_id === '48718'
    const prefix = isCPH ? 'cph' : 'nyc'
    const cat = categorize(row.pricing_option || row.category || '')

    byMonth[month][`${prefix}_revenue`] += amount
    byMonth[month][`${prefix}_purchases`]++

    if (cat === 'subscription') byMonth[month][`${prefix}_subscription_revenue`] += amount
    else if (cat === 'intro') byMonth[month][`${prefix}_intro_revenue`] += amount
    else if (cat === 'pack') { byMonth[month][`${prefix}_pack_revenue`] += amount; byMonth[month][`${prefix}_packs`]++ }
    else if (cat === 'kiosk') byMonth[month][`${prefix}_kiosk_revenue`] += amount
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

  // Aktive medlemmer (nuværende snapshot)
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

  for (const c of cphClients || []) {
    const g = getAgeGroup(c.date_of_birth)
    ageCPH[g] = (ageCPH[g] || 0) + 1
  }
  for (const c of nycClients || []) {
    const g = getAgeGroup(c.date_of_birth)
    ageNYC[g] = (ageNYC[g] || 0) + 1
  }

  const ageOrder = ['Gen Z (under 30)', 'Millennial (30-44)', 'Gen X (45-59)', 'Boomer (60+)']
  const totalCPH = Object.values(ageCPH).reduce((s, v) => s + v, 0)
  const totalNYC = Object.values(ageNYC).reduce((s, v) => s + v, 0)
  const age_distribution = ageOrder.map(group => ({
    group,
    cph_count: ageCPH[group] || 0,
    nyc_count: ageNYC[group] || 0,
    cph_pct: totalCPH > 0 ? Math.round((ageCPH[group] || 0) / totalCPH * 100) : 0,
    nyc_pct: totalNYC > 0 ? Math.round((ageNYC[group] || 0) / totalNYC * 100) : 0,
  }))

  // Top produkter
  const productTotals: Record<string, any> = {}

  for (const row of arketaData || []) {
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
      data_sources: { arketa_rows: arketaData?.length || 0, mt_rows: mtData?.length || 0 },
      month_count: months.length,
      first_month: months[0]?.month,
      last_month: months[months.length - 1]?.month,
    }
  })
}