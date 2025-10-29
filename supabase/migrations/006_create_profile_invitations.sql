-- Создаем таблицу для приглашений пользователей к профилям
CREATE TABLE IF NOT EXISTS profile_invitations (
    id bigserial PRIMARY KEY,
    profile_id bigint NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
    email text NOT NULL,
    token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    invited_by uuid REFERENCES user_profiles(id),
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_profile_invitations_profile_id 
ON profile_invitations(profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_invitations_email 
ON profile_invitations(email);

CREATE INDEX IF NOT EXISTS idx_profile_invitations_token 
ON profile_invitations(token);

CREATE INDEX IF NOT EXISTS idx_profile_invitations_status 
ON profile_invitations(status);

-- RLS политики для profile_invitations
ALTER TABLE profile_invitations ENABLE ROW LEVEL SECURITY;

-- Все могут читать активные приглашения по токену (для страницы регистрации)
CREATE POLICY "Anyone can view invitation by token"
    ON profile_invitations FOR SELECT
    USING (
        status = 'pending' 
        AND expires_at > now()
    );

-- Админы и владелец workspace могут создавать приглашения
CREATE POLICY "Admins can create profile invitations"
    ON profile_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять приглашения
CREATE POLICY "Admins can update profile invitations"
    ON profile_invitations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Workspace owner может удалять приглашения
CREATE POLICY "Workspace owner can delete profile invitations"
    ON profile_invitations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- Добавляем комментарии
COMMENT ON TABLE profile_invitations IS 'Хранит приглашения для регистрации пользователей и привязки к профилям';
COMMENT ON COLUMN profile_invitations.profile_id IS 'ID профиля, к которому будет привязан новый пользователь';
COMMENT ON COLUMN profile_invitations.email IS 'Email приглашенного пользователя';
COMMENT ON COLUMN profile_invitations.token IS 'Уникальный токен для регистрации';
COMMENT ON COLUMN profile_invitations.status IS 'Статус: pending, accepted, expired';

