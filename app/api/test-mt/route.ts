import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  
  let all: any[] = []
  let page = 1
  while (page <= 5) {
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/credit_transactions?min_datetime=${start}&origination_type=purchase&per_page=100&page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    all = [...all, ...(data.data || [])]
    if (data.meta?.pagination?.pages <= page) break
    page++
  }

  const names = all.reduce((acc: any, t: any) => {
    const name = t.attributes.credit_name
    acc[name] = (acc[name] || 0) + 1
    return acc
  }, {})

  return NextResponse.json({ total: all.length, names })
}