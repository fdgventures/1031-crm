-- ⚡ Добавление ТОЛЬКО политики UPDATE для fee_change_history ⚡
-- Этот скрипт безопасен для повторного выполнения

-- 1. Сначала проверим, существует ли политика
SELECT 
    'Checking existing UPDATE policy...' as step,
    COUNT(*) as policy_exists
FROM pg_policies
WHERE tablename = 'fee_change_history'
AND cmd = 'UPDATE';

-- 2. Удаляем политику, если она уже существует (чтобы пересоздать правильно)
DROP POLICY IF EXISTS "Admins can update fee change history" ON fee_change_history;

-- 3. Создаем политику UPDATE
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

-- 4. Проверка результата
SELECT 
    '✅ Policy created successfully!' as result,
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'fee_change_history'
AND cmd = 'UPDATE';

-- 5. Все политики для fee_change_history
SELECT 
    'All policies for fee_change_history:' as info,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'fee_change_history'
ORDER BY cmd, policyname;

