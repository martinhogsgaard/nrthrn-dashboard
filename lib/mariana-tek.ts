// ── MARIANA TEK API CLIENT ───────────────────────────────────
// Klar til at modtage rigtig API-nøgle og subdomain
// Indtil da returneres mock-data så dashboardet virker

const MT_API_KEY = process.env.MARIANA_TEK_API_KEY
const MT_SUBDOMAIN = process.env.MARIANA_TEK_SUBDOMAIN
const MT_BASE_URL = `https://${MT_SUBDOMAIN}.marianatek.com/api`

const IS_LIVE = !!(MT_API_KEY && MT_SUBDOMAIN)

function getHeaders() {
  return {
    'Authorization': `Bearer ${MT_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

// ── TYPES ────────────────────────────────────────────────────

export interface MTClassSession {
  id: string
  name: string
  start_datetime: string
  instructor_id: string
  instructor_name: string
  capacity: number
  reservations: MTReservation[]
}

export interface MTReservation {
  id: string
  customer_id: string
  customer_name: string
  date_of_birth: string // ISO date — bruges til over/under 30 split
  status: string
}

export interface MTMember {
  id: string
  name: string
  email: string
  date_of_birth: string
  membership_type: string
  membership_status: 'active' | 'inactive'
  last_visit: string | null
}

// ── KLASS SESSIONS ───────────────────────────────────────────

export async function getClassSessions(
  startDate: string,
  endDate: string
): Promise<MTClassSession[]> {
  if (!IS_LIVE) {
    console.log('[MT API] Ikke konfigureret — returnerer mock data')
    return getMockClassSessions()
  }

  const res = await fetch(
`${MT_BASE_URL}/class_sessions?min_date=${startDate}&max_date=${endDate}`    { headers: getHeaders() }
  )

  if (!res.ok) throw new Error(`Mariana Tek API fejl: ${res.status}`)
  const data = await res.json()
  return data.data || []
}

// ── MEMBERS ──────────────────────────────────────────────────

export async function getMembers(): Promise<MTMember[]> {
  if (!IS_LIVE) {
    console.log('[MT API] Ikke konfigureret — returnerer mock data')
    return getMockMembers()
  }

  const res = await fetch(`${MT_BASE_URL}/memberships?status=active`, {
    headers: getHeaders(),
  })

  if (!res.ok) throw new Error(`Mariana Tek API fejl: ${res.status}`)
  const data = await res.json()
  return data.data || []
}

// ── HELPERS ──────────────────────────────────────────────────

export function getAgeFromDOB(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

export function isOver30(dateOfBirth: string): boolean {
  return getAgeFromDOB(dateOfBirth) >= 30
}

// ── MOCK DATA (bruges indtil API-nøgle er klar) ───────────────

function getMockClassSessions(): MTClassSession[] {
  // Matcher demo-dashboardets data præcist
  return [
    {
      id: 'mock-1',
      name: 'STRONG 07:00',
      start_datetime: '2026-05-04T07:00:00',
      instructor_id: 'mock-emma',
      instructor_name: 'Emma Rønning',
      capacity: 18,
      reservations: generateMockReservations(17, 11),
    },
    {
      id: 'mock-2',
      name: 'STRONG 17:30',
      start_datetime: '2026-05-04T17:30:00',
      instructor_id: 'mock-emma',
      instructor_name: 'Emma Rønning',
      capacity: 18,
      reservations: generateMockReservations(15, 9),
    },
    {
      id: 'mock-3',
      name: 'STRONG 06:30',
      start_datetime: '2026-05-06T06:30:00',
      instructor_id: 'mock-lukas',
      instructor_name: 'Lukas Berg',
      capacity: 18,
      reservations: generateMockReservations(11, 7),
    },
    {
      id: 'mock-4',
      name: 'STRONG 17:30',
      start_datetime: '2026-05-07T17:30:00',
      instructor_id: 'mock-lukas',
      instructor_name: 'Lukas Berg',
      capacity: 18,
      reservations: generateMockReservations(18, 12),
    },
    {
      id: 'mock-5',
      name: 'REVIVAL 09:00',
      start_datetime: '2026-05-04T09:00:00',
      instructor_id: 'mock-sofie',
      instructor_name: 'Sofie Munk',
      capacity: 18,
      reservations: generateMockReservations(12, 6),
    },
    {
      id: 'mock-6',
      name: 'REVIVAL 09:00',
      start_datetime: '2026-05-05T09:00:00',
      instructor_id: 'mock-sofie',
      instructor_name: 'Sofie Munk',
      capacity: 18,
      reservations: generateMockReservations(15, 8),
    },
    {
      id: 'mock-7',
      name: 'REVIVAL 18:00',
      start_datetime: '2026-05-07T18:00:00',
      instructor_id: 'mock-nikolaj',
      instructor_name: 'Nikolaj Holm',
      capacity: 18,
      reservations: generateMockReservations(14, 7),
    },
    {
      id: 'mock-8',
      name: 'REVIVAL 10:00',
      start_datetime: '2026-05-09T10:00:00',
      instructor_id: 'mock-nikolaj',
      instructor_name: 'Nikolaj Holm',
      capacity: 18,
      reservations: generateMockReservations(6, 3),
    },
  ]
}

function generateMockReservations(total: number, over30count: number): MTReservation[] {
  const reservations: MTReservation[] = []
  for (let i = 0; i < total; i++) {
    const isOver = i < over30count
    // Over 30: født 1985, Under 30: født 2000
    const dob = isOver ? '1985-06-15' : '2000-06-15'
    reservations.push({
      id: `mock-res-${Math.random()}`,
      customer_id: `mock-cust-${i}`,
      customer_name: `Kunde ${i + 1}`,
      date_of_birth: dob,
      status: 'confirmed',
    })
  }
  return reservations
}

function getMockMembers(): MTMember[] {
  return [
    { id: '1', name: 'Mock Medlem 1', email: 'test@test.com', date_of_birth: '1990-01-01', membership_type: 'Classes (30+)', membership_status: 'active', last_visit: '2026-05-01' },
  ]
}
