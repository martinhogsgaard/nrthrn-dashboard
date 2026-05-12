import { NextResponse } from 'next/server'

const ARKETA_HEADERS = {
  'Authorization': `Bearer ${process.env.ARKETA_API_KEY}`,
  'Content-Type': 'application/json',
  'x-api-key': process.env.ARKETA_API_KEY || '',
}

export async function GET() {
  const endpoints = [
    'https://us-central1-sutra-prod.cloudfunctions.net/external/nordic-strong/classes',
    'https://us-central1-sutra-prod.cloudfunctions.net/external/nordic-strong/sessions',
    'https://us-central1-sutra-prod.cloudfunctions.net/external/nordic-strong/bookings',
  ]

  const results: any = {}
  for (const url of endpoints) {
    const res = await fetch(url, { headers: ARKETA_HEADERS })
    results[url.split('/').pop() || ''] = res.status
  }

  return NextResponse.json(results)
}