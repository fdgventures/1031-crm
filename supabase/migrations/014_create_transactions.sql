-- Создаем таблицу transactions
CREATE TABLE IF NOT EXISTS transactions (
    id bigserial PRIMARY KEY,
    transaction_number text UNIQUE NOT NULL,
    contract_purchase_price numeric(15, 2) NOT NULL,
    contract_date date NOT NULL,
    pdf_contract_url text,
    sale_type text NOT NULL CHECK (sale_type IN ('Property', 'Entity')),
    closing_agent_profile_id bigint REFERENCES profile(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Создаем таблицу transaction_sellers для sellers
CREATE TABLE IF NOT EXISTS transaction_sellers (
    id bigserial PRIMARY KEY,
    transaction_id bigint NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tax_account_id bigint REFERENCES tax_accounts(id) ON DELETE SET NULL,
    vesting_name text,
    contract_percent numeric(5, 2) NOT NULL DEFAULT 0,
    non_exchange_name text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Создаем таблицу transaction_buyers для buyers
CREATE TABLE IF NOT EXISTS transaction_buyers (
    id bigserial PRIMARY KEY,
    transaction_id bigint NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    profile_id bigint REFERENCES profile(id) ON DELETE SET NULL,
    contract_percent numeric(5, 2) NOT NULL DEFAULT 0,
    non_exchange_name text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_number ON transactions(transaction_number);
CREATE INDEX IF NOT EXISTS idx_transactions_sale_type ON transactions(sale_type);
CREATE INDEX IF NOT EXISTS idx_transactions_closing_agent ON transactions(closing_agent_profile_id);
CREATE INDEX IF NOT EXISTS idx_transaction_sellers_transaction ON transaction_sellers(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_sellers_tax_account ON transaction_sellers(tax_account_id);
CREATE INDEX IF NOT EXISTS idx_transaction_buyers_transaction ON transaction_buyers(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_buyers_profile ON transaction_buyers(profile_id);

-- Триггер для автоматического обновления updated_at в transactions
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transactions_updated_at();

-- RLS политики для transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать
CREATE POLICY "Anyone can view transactions"
    ON transactions FOR SELECT
    USING (true);

-- Админы могут создавать
CREATE POLICY "Admins can create transactions"
    ON transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять
CREATE POLICY "Admins can update transactions"
    ON transactions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять
CREATE POLICY "Workspace owner can delete transactions"
    ON transactions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- RLS политики для transaction_sellers
ALTER TABLE transaction_sellers ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать
CREATE POLICY "Anyone can view transaction sellers"
    ON transaction_sellers FOR SELECT
    USING (true);

-- Админы могут создавать
CREATE POLICY "Admins can create transaction sellers"
    ON transaction_sellers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять
CREATE POLICY "Admins can update transaction sellers"
    ON transaction_sellers FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять
CREATE POLICY "Workspace owner can delete transaction sellers"
    ON transaction_sellers FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- RLS политики для transaction_buyers
ALTER TABLE transaction_buyers ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать
CREATE POLICY "Anyone can view transaction buyers"
    ON transaction_buyers FOR SELECT
    USING (true);

-- Админы могут создавать
CREATE POLICY "Admins can create transaction buyers"
    ON transaction_buyers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять
CREATE POLICY "Admins can update transaction buyers"
    ON transaction_buyers FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять
CREATE POLICY "Workspace owner can delete transaction buyers"
    ON transaction_buyers FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

