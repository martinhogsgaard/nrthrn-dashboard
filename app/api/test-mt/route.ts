import { NextResponse } from 'next/server'

const ARKETA_BASE = 'https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0'

export async function GET() {
  const key = process.env.ARKETA_API_KEY

  // Prøv at finde partner ID — typisk er det studio-navnet
  const partnerIds = ['nrthrn-strong', 'nrthrnstrong', 'nordic-strong', 'nrthrn']

  const results: any = {}
  for (const id of partnerIds) {
    const res = await fetch(`${ARKETA_BASE}/${id}/locations`, {
      headers: { 'Authorization': `Bearer ${key}` }
    })
    results[id] = { status: res.status, body: (await res.text()).slice(0, 200) }
  }

  return NextResponse.json(results)
}