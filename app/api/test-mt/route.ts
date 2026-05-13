import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  
  const endpoints = [
    `https://nrthrnstrong.marianatek.com/api/payment_transactions?min_datetime=${start}&per_page=3`,
    `https://nrthrnstrong.marianatek.com/api/purchases?min_datetime=${start}&per_page=3`,
    `https://nrthrnstrong.marianatek.com/api/revenue?min_datetime=${start}&per_page=3`,
    `https://nrthrnstrong.marianatek.com/api/orders?min_datetime=${start}&per_page=3`,
  ]

  const results: any = {}
  for (const url of endpoints) {
    const ep = url.split('/api/')[1].split('?')[0]
    const res = await fetch(url, { headers: MT_HEADERS })
    results[ep] = res.status
  }

  return NextResponse.json(results)
}