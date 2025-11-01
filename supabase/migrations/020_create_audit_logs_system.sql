-- Создаем таблицу audit_logs для хранения истории изменений
CREATE TABLE IF NOT EXISTS audit_logs (
    id bigserial PRIMARY KEY,
    
    -- Тип и ID объекта, который был изменен
    entity_type text NOT NULL CHECK (entity_type IN ('profile', 'tax_account', 'transaction', 'exchange', 'eat', 'property', 'business_card', 'task')),
    entity_id bigint NOT NULL,
    
    -- Тип действия
    action_type text NOT NULL CHECK (action_type IN ('create', 'update', 'delete')),
    
    -- Название поля которое изменилось (для update)
    field_name text,
    
    -- Старое и новое значение (JSON для сложных типов)
    old_value text,
    new_value text,
    
    -- Кто совершил изменение
    changed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Дополнительные метаданные (опционально)
    metadata jsonb,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы для audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);

-- RLS политики для audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать логи
CREATE POLICY "Anyone can view audit logs"
    ON audit_logs FOR SELECT
    USING (true);

-- Только система может создавать логи (через триггеры или админы)
CREATE POLICY "Admins can create audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Запрещаем обновление и удаление логов (immutable)
-- Логи должны быть неизменяемыми для целостности аудита

-- Функция для форматирования имени поля в читаемый вид
CREATE OR REPLACE FUNCTION format_field_name(field text)
RETURNS text AS $$
BEGIN
    RETURN CASE 
        WHEN field = 'first_name' THEN 'First Name'
        WHEN field = 'last_name' THEN 'Last Name'
        WHEN field = 'email' THEN 'Email'
        WHEN field = 'phone' THEN 'Phone'
        WHEN field = 'address' THEN 'Address'
        WHEN field = 'status' THEN 'Status'
        WHEN field = 'due_date' THEN 'Due Date'
        WHEN field = 'title' THEN 'Title'
        WHEN field = 'name' THEN 'Name'
        WHEN field = 'account_number' THEN 'Account Number'
        WHEN field = 'contract_purchase_price' THEN 'Purchase Price'
        WHEN field = 'contract_date' THEN 'Contract Date'
        WHEN field = 'transaction_number' THEN 'Transaction Number'
        WHEN field = 'exchange_number' THEN 'Exchange Number'
        ELSE REPLACE(INITCAP(field), '_', ' ')
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Представление для удобного отображения логов с информацией о пользователях
CREATE OR REPLACE VIEW audit_logs_view AS
SELECT 
    al.id,
    al.entity_type,
    al.entity_id,
    al.action_type,
    al.field_name,
    format_field_name(al.field_name) as field_display_name,
    al.old_value,
    al.new_value,
    al.changed_by,
    al.metadata,
    al.created_at,
    up.role_type as changed_by_role,
    COALESCE(
        p.first_name || ' ' || p.last_name,
        'System'
    ) as changed_by_name
FROM audit_logs al
LEFT JOIN user_profiles up ON al.changed_by = up.id
LEFT JOIN profile p ON p.user_id = up.id;

-- Комментарии для документации
COMMENT ON TABLE audit_logs IS 'Audit log table for tracking all changes to entities';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity that was changed';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the entity that was changed';
COMMENT ON COLUMN audit_logs.action_type IS 'Type of action: create, update, or delete';
COMMENT ON COLUMN audit_logs.field_name IS 'Name of the field that was changed (for updates)';
COMMENT ON COLUMN audit_logs.old_value IS 'Previous value before the change';
COMMENT ON COLUMN audit_logs.new_value IS 'New value after the change';
COMMENT ON COLUMN audit_logs.changed_by IS 'User who made the change';

