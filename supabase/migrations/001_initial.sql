-- ============================================================
-- KauneusAI — alkuperäinen tietokantarakenne
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- TAULUT
-- ------------------------------------------------------------

CREATE TABLE businesses (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT        NOT NULL,
  slug               TEXT        NOT NULL UNIQUE,
  city               TEXT,
  cancellation_hours INT         NOT NULL DEFAULT 24,
  theme              TEXT        NOT NULL DEFAULT 'pink',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE services (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id      UUID         NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             TEXT         NOT NULL,
  duration_minutes INT          NOT NULL,
  price            DECIMAL(10,2) NOT NULL,
  active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE bookings (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id    UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id     UUID        NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  customer_name  TEXT        NOT NULL,
  customer_email TEXT        NOT NULL,
  customer_phone TEXT,
  starts_at      TIMESTAMPTZ NOT NULL,
  ends_at        TIMESTAMPTZ NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'confirmed',
  reminder_sent  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE waitlist (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id    UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id     UUID        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  customer_name  TEXT        NOT NULL,
  customer_email TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- INDEKSIT
-- ------------------------------------------------------------

CREATE INDEX idx_businesses_slug     ON businesses(slug);
CREATE INDEX idx_businesses_user_id  ON businesses(user_id);
CREATE INDEX idx_services_business   ON services(business_id);
CREATE INDEX idx_bookings_business   ON bookings(business_id);
CREATE INDEX idx_bookings_starts_at  ON bookings(starts_at);
CREATE INDEX idx_bookings_reminder   ON bookings(reminder_sent, starts_at)
  WHERE reminder_sent = FALSE AND status = 'confirmed';
CREATE INDEX idx_waitlist_business   ON waitlist(business_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE services   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist   ENABLE ROW LEVEL SECURITY;

-- BUSINESSES
-- Kaikki voivat lukea yrityksen perustiedot (tarvitaan slug-sivulle)
CREATE POLICY "businesses_public_select" ON businesses
  FOR SELECT USING (TRUE);

-- Vain omistaja voi luoda/muokata/poistaa yritystään
CREATE POLICY "businesses_owner_insert" ON businesses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "businesses_owner_update" ON businesses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "businesses_owner_delete" ON businesses
  FOR DELETE USING (auth.uid() = user_id);

-- SERVICES
-- Julkiset käyttäjät näkevät vain aktiiviset palvelut
CREATE POLICY "services_public_select" ON services
  FOR SELECT USING (active = TRUE);

-- Omistaja hallitsee kaikkia palveluitaan (myös ei-aktiivisia)
CREATE POLICY "services_owner_all" ON services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = services.business_id
        AND b.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = services.business_id
        AND b.user_id = auth.uid()
    )
  );

-- BOOKINGS
-- Kuka tahansa voi luoda varauksen (chatbot-asiakkaat)
CREATE POLICY "bookings_public_insert" ON bookings
  FOR INSERT WITH CHECK (TRUE);

-- Omistaja näkee ja hallitsee oman yrityksensä varaukset
CREATE POLICY "bookings_owner_select" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = bookings.business_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "bookings_owner_update" ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = bookings.business_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "bookings_owner_delete" ON bookings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = bookings.business_id
        AND b.user_id = auth.uid()
    )
  );

-- WAITLIST
-- Kuka tahansa voi liittyä jonotuslistalle
CREATE POLICY "waitlist_public_insert" ON waitlist
  FOR INSERT WITH CHECK (TRUE);

-- Omistaja näkee ja hallitsee jonotuslistaa
CREATE POLICY "waitlist_owner_select" ON waitlist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = waitlist.business_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "waitlist_owner_delete" ON waitlist
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = waitlist.business_id
        AND b.user_id = auth.uid()
    )
  );