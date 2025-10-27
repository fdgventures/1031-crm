-- Добавляем колонку email в таблицу profile
ALTER TABLE profile 
ADD COLUMN IF NOT EXISTS email text;

