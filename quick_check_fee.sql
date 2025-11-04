-- БЫСТРАЯ ПРОВЕРКА FEE SCHEDULE SYSTEM
-- Выполните это в Supabase SQL Editor

-- 1. Проверка существования таблиц
SELECT 
    'fee_templates exists' as check_status,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'fee_templates'
    ) as result;

SELECT 
    'fee_schedules exists' as check_status,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'fee_schedules'
    ) as result;

-- 2. Количество активных Fee Templates
SELECT 
    'Active Fee Templates Count' as info,
    COUNT(*) as count
FROM fee_templates
WHERE is_active = true;

-- 3. Все Fee Templates
SELECT 
    'All Fee Templates:' as info,
    id, 
    name, 
    price, 
    is_active,
    created_at
FROM fee_templates
ORDER BY created_at DESC;

-- 4. Fee Schedules для Tax Account ID = 13
SELECT 
    'Fee Schedules for Tax Account 13:' as info,
    id,
    name,
    price,
    description,
    fee_template_id,
    created_at
FROM fee_schedules
WHERE tax_account_id = 13
ORDER BY created_at;

-- 5. Все Tax Accounts (последние 5)
SELECT 
    'Recent Tax Accounts:' as info,
    id,
    name,
    created_at
FROM tax_accounts
ORDER BY created_at DESC
LIMIT 5;

