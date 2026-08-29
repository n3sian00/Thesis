-- Asiakkaan varaushetken kieli (sähköposti-ilmoituksia varten)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'fi';
