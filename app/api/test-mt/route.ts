import { NextResponse } from 'next/server'

export async function GET() {
  let all: any[] = []
  let page = 1

  while (page <= 3) {
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
    all = [...all, ...(data.data || [])]
    page++
  }

  const warriors = all.filter((t: any) => 
    t.attributes.membership_name?.includes('Warrior')
  )

  return NextResponse.json({
    total_fetched: all.length,
    warrior_count: warriors.length,
    warriors: warriors.map((t: any) => ({
      name: t.attributes.membership_name,
      next_charge: t.attributes.next_charge_date,
      interval_start: t.attributes.payment_interval_start_date,
      interval_end: t.attributes.payment_interval_end_date,
      amount: t.attributes.transaction_amount,
    }))
  })
}