import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.ARKETA_API_KEY
  const baseUrl = 'https://us-central1-sutra-prod.cloudfunctions.net/external/nrthrn-strong'

  const res = await fetch(baseUrl, {
    headers: {
      'x-api-key': key || '',
      'Content-Type': 'application/json',
    }
  })
  const text = await res.text()
  return NextResponse.json({ status: res.status, body: text.slice(0, 500) })
}