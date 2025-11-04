-- ⚡ ИСПРАВЛЕНИЕ RLS ДЛЯ UPDATE fee_change_history ⚡

-- 1. Проверка существующих политик UPDATE
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'fee_change_history'
AND cmd = 'UPDATE';

-- 2. Удаляем старые политики UPDATE (если есть)
DROP POLICY IF EXISTS "Only system can update fee change history" ON fee_change_history;
DROP POLICY IF EXISTS "Admins can update fee change history" ON fee_change_history;

-- 3. Создаем правильную политику для UPDATE
-- Админы могут обновлять историю (для обновления комментариев)
CREATE POLICY "Admins can update fee change history"
    ON fee_change_history FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- 4. Проверка - попробуйте обновить комментарий
-- SELECT id, comment FROM fee_change_history ORDER BY changed_at DESC LIMIT 1;
-- UPDATE fee_change_history SET comment = 'Test update' WHERE id = [ID из предыдущего запроса];
-- SELECT id, comment FROM fee_change_history WHERE id = [ID];

-- 5. Проверка всех политик для fee_change_history
SELECT 
    policyname,
    cmd,
    permissive,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'fee_change_history'
ORDER BY cmd, policyname;

