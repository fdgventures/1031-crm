-- Создаем таблицу properties для хранения недвижимости
CREATE TABLE IF NOT EXISTS properties (
    id bigserial PRIMARY KEY,
    address text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Создаем индекс для быстрого поиска по адресу
CREATE INDEX IF NOT EXISTS idx_properties_address ON properties(address);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_properties_updated_at();

-- RLS политики
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Все могут читать properties
CREATE POLICY "Anyone can view properties"
    ON properties FOR SELECT
    USING (true);

-- Только админы могут создавать properties
CREATE POLICY "Admins can create properties"
    ON properties FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только админы могут обновлять properties
CREATE POLICY "Admins can update properties"
    ON properties FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять properties
CREATE POLICY "Workspace owner can delete properties"
    ON properties FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- Добавляем комментарии
COMMENT ON TABLE properties IS 'Stores property/real estate information';
COMMENT ON COLUMN properties.address IS 'Property address';


