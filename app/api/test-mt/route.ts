import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/credit_transactions?min_datetime=${start}&origination_type=purchase&per_page=5`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()

  // Hent credit detaljer for første transaktion
  const firstCreditId = data.data?.[0]?.relationships?.credit?.data?.id
  let creditDetail = null
  if (firstCreditId) {
    const cr = await fetch(`https://nrthrnstrong.marianatek.com/api/credits/${firstCreditId}`, { headers: MT_HEADERS })
    creditDetail = await cr.json()
  }

  return NextResponse.json({ 
    status: res.status, 
    count: data.meta?.pagination?.count,
    first: data.data?.[0]?.attributes,
    credit_detail: creditDetail?.data?.attributes
  })
}