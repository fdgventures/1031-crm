-- Создаем таблицу property_ownership для хранения владельцев недвижимости
CREATE TABLE IF NOT EXISTS property_ownership (
    id bigserial PRIMARY KEY,
    property_id bigint NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    ownership_type text NOT NULL CHECK (ownership_type IN ('pending', 'current', 'prior')),
    tax_account_id bigint REFERENCES tax_accounts(id) ON DELETE SET NULL,
    vesting_name text,
    non_exchange_name text,
    transaction_id bigint REFERENCES transactions(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы для property_ownership
CREATE INDEX IF NOT EXISTS idx_property_ownership_property ON property_ownership(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_type ON property_ownership(ownership_type);
CREATE INDEX IF NOT EXISTS idx_property_ownership_tax_account ON property_ownership(tax_account_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_transaction ON property_ownership(transaction_id);

-- Триггер для обновления updated_at в property_ownership
CREATE OR REPLACE FUNCTION update_property_ownership_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_ownership_updated_at
    BEFORE UPDATE ON property_ownership
    FOR EACH ROW
    EXECUTE FUNCTION update_property_ownership_updated_at();

-- RLS политики для property_ownership
ALTER TABLE property_ownership ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать
CREATE POLICY "Anyone can view property ownership"
    ON property_ownership FOR SELECT
    USING (true);

-- Админы могут создавать
CREATE POLICY "Admins can create property ownership"
    ON property_ownership FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять
CREATE POLICY "Admins can update property ownership"
    ON property_ownership FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять
CREATE POLICY "Workspace owner can delete property ownership"
    ON property_ownership FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

