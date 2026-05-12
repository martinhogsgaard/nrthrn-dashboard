import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.ARKETA_API_KEY
  const baseUrl = 'https://us-central1-sutra-prod.cloudfunctions.net/external/nordic-strong'

  const attempts: any = {}

  // Prøv POST
  const postRes = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'x-api-key': key || '', 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
  attempts['POST'] = { status: postRes.status, body: (await postRes.text()).slice(0, 300) }

  // Prøv med /classes path
  const classRes = await fetch(`${baseUrl}/classes`, {
    headers: { 'x-api-key': key || '' }
  })
  attempts['GET /classes'] = { status: classRes.status, body: (await classRes.text()).slice(0, 300) }

  // Prøv med /bookings path  
  const bookRes = await fetch(`${baseUrl}/bookings`, {
    headers: { 'x-api-key': key || '' }
  })
  attempts['GET /bookings'] = { status: bookRes.status, body: (await bookRes.text()).slice(0, 300) }

  return NextResponse.json(attempts)
}