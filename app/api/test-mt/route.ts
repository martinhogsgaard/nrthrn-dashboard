import { NextResponse } from 'next/server'

const MT_HEADERS = {
  'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function GET() {
  const today = '2026-05-13'
  
  // Hent reservationer fra 13. maj med alle tags
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/reservations?min_datetime=${today}T00:00:00Z&max_datetime=${today}T23:59:59Z&per_page=100&include=tags`,
    { headers: MT_HEADERS }
  )
  const data = await res.json()

  // Find alle unikke tags
  const allTags = new Set<string>()
  data.included?.forEach((i: any) => {
    if (i.type === 'reservation_tags') allTags.add(i.attributes.name)
  })

  // Tæl reservationer pr. tag kombination
  const tagCombos: Record<string, number> = {}
  for (const r of data.data || []) {
    const rTags = r.relationships?.tags?.data?.map((t: any) => 
      data.included?.find((i: any) => i.id === t.id)?.attributes?.name
    ).filter(Boolean).sort().join(' + ') || 'Ingen tags'
    tagCombos[rTags] = (tagCombos[rTags] || 0) + 1
  }

  return NextResponse.json({ 
    total: data.meta?.pagination?.count,
    unique_tags: [...allTags],
    tag_combinations: tagCombos
  })
}