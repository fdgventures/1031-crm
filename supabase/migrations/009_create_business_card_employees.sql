-- Создаем таблицу для связи employees с business cards
CREATE TABLE IF NOT EXISTS business_card_employees (
    id bigserial PRIMARY KEY,
    business_card_id bigint NOT NULL REFERENCES business_cards(id) ON DELETE CASCADE,
    profile_id bigint NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
    branch_id bigint REFERENCES branches(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(business_card_id, profile_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_business_card_employees_business_card_id 
ON business_card_employees(business_card_id);

CREATE INDEX IF NOT EXISTS idx_business_card_employees_profile_id 
ON business_card_employees(profile_id);

CREATE INDEX IF NOT EXISTS idx_business_card_employees_branch_id 
ON business_card_employees(branch_id);

-- RLS политики
ALTER TABLE business_card_employees ENABLE ROW LEVEL SECURITY;

-- Все могут читать employees
CREATE POLICY "Anyone can view business_card_employees"
    ON business_card_employees FOR SELECT
    USING (true);

-- Только админы могут добавлять employees
CREATE POLICY "Admins can create business_card_employees"
    ON business_card_employees FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только админы могут обновлять employees
CREATE POLICY "Admins can update business_card_employees"
    ON business_card_employees FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять employees
CREATE POLICY "Workspace owner can delete business_card_employees"
    ON business_card_employees FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- Комментарии
COMMENT ON TABLE business_card_employees IS 'Links employees (profiles) to business cards and branches';
COMMENT ON COLUMN business_card_employees.business_card_id IS 'Reference to business card';
COMMENT ON COLUMN business_card_employees.profile_id IS 'Reference to employee profile';
COMMENT ON COLUMN business_card_employees.branch_id IS 'Reference to branch (optional)';

