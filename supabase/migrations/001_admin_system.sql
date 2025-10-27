-- Добавляем новое поле role_type в user_profiles и обновляем схему
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS role_type text;

-- Создаем таблицу для приглашений админов
CREATE TABLE IF NOT EXISTS admin_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    role text NOT NULL DEFAULT 'admin',
    role_type text NOT NULL DEFAULT 'platform_super_admin',
    invited_by uuid REFERENCES user_profiles(id),
    token text UNIQUE NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- Обновляем существующие записи
UPDATE user_profiles 
SET role_type = CASE 
    WHEN email = 'fdgventures@gmail.com' THEN 'workspace_owner'
    WHEN role = 'platform_super_admin' THEN 'platform_super_admin'
    ELSE 'admin'
END;

-- Устанавливаем fdgventures@gmail.com как единственного workspace_owner
UPDATE user_profiles 
SET role = 'platform_super_admin',
    role_type = 'workspace_owner'
WHERE email = 'fdgventures@gmail.com';

-- Ограничение: только один workspace_owner
CREATE UNIQUE INDEX IF NOT EXISTS unique_workspace_owner 
ON user_profiles(role_type) 
WHERE role_type = 'workspace_owner';

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_type 
ON user_profiles(role_type);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_email 
ON admin_invitations(email);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_token 
ON admin_invitations(token);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_status 
ON admin_invitations(status);

-- RLS политики для admin_invitations
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Владелец workspace и супер админы могут видеть все приглашения
CREATE POLICY "Workspace owner can view all invitations"
    ON admin_invitations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin')
        )
    );

-- Только владелец и супер админы могут создавать приглашения
CREATE POLICY "Only workspace owner and super admins can create invitations"
    ON admin_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin')
        )
    );

-- Только владелец может удалять приглашения
CREATE POLICY "Only workspace owner can delete invitations"
    ON admin_invitations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- Функция для автоматической генерации токена при создании приглашения
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Применяем функцию для генерации токена
ALTER TABLE admin_invitations 
ALTER COLUMN token SET DEFAULT generate_invitation_token();

