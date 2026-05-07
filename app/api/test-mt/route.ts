import { NextResponse } from 'next/server'

export async function GET() {
  // Hent kun aktive membership transactions med next_charge_date i fremtiden
  const today = new Date().toISOString().split('T')[0]
  
  let allTransactions: any[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages && page <= 15) { // max 15 sider = 1500 poster
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/membership_transactions?per_page=100&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    )
    const data = await res.json()
    totalPages = data.meta?.pagination?.pages || 1
    allTransactions = [...allTransactions, ...(data.data || [])]
    page++
  }

  // Kun aktive — har next_charge_date i fremtiden
  const active = allTransactions.filter((t: any) => {
    if (!t.attributes.next_charge_date) return false
    return new Date(t.attributes.next_charge_date) > new Date()
  })

  // Gruppér på membership_name
  const grouped = active.reduce((acc: any, t: any) => {
    const name = t.attributes.membership_name
    if (!acc[name]) acc[name] = { count: 0 }
    acc[name].count++
    return acc
  }, {})

  return NextResponse.json({ 
    total_transactions: allTransactions.length,
    active_count: active.length,
    grouped
  })
}