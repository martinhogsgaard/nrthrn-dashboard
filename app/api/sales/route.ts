import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location') || '48718'
  const now = new Date()
  const start = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = searchParams.get('end') || now.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('equipment_sales')
    .select('*')
    .eq('location_id', location)
    .gte('sale_date', start)
    .lte('sale_date', end)
    .order('sale_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const totalRevenue = data?.reduce((s, r) => s + (r.sale_price * r.quantity), 0) || 0
  const totalCost = data?.reduce((s, r) => s + (r.cost_price * r.quantity), 0) || 0
  const totalProfit = totalRevenue - totalCost
  const totalItems = data?.reduce((s, r) => s + r.quantity, 0) || 0

  return NextResponse.json({
    period: { start, end },
    summary: {
      total_revenue: Math.round(totalRevenue),
      total_cost: Math.round(totalCost),
      total_profit: Math.round(totalProfit),
      total_items: totalItems,
      margin_pct: totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0,
    },
    sales: data || [],
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, quantity, sale_price, cost_price, sale_date, notes, location_id } = body

  const { data, error } = await supabase
    .from('equipment_sales')
    .insert({ name, quantity, sale_price, cost_price, sale_date, notes, location_id: location_id || '48718' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id påkrævet' }, { status: 400 })

  const { error } = await supabase.from('equipment_sales').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}