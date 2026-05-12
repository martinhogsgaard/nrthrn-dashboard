import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.ARKETA_API_KEY
  const baseUrl = 'https://us-central1-sutra-prod.cloudfunctions.net/external/nordic-strong'

  // Prøv forskellige auth metoder
  const attempts = [
    { method: 'x-api-key header', res: await fetch(baseUrl, { headers: { 'x-api-key': key || '' } }) },
    { method: 'apikey header', res: await fetch(baseUrl, { headers: { 'apikey': key || '' } }) },
    { method: 'query param', res: await fetch(`${baseUrl}?apiKey=${key}`) },
  ]

  const results: any = {}
  for (const a of attempts) {
    const text = await a.res.text()
    results[a.method] = { status: a.res.status, body: text.slice(0, 300) }
  }

  return NextResponse.json(results)
}