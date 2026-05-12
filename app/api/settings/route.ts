import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const settings: any = {}
  data?.forEach(row => { settings[row.key] = row.value })
  return NextResponse.json(settings)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { key, value } = body
  const { data, error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}