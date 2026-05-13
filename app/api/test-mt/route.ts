import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  
  let all: any[] = []
  let page = 1
  while (page <= 5) {
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/orders?min_datetime=${today}&per_page=100&page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    if (!data.data?.length) break
    all = [...all, ...data.data]
    if (data.meta?.pagination?.pages <= page) break
    page++
  }

  const cph = all.filter(o => o.attributes.location === 'Copenhagen' && o.attributes.status === 'Completed')
  const total = cph.reduce((s, o) => s + o.attributes.total, 0)
  
  const byType = cph.reduce((acc: any, o: any) => {
    const summary = o.attributes.summary?.[0] || 'Ukendt'
    if (!acc[summary]) acc[summary] = 0
    acc[summary] += o.attributes.total
    return acc
  }, {})

  return NextResponse.json({ total, orders: cph.length, by_product: byType })
}