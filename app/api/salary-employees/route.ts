import { NextResponse } from 'next/server'

const SALARY_BASE = 'https://api.salary.dk'
const COMPANY_ID = process.env.SALARY_COMPANY_ID!

async function getSalaryToken() {
  const res = await fetch(`${SALARY_BASE}/v2/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiClientID: process.env.SALARY_API_CLIENT_ID,
      apiClientSecret: process.env.SALARY_API_CLIENT_SECRET,
      apiKey: process.env.SALARY_API_KEY,
    })
  })
  const data = await res.json()
  return data.data?.accessToken
}

export async function GET() {
  try {
    const token = await getSalaryToken()
    if (!token) return NextResponse.json({ error: 'Kunne ikke hente Salary token' }, { status: 500 })

    // Hent alle medarbejdere pagineret
    let allEmployees: any[] = []
    let offset = 0
    const limit = 100

    while (true) {
      const res = await fetch(
        `${SALARY_BASE}/v2/employees?companyID=${COMPANY_ID}&limit=${limit}&offset=${offset}`,
        { headers: { 'Authorization': token } }
      )
      const data = await res.json()
      const employees = data.data || []
      allEmployees = [...allEmployees, ...employees]
      if (allEmployees.length >= data.pagination?.count) break
      offset += limit
    }

    // Returner kun det vi skal bruge til matching — ingen CPR, ingen bankoplysninger
    const mapped = allEmployees.map(e => ({
      salary_id: e.id,
      name: e.name,
      email: e.email || null,
      position: e.activeContract?.position || null,
      status: e.employmentStatus, // Active, Terminated osv.
    }))

    return NextResponse.json(mapped)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}