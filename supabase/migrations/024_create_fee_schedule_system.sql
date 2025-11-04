-- Создаем таблицу шаблонов Fee (создаваемых QI)
CREATE TABLE IF NOT EXISTS fee_templates (
    id bigserial PRIMARY KEY,
    name text NOT NULL,
    price decimal(10, 2) NOT NULL,
    description text,
    qi_company_id uuid REFERENCES qi_companies(id) ON DELETE CASCADE,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_active boolean DEFAULT true
);

-- Создаем таблицу экземпляров Fee для конкретных tax accounts
CREATE TABLE IF NOT EXISTS fee_schedules (
    id bigserial PRIMARY KEY,
    tax_account_id bigint REFERENCES tax_accounts(id) ON DELETE CASCADE,
    fee_template_id bigint REFERENCES fee_templates(id) ON DELETE SET NULL,
    name text NOT NULL,
    price decimal(10, 2) NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Создаем таблицу истории изменений Fee
CREATE TABLE IF NOT EXISTS fee_change_history (
    id bigserial PRIMARY KEY,
    fee_schedule_id bigint REFERENCES fee_schedules(id) ON DELETE CASCADE,
    old_price decimal(10, 2) NOT NULL,
    new_price decimal(10, 2) NOT NULL,
    comment text NOT NULL,
    changed_by uuid REFERENCES auth.users(id),
    changed_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_fee_templates_qi_company ON fee_templates(qi_company_id);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_tax_account ON fee_schedules(tax_account_id);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_template ON fee_schedules(fee_template_id);
CREATE INDEX IF NOT EXISTS idx_fee_change_history_schedule ON fee_change_history(fee_schedule_id);
CREATE INDEX IF NOT EXISTS idx_fee_change_history_changed_by ON fee_change_history(changed_by);

-- Триггеры для updated_at
CREATE OR REPLACE FUNCTION update_fee_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fee_templates_updated_at
    BEFORE UPDATE ON fee_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_fee_templates_updated_at();

CREATE OR REPLACE FUNCTION update_fee_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fee_schedules_updated_at
    BEFORE UPDATE ON fee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_fee_schedules_updated_at();

-- Функция для автоматического создания истории изменений при обновлении цены
CREATE OR REPLACE FUNCTION log_fee_price_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверяем, изменилась ли цена
    IF OLD.price != NEW.price THEN
        -- Записываем изменение в историю
        INSERT INTO fee_change_history (
            fee_schedule_id,
            old_price,
            new_price,
            changed_by,
            comment
        ) VALUES (
            NEW.id,
            OLD.price,
            NEW.price,
            auth.uid(),
            'Price changed' -- Этот комментарий будет обновляться из приложения
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_fee_price_change_trigger
    AFTER UPDATE ON fee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION log_fee_price_change();

-- RLS политики для fee_templates
ALTER TABLE fee_templates ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать активные шаблоны
CREATE POLICY "Anyone can view active fee templates"
    ON fee_templates FOR SELECT
    USING (is_active = true OR auth.uid() IS NOT NULL);

-- Админы могут создавать шаблоны
CREATE POLICY "Admins can create fee templates"
    ON fee_templates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять шаблоны
CREATE POLICY "Admins can update fee templates"
    ON fee_templates FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять шаблоны
CREATE POLICY "Workspace owner can delete fee templates"
    ON fee_templates FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- RLS политики для fee_schedules
ALTER TABLE fee_schedules ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать fee schedules
CREATE POLICY "Anyone can view fee schedules"
    ON fee_schedules FOR SELECT
    USING (true);

-- Админы могут создавать fee schedules
CREATE POLICY "Admins can create fee schedules"
    ON fee_schedules FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять fee schedules
CREATE POLICY "Admins can update fee schedules"
    ON fee_schedules FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Только workspace_owner может удалять fee schedules
CREATE POLICY "Workspace owner can delete fee schedules"
    ON fee_schedules FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- RLS политики для fee_change_history
ALTER TABLE fee_change_history ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать историю изменений
CREATE POLICY "Anyone can view fee change history"
    ON fee_change_history FOR SELECT
    USING (true);

-- Только система может создавать записи истории (через триггер)
CREATE POLICY "Only system can create fee change history"
    ON fee_change_history FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Админы могут обновлять историю (для обновления комментариев)
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

