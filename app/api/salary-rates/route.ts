import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function PUT(request: Request) {
  const body = await request.json()
  const { employee_id, ...rates } = body

  if (!employee_id) {
    return NextResponse.json({ error: 'employee_id påkrævet' }, { status: 400 })
  }

  await supabase
    .from('salary_rates')
    .update({ valid_to: new Date().toISOString().split('T')[0] })
    .eq('employee_id', employee_id)
    .is('valid_to', null)

  const { data, error } = await supabase
    .from('salary_rates')
    .insert({ employee_id, ...rates })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  return PUT(request)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const employee_id = searchParams.get('employee_id')
  if (!employee_id) return NextResponse.json({ error: 'employee_id påkrævet' }, { status: 400 })
  await supabase
    .from('salary_rates')
    .update({ valid_to: new Date().toISOString().split('T')[0] })
    .eq('employee_id', employee_id)
    .is('valid_to', null)
  return NextResponse.json({ success: true })
}