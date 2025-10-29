-- Добавляем колонку profile_id к таблице user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_id bigint;

-- Добавляем внешний ключ к таблице profile
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES profile(id) ON DELETE SET NULL;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_id ON user_profiles(profile_id);

