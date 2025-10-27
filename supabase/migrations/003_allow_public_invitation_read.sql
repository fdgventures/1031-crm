-- Разрешаем всем читать приглашения (для регистрации по приглашению)
CREATE POLICY "Allow public to read invitations by token"
    ON admin_invitations FOR SELECT
    USING (true);

