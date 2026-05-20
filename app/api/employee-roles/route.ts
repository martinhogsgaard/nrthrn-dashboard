import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Tilføj eller opdater en rolle
export async function POST(request: Request) {
  const body = await request.json()
  const { employee_id, role, hourly_rate, monthly_salary, salary_type, sling_user_id, notes } = body

  const { data, error } = await supabase
    .from('employee_roles')
    .upsert({
      employee_id,
      role,
      hourly_rate: hourly_rate || null,
      monthly_salary: monthly_salary || null,
      salary_type: salary_type || 'hourly',
      sling_user_id: sling_user_id || null,
      notes: notes || null,
      is_active: true,
    }, { onConflict: 'employee_id,role' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Slet en rolle
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const employee_id = searchParams.get('employee_id')
  const role = searchParams.get('role')

  if (!employee_id || !role) {
    return NextResponse.json({ error: 'Mangler employee_id eller role' }, { status: 400 })
  }

  // Instructor-rollen kan ikke slettes
  if (role === 'instructor') {
    return NextResponse.json({ error: 'Instructor-rollen kan ikke slettes' }, { status: 400 })
  }

  const { error } = await supabase
    .from('employee_roles')
    .delete()
    .eq('employee_id', employee_id)
    .eq('role', role)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}