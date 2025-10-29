-- Создаем таблицу business_cards
CREATE TABLE IF NOT EXISTS business_cards (
    id bigserial PRIMARY KEY,
    business_name text NOT NULL,
    logo_url text,
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Создаем таблицу branches
CREATE TABLE IF NOT EXISTS branches (
    id bigserial PRIMARY KEY,
    business_card_id bigint NOT NULL REFERENCES business_cards(id) ON DELETE CASCADE,
    branch_name text NOT NULL,
    state text NOT NULL,
    address text NOT NULL,
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_business_cards_business_name ON business_cards(business_name);
CREATE INDEX IF NOT EXISTS idx_business_cards_email ON business_cards(email);
CREATE INDEX IF NOT EXISTS idx_branches_business_card_id ON branches(business_card_id);
CREATE INDEX IF NOT EXISTS idx_branches_state ON branches(state);

-- Триггер для автоматического обновления updated_at в business_cards
CREATE OR REPLACE FUNCTION update_business_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_cards_updated_at
    BEFORE UPDATE ON business_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_business_cards_updated_at();

-- Триггер для автоматического обновления updated_at в branches
CREATE OR REPLACE FUNCTION update_branches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_branches_updated_at();

-- RLS политики для business_cards
ALTER TABLE business_cards ENABLE ROW LEVEL SECURITY;

-- Все могут читать business_cards
CREATE POLICY "Anyone can view business_cards"
    ON business_cards FOR SELECT
    USING (true);

-- Только админы могут создавать business_cards
CREATE POLICY "Admins can create business_cards"
    ON business_cards FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только админы могут обновлять business_cards
CREATE POLICY "Admins can update business_cards"
    ON business_cards FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять business_cards
CREATE POLICY "Workspace owner can delete business_cards"
    ON business_cards FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- RLS политики для branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Все могут читать branches
CREATE POLICY "Anyone can view branches"
    ON branches FOR SELECT
    USING (true);

-- Только админы могут создавать branches
CREATE POLICY "Admins can create branches"
    ON branches FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только админы могут обновлять branches
CREATE POLICY "Admins can update branches"
    ON branches FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять branches
CREATE POLICY "Workspace owner can delete branches"
    ON branches FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- Комментарии
COMMENT ON TABLE business_cards IS 'Stores business card information';
COMMENT ON TABLE branches IS 'Stores branch information for business cards';
COMMENT ON COLUMN business_cards.business_name IS 'Name of the business';
COMMENT ON COLUMN business_cards.logo_url IS 'URL to logo image';
COMMENT ON COLUMN branches.business_card_id IS 'Reference to parent business card';
COMMENT ON COLUMN branches.branch_name IS 'Name of the branch';
COMMENT ON COLUMN branches.state IS 'State where branch is located';
COMMENT ON COLUMN branches.address IS 'Full address of the branch';

