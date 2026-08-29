-- Yrityksen kieli (ohjaa dashboardin ja julkisen varaussivun oletuskielen)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'fi';
