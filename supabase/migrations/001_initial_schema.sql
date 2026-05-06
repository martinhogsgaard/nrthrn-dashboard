-- ============================================================
-- NRTHRN STRONG Dashboard — Supabase Schema
-- ============================================================

-- Kør denne fil i Supabase SQL Editor

-- ── INSTRUCTORS ──────────────────────────────────────────────
-- Gemmer instruktørers stamdata og lønsatser
-- Kobles til Mariana Tek via mariana_tek_id når API er klar

CREATE TABLE IF NOT EXISTS instructors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Stamdata (udfyldes manuelt eller synkroniseres fra Mariana Tek)
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  email TEXT,
  mariana_tek_id TEXT UNIQUE, -- Kobles til MT når API er klar

  -- Klassificering
  level TEXT NOT NULL CHECK (level IN ('junior', 'senior')),
  employment_type TEXT NOT NULL CHECK (employment_type IN ('employed', 'freelance')),

  -- Aktiv status
  is_active BOOLEAN DEFAULT TRUE
);

-- ── SALARY_RATES ─────────────────────────────────────────────
-- Individuelle lønsatser pr. instruktør pr. lønperiode
-- Gør det muligt at ændre satser over tid uden at miste historik

CREATE TABLE IF NOT EXISTS salary_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,

  -- Gyldighedsperiode — NULL means current
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,

  -- Timepris pr. hold
  rate_per_class INTEGER NOT NULL, -- kr.

  -- Bonusstruktur (trappemodel)
  -- Tier 1: 0-threshold_1 deltagere = 0 kr. bonus
  -- Tier 2: threshold_1+1 til threshold_2 deltagere = bonus_tier_2 kr./deltager
  -- Tier 3: threshold_2+1 til threshold_3 deltagere = bonus_tier_3 kr./deltager
  -- Tier 4: threshold_3+ deltagere = bonus_tier_4 kr./deltager
  bonus_threshold_1 INTEGER NOT NULL DEFAULT 8,
  bonus_threshold_2 INTEGER NOT NULL DEFAULT 12,
  bonus_threshold_3 INTEGER NOT NULL DEFAULT 15,
  bonus_tier_2 INTEGER NOT NULL DEFAULT 0, -- kr. pr. deltager i tier 2
  bonus_tier_3 INTEGER NOT NULL DEFAULT 0, -- kr. pr. deltager i tier 3
  bonus_tier_4 INTEGER NOT NULL DEFAULT 0  -- kr. pr. deltager i tier 4
);

-- ── PAYROLL_PERIODS ──────────────────────────────────────────
-- Lønperioder — bruges til at låse og eksportere lønkørsler

CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'exported')),
  exported_to_economic_at TIMESTAMPTZ,
  notes TEXT,

  UNIQUE(period_start, period_end)
);

-- ── PAYROLL_LINES ─────────────────────────────────────────────
-- Individuelle lønlinjer pr. instruktør pr. lønperiode
-- Gemmer det beregnede beløb så det ikke ændres bagefter

CREATE TABLE IF NOT EXISTS payroll_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES instructors(id),

  -- Tal fra Mariana Tek
  sessions_count INTEGER NOT NULL DEFAULT 0,
  total_participants INTEGER NOT NULL DEFAULT 0,
  participants_over_30 INTEGER NOT NULL DEFAULT 0,
  participants_under_30 INTEGER NOT NULL DEFAULT 0,

  -- Beregnet løn
  rate_per_class INTEGER NOT NULL,
  time_total INTEGER NOT NULL DEFAULT 0,   -- kr. timepris i alt
  bonus_total INTEGER NOT NULL DEFAULT 0,  -- kr. bonus i alt
  subtotal INTEGER NOT NULL DEFAULT 0,     -- kr. før moms

  -- Kun relevant for freelance
  is_freelance BOOLEAN NOT NULL DEFAULT FALSE,
  vat_split_pct NUMERIC(5,2),  -- % over 30 = momspligtig andel
  vat_amount INTEGER,          -- kr. moms at tillægge
  invoice_total INTEGER        -- kr. faktura inkl. moms
);

-- ── SETTINGS ─────────────────────────────────────────────────
-- Globale indstillinger — fx standard bonussatser pr. niveau

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indsæt standard bonussatser
INSERT INTO settings (key, value) VALUES
  ('default_rates_junior', '{
    "rate_per_class": 300,
    "bonus_threshold_1": 8,
    "bonus_threshold_2": 12,
    "bonus_threshold_3": 15,
    "bonus_tier_2": 15,
    "bonus_tier_3": 25,
    "bonus_tier_4": 35
  }'),
  ('default_rates_senior', '{
    "rate_per_class": 500,
    "bonus_threshold_1": 8,
    "bonus_threshold_2": 12,
    "bonus_threshold_3": 15,
    "bonus_tier_2": 20,
    "bonus_tier_3": 35,
    "bonus_tier_4": 50
  }')
ON CONFLICT (key) DO NOTHING;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
-- Kun autentificerede brugere kan læse/skrive

ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Kun authenticated users
CREATE POLICY "authenticated_only" ON instructors FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "authenticated_only" ON salary_rates FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "authenticated_only" ON payroll_periods FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "authenticated_only" ON payroll_lines FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "authenticated_only" ON settings FOR ALL TO authenticated USING (TRUE);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER instructors_updated_at
  BEFORE UPDATE ON instructors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SEED DATA (demo instruktører) ─────────────────────────────
-- Kan slettes når rigtige instruktører er oprettet

INSERT INTO instructors (name, initials, level, employment_type) VALUES
  ('Emma Rønning',  'ER', 'senior', 'employed'),
  ('Lukas Berg',    'LB', 'senior', 'freelance'),
  ('Sofie Munk',    'SM', 'junior', 'employed'),
  ('Nikolaj Holm',  'NH', 'junior', 'freelance')
ON CONFLICT DO NOTHING;

-- Indsæt lønsatser for seed-instruktørerne
INSERT INTO salary_rates (instructor_id, rate_per_class, bonus_threshold_1, bonus_threshold_2, bonus_threshold_3, bonus_tier_2, bonus_tier_3, bonus_tier_4)
SELECT id, 
  CASE level WHEN 'senior' THEN 500 ELSE 300 END,
  8, 12, 15,
  CASE level WHEN 'senior' THEN 20 ELSE 15 END,
  CASE level WHEN 'senior' THEN 35 ELSE 25 END,
  CASE level WHEN 'senior' THEN 50 ELSE 35 END
FROM instructors
ON CONFLICT DO NOTHING;
