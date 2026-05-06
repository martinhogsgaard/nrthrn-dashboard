# NRTHRN STRONG — Ledelsesdashboard

Intern ledelses- og lønplatform for NRTHRN Strong.

## Tech Stack
- **Next.js 14** (App Router)
- **Supabase** (database + auth)
- **Vercel** (hosting)
- **Mariana Tek API** (data — kobles til når API-nøgle modtages)

---

## Opsætning

### 1. Klon repo
```bash
git clone https://github.com/[din-bruger]/nrthrn-dashboard.git
cd nrthrn-dashboard
npm install
```

### 2. Opret Supabase projekt
1. Gå til [supabase.com](https://supabase.com) og opret nyt projekt
2. Gå til **SQL Editor** og kør hele filen `supabase/migrations/001_initial_schema.sql`
3. Gå til **Settings → API** og kopiér URL og anon key

### 3. Miljøvariabler
```bash
cp .env.local.template .env.local
```
Udfyld `.env.local` med Supabase URL og anon key.

Lad `MARIANA_TEK_API_KEY` og `MARIANA_TEK_SUBDOMAIN` stå tomme indtil API-nøgle modtages — mock-data bruges automatisk.

### 4. Opret login-bruger i Supabase
Gå til **Authentication → Users → Invite user** og inviter ejerens email.

### 5. Kør lokalt
```bash
npm run dev
```
Åbn [http://localhost:3000](http://localhost:3000)

---

## Deploy til Vercel
1. Push til GitHub
2. Importer repo på [vercel.com](https://vercel.com)
3. Tilføj environment variables i Vercel (samme som .env.local)
4. Deploy

---

## Mariana Tek API (kobles til senere)
Når API-nøgle modtages fra Mariana Tek:
1. Tilføj `MARIANA_TEK_API_KEY` og `MARIANA_TEK_SUBDOMAIN` i Vercel environment variables
2. Dashboardet skifter automatisk fra mock-data til live data

API-klienten ligger i `lib/mariana-tek.ts`.

---

## Struktur
```
app/
  api/
    instructors/    → CRUD på instruktører
    salary-rates/   → Gem/opdater lønsatser
    payroll/        → Lønberegning (MT data + Supabase satser)
  login/            → Login side
  dashboard/        → Beskyttede dashboard-sider
lib/
  supabase/         → Supabase klient (browser + server)
  mariana-tek.ts    → Mariana Tek API klient + mock data
  payroll.ts        → Lønberegningslogik
supabase/
  migrations/       → Database schema
```
