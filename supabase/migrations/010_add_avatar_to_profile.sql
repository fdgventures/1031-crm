-- Добавляем поле avatar_url к таблице profile
ALTER TABLE profile ADD COLUMN IF NOT EXISTS avatar_url text;

-- Создаем индекс
CREATE INDEX IF NOT EXISTS idx_profile_avatar ON profile(avatar_url);

