import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch(
    'https://us-central1-sutra-prod.cloudfunctions.net/external/nordic-strong',
    {
      headers: {
        'Authorization': `Bearer ${process.env.ARKETA_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const text = await res.text()
  return NextResponse.json({ status: res.status, body: text.slice(0, 2000) })
}