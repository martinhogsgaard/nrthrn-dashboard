import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Opdater lønsatser for en instruktør
export async function PUT(request: Request) {
  const supabase = createClient()
  const body = await request.json()
  const { instructor_id, ...rates } = body

  if (!instructor_id) {
    return NextResponse.json({ error: 'instructor_id påkrævet' }, { status: 400 })
  }

  // Luk eksisterende aktive satser
  await supabase
    .from('salary_rates')
    .update({ valid_to: new Date().toISOString().split('T')[0] })
    .eq('instructor_id', instructor_id)
    .is('valid_to', null)

  // Opret nye satser
  const { data, error } = await supabase
    .from('salary_rates')
    .insert({ instructor_id, ...rates })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
