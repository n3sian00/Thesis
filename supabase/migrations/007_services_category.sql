-- Lisää vapaaehtoinen kategoriakenttä palveluille (esim. ripset, kynnet, kulmat)
ALTER TABLE services ADD COLUMN IF NOT EXISTS category TEXT;
