-- Создаем таблицу tax_accounts
CREATE TABLE IF NOT EXISTS tax_accounts (
    id bigserial PRIMARY KEY,
    name text NOT NULL,
    profile_id bigint REFERENCES profile(id) ON DELETE CASCADE,
    qi_company_id uuid REFERENCES qi_companies(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Создаем таблицу business_names
CREATE TABLE IF NOT EXISTS business_names (
    id bigserial PRIMARY KEY,
    name text NOT NULL,
    tax_account_id bigint REFERENCES tax_accounts(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Добавляем business_name_id к properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS business_name_id bigint REFERENCES business_names(id) ON DELETE SET NULL;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_tax_accounts_profile ON tax_accounts(profile_id);
CREATE INDEX IF NOT EXISTS idx_tax_accounts_qi_company ON tax_accounts(qi_company_id);
CREATE INDEX IF NOT EXISTS idx_business_names_tax_account ON business_names(tax_account_id);
CREATE INDEX IF NOT EXISTS idx_properties_business_name ON properties(business_name_id);

-- Триггеры для updated_at
CREATE OR REPLACE FUNCTION update_tax_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tax_accounts_updated_at
    BEFORE UPDATE ON tax_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_tax_accounts_updated_at();

CREATE OR REPLACE FUNCTION update_business_names_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_names_updated_at
    BEFORE UPDATE ON business_names
    FOR EACH ROW
    EXECUTE FUNCTION update_business_names_updated_at();

-- RLS политики для tax_accounts
ALTER TABLE tax_accounts ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать
CREATE POLICY "Anyone can view tax accounts"
    ON tax_accounts FOR SELECT
    USING (true);

-- Админы могут создавать
CREATE POLICY "Admins can create tax accounts"
    ON tax_accounts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять
CREATE POLICY "Admins can update tax accounts"
    ON tax_accounts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять
CREATE POLICY "Workspace owner can delete tax accounts"
    ON tax_accounts FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- RLS политики для business_names
ALTER TABLE business_names ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать
CREATE POLICY "Anyone can view business names"
    ON business_names FOR SELECT
    USING (true);

-- Админы могут создавать
CREATE POLICY "Admins can create business names"
    ON business_names FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять
CREATE POLICY "Admins can update business names"
    ON business_names FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять
CREATE POLICY "Workspace owner can delete business names"
    ON business_names FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

