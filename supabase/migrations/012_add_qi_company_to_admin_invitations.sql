-- Добавляем qi_company_id к admin_invitations
ALTER TABLE admin_invitations ADD COLUMN IF NOT EXISTS qi_company_id uuid REFERENCES qi_companies(id) ON DELETE CASCADE;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_admin_invitations_qi_company ON admin_invitations(qi_company_id);

-- Комментарий для понимания структуры
COMMENT ON COLUMN admin_invitations.qi_company_id IS 'QI company that admin will be assigned to';

