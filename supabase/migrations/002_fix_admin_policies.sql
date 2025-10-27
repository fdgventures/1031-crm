-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Workspace owner can view all invitations" ON admin_invitations;
DROP POLICY IF EXISTS "Only workspace owner and super admins can create invitations" ON admin_invitations;
DROP POLICY IF EXISTS "Only workspace owner can delete invitations" ON admin_invitations;

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

