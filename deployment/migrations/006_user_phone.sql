-- 006_user_phone.sql
-- Basic profile expansion (phone number) requested for the user directory.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
