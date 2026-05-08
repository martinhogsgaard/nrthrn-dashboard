import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start') || new Date().toISOString().split('T')[0]
  const end = searchParams.get('end') || new Date().toISOString().split('T')[0]
  const location = searchParams.get('location') || '48718'

  const { data, error } = await supabase
    .from('sessions_cache')
    .select('*')
    .eq('location_id', location)
    .gte('date', start)
    .lte('date', end)
    .order('date')
    .order('time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sessions: data, total: data.length })
}