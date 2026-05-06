import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function PUT(request: Request) {
  const body = await request.json()
  const { instructor_id, ...rates } = body

  if (!instructor_id) {
    return NextResponse.json({ error: 'instructor_id påkrævet' }, { status: 400 })
  }

  await supabase
    .from('salary_rates')
    .update({ valid_to: new Date().toISOString().split('T')[0] })
    .eq('instructor_id', instructor_id)
    .is('valid_to', null)

  const { data, error } = await supabase
    .from('salary_rates')
    .insert({ instructor_id, ...rates })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}