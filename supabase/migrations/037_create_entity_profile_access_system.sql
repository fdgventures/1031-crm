-- Create Entity Profile Access System
-- This extends the existing entities table with profile access management

-- =============================================
-- 1. Entity Profile Access Table
-- =============================================
CREATE TABLE IF NOT EXISTS entity_profile_access (
    id BIGSERIAL PRIMARY KEY,
    entity_id BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    tax_account_id BIGINT NOT NULL REFERENCES tax_accounts(id) ON DELETE CASCADE,
    
    -- Relationship type
    relationship TEXT NOT NULL CHECK (relationship IN (
        'Manager',
        'Trustee',
        'Owner/Member',
        'Managing Member',
        'Beneficiary'
    )),
    
    -- Permissions
    has_signing_authority BOOLEAN DEFAULT false,
    is_main_contact BOOLEAN DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Unique constraint: same tax account can't be added twice to same entity
    UNIQUE(entity_id, tax_account_id)
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_entity_profile_access_entity ON entity_profile_access(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_profile_access_tax_account ON entity_profile_access(tax_account_id);
CREATE INDEX IF NOT EXISTS idx_entity_profile_access_relationship ON entity_profile_access(relationship);
CREATE INDEX IF NOT EXISTS idx_entity_profile_access_signing ON entity_profile_access(has_signing_authority);
CREATE INDEX IF NOT EXISTS idx_entity_profile_access_main_contact ON entity_profile_access(is_main_contact);

-- =============================================
-- Trigger for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_entity_profile_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS entity_profile_access_updated_at ON entity_profile_access;
CREATE TRIGGER entity_profile_access_updated_at
    BEFORE UPDATE ON entity_profile_access
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_profile_access_updated_at();

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE entity_profile_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view entity profile access" ON entity_profile_access;
CREATE POLICY "Anyone can view entity profile access"
    ON entity_profile_access FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can create entity profile access" ON entity_profile_access;
CREATE POLICY "Admins can create entity profile access"
    ON entity_profile_access FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update entity profile access" ON entity_profile_access;
CREATE POLICY "Admins can update entity profile access"
    ON entity_profile_access FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can delete entity profile access" ON entity_profile_access;
CREATE POLICY "Admins can delete entity profile access"
    ON entity_profile_access FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE entity_profile_access IS 'Links tax accounts (people) to entities (companies) with roles and permissions';
COMMENT ON COLUMN entity_profile_access.relationship IS 'Type of relationship: Manager, Trustee, Owner/Member, Managing Member, Beneficiary';
COMMENT ON COLUMN entity_profile_access.has_signing_authority IS 'Whether this person can sign documents for the entity';
COMMENT ON COLUMN entity_profile_access.is_main_contact IS 'Whether this person is the main contact for the entity';

