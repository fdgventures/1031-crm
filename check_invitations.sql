-- Проверить все приглашения
SELECT id, email, role_type, status, token, created_at, expires_at 
FROM admin_invitations 
ORDER BY created_at DESC;

-- Создать тестовое приглашение
INSERT INTO admin_invitations (email, role_type, invited_by)
SELECT 'test@example.com', 'admin', id 
FROM user_profiles 
WHERE email = 'fdgventures@gmail.com'
RETURNING token;

