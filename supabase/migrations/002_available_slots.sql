-- ============================================================
-- Aikaikkunat — yrittäjä määrittelee varattavissa olevat ajat
-- Jokainen rivi = yksi aikaikkuna tietylle päivälle
-- Esim. "2025-04-07 09:00-12:00" ja "2025-04-07 13:00-17:00"
-- ============================================================

CREATE TABLE available_slots (
  id          UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID  NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date        DATE  NOT NULL,
  start_time  TIME  NOT NULL,
  end_time    TIME  NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Loppuajan oltava alkuajan jälkeen
  CONSTRAINT valid_window  CHECK (end_time > start_time),
  -- Aikaikkunan oltava vähintään 30 minuuttia
  CONSTRAINT min_30min     CHECK (end_time - start_time >= INTERVAL '30 minutes')
);

-- Estetään täsmälleen identtiset ikkunat samalle yritykselle ja päivälle
CREATE UNIQUE INDEX idx_slots_unique_window
  ON available_slots (business_id, date, start_time, end_time);

-- Nopea haku päivämäärän ja yrityksen perusteella
CREATE INDEX idx_slots_business_date
  ON available_slots (business_id, date);

ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;

-- Vain oman yrityksen omistaja hallitsee aikaikkunoita
-- (admin client käytetään kirjautumattomien API-kutsujen kautta)
CREATE POLICY "slots_owner_all" ON available_slots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = available_slots.business_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = available_slots.business_id
        AND b.user_id = auth.uid()
    )
  );
