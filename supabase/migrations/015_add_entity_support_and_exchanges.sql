-- Создаем отдельную таблицу entities для компаний
CREATE TABLE IF NOT EXISTS entities (
    id bigserial PRIMARY KEY,
    name text NOT NULL,
    email text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы для entities
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_email ON entities(email);

-- Триггер для обновления updated_at в entities
CREATE OR REPLACE FUNCTION update_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW
    EXECUTE FUNCTION update_entities_updated_at();

-- RLS политики для entities
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать
CREATE POLICY "Anyone can view entities"
    ON entities FOR SELECT
    USING (true);

-- Админы могут создавать
CREATE POLICY "Admins can create entities"
    ON entities FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять
CREATE POLICY "Admins can update entities"
    ON entities FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять
CREATE POLICY "Workspace owner can delete entities"
    ON entities FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- Добавляем account_number к tax_accounts
ALTER TABLE tax_accounts ADD COLUMN IF NOT EXISTS account_number text UNIQUE;
-- Добавляем entity_id к tax_accounts для связи с entities
ALTER TABLE tax_accounts ADD COLUMN IF NOT EXISTS entity_id bigint REFERENCES entities(id) ON DELETE CASCADE;

-- Индексы для tax_accounts
CREATE INDEX IF NOT EXISTS idx_tax_accounts_account_number ON tax_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_tax_accounts_entity_id ON tax_accounts(entity_id);

-- Создаем таблицу exchanges
CREATE TABLE IF NOT EXISTS exchanges (
    id bigserial PRIMARY KEY,
    exchange_number text UNIQUE NOT NULL,
    tax_account_id bigint NOT NULL REFERENCES tax_accounts(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Создаем таблицу exchange_transactions для связи exchanges с transactions
CREATE TABLE IF NOT EXISTS exchange_transactions (
    id bigserial PRIMARY KEY,
    exchange_id bigint NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
    transaction_id bigint NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    transaction_type text NOT NULL CHECK (transaction_type IN ('Sale', 'Purchase')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы для exchanges
CREATE INDEX IF NOT EXISTS idx_exchanges_exchange_number ON exchanges(exchange_number);
CREATE INDEX IF NOT EXISTS idx_exchanges_tax_account ON exchanges(tax_account_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_exchange ON exchange_transactions(exchange_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_transaction ON exchange_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_type ON exchange_transactions(transaction_type);

-- Триггер для обновления updated_at в exchanges
CREATE OR REPLACE FUNCTION update_exchanges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exchanges_updated_at
    BEFORE UPDATE ON exchanges
    FOR EACH ROW
    EXECUTE FUNCTION update_exchanges_updated_at();

-- RLS политики для exchanges
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать
CREATE POLICY "Anyone can view exchanges"
    ON exchanges FOR SELECT
    USING (true);

-- Админы могут создавать
CREATE POLICY "Admins can create exchanges"
    ON exchanges FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять
CREATE POLICY "Admins can update exchanges"
    ON exchanges FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять
CREATE POLICY "Workspace owner can delete exchanges"
    ON exchanges FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- RLS политики для exchange_transactions
ALTER TABLE exchange_transactions ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать
CREATE POLICY "Anyone can view exchange transactions"
    ON exchange_transactions FOR SELECT
    USING (true);

-- Админы могут создавать
CREATE POLICY "Admins can create exchange transactions"
    ON exchange_transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять
CREATE POLICY "Admins can update exchange transactions"
    ON exchange_transactions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять
CREATE POLICY "Workspace owner can delete exchange transactions"
    ON exchange_transactions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

