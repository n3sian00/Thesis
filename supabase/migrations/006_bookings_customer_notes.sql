-- Lisää vapaaehtoinen lisätietokenttä asiakkaan varaukseen (esim. allergiat, toiveet)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_notes TEXT;
