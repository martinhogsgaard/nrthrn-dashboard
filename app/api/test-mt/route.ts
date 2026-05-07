import { NextResponse } from 'next/server'

export async function GET() {
  // Hent alle aktive membership transactions (kun dem med next_charge_date)
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/membership_transactions?per_page=100&page=1`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const data = await res.json()
  
  // Gruppér på membership_name — kun aktive (har next_charge_date)
  const active = data.data?.filter((t: any) => t.attributes.next_charge_date)
  const grouped = active?.reduce((acc: any, t: any) => {
    const name = t.attributes.membership_name
    if (!acc[name]) acc[name] = 0
    acc[name]++
    return acc
  }, {})

  return NextResponse.json({ 
    total: data.meta?.pagination?.count,
    active_count: active?.length,
    grouped
  })
}