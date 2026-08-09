import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export const MT_BASE = 'https://nrthrnstrong.marianatek.com/api'

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Fetch med retry + backoff. 429 giver længere ventetid.
export async function mtFetch(url: string, attempts = 4): Promise<any> {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: MT_HEADERS })
      if (res.status === 429) throw new Error('HTTP 429')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      if (!text.trim()) throw new Error('Tomt svar')
      return JSON.parse(text)
    } catch (err: any) {
      if (i === attempts) throw err
      const wait = err.message.includes('429') ? 15000 : i * 2000
      await sleep(wait)
    }
  }
}