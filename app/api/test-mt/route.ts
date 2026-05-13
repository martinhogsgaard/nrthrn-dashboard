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
  while (page <= 6) {
    const res = await fetch(
      `https://nrthrnstrong.marianatek.com/api/orders?min_datetime=${start}&per_page=100&page=${page}`,
      { headers: MT_HEADERS }
    )
    const data = await res.json()
    if (!data.data?.length) break
    all = [...all, ...data.data]
    if (data.meta?.pagination?.pages <= page) break
    page++
  }

  // Filtrer kun København og completed
  const cph = all.filter(o => 
    o.attributes.location === 'Copenhagen' && 
    o.attributes.status === 'Completed' &&
    o.attributes.total > 0
  )

  // Gruppér på summary
  const grouped = cph.reduce((acc: any, o: any) => {
    const name = o.attributes.summary?.[0] || 'Ukendt'
    if (!acc[name]) acc[name] = { count: 0, total: 0 }
    acc[name].count++
    acc[name].total += o.attributes.total
    return acc
  }, {})

  return NextResponse.json({ 
    total_orders: cph.length,
    total_revenue: cph.reduce((s, o) => s + o.attributes.total, 0),
    grouped
  })
}