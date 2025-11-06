-- Create EAT LLC system for parking properties in 1031 Exchange

-- Create EAT LLCs table
CREATE TABLE IF NOT EXISTS eat_llcs (
    id BIGSERIAL PRIMARY KEY,
    
    -- Basic Information
    company_name TEXT NOT NULL,
    eat_number TEXT UNIQUE, -- Auto-generated: EAT-[State]-[Sequence]
    
    -- Formation Details
    state_formation TEXT NOT NULL, -- State where LLC was formed
    date_formation DATE NOT NULL,
    licensed_in TEXT, -- State where LLC is licensed to operate
    
    -- EIN and legal
    ein TEXT, -- Employer Identification Number
    registered_agent TEXT,
    registered_agent_address TEXT,
    
    -- QI Company (who manages this EAT)
    qi_company_id UUID REFERENCES qi_companies(id) ON DELETE SET NULL,
    
    -- Status
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Dissolved')),
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create EAT LLC Profile Access (many-to-many)
-- Admins who have signing authority for this EAT LLC
CREATE TABLE IF NOT EXISTS eat_llc_profile_access (
    id BIGSERIAL PRIMARY KEY,
    eat_llc_id BIGINT NOT NULL REFERENCES eat_llcs(id) ON DELETE CASCADE,
    profile_id BIGINT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
    
    -- Access level
    access_type TEXT DEFAULT 'signer' CHECK (access_type IN ('signer', 'viewer', 'manager')),
    
    -- When access was granted
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Unique constraint: one profile can't have duplicate access
    UNIQUE(eat_llc_id, profile_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eat_llcs_eat_number ON eat_llcs(eat_number);
CREATE INDEX IF NOT EXISTS idx_eat_llcs_qi_company ON eat_llcs(qi_company_id);
CREATE INDEX IF NOT EXISTS idx_eat_llcs_state_formation ON eat_llcs(state_formation);
CREATE INDEX IF NOT EXISTS idx_eat_llcs_status ON eat_llcs(status);
CREATE INDEX IF NOT EXISTS idx_eat_llc_profile_access_eat_llc ON eat_llc_profile_access(eat_llc_id);
CREATE INDEX IF NOT EXISTS idx_eat_llc_profile_access_profile ON eat_llc_profile_access(profile_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_eat_llcs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER eat_llcs_updated_at
    BEFORE UPDATE ON eat_llcs
    FOR EACH ROW
    EXECUTE FUNCTION update_eat_llcs_updated_at();

-- RLS Policies for eat_llcs
ALTER TABLE eat_llcs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Anyone can view EAT LLCs"
    ON eat_llcs FOR SELECT
    USING (true);

-- Admins can create
CREATE POLICY "Admins can create EAT LLCs"
    ON eat_llcs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Admins can update
CREATE POLICY "Admins can update EAT LLCs"
    ON eat_llcs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Only workspace_owner can delete
CREATE POLICY "Workspace owner can delete EAT LLCs"
    ON eat_llcs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- RLS Policies for eat_llc_profile_access
ALTER TABLE eat_llc_profile_access ENABLE ROW LEVEL SECURITY;

-- All can view
CREATE POLICY "Anyone can view EAT LLC profile access"
    ON eat_llc_profile_access FOR SELECT
    USING (true);

-- Admins can grant access
CREATE POLICY "Admins can grant EAT LLC profile access"
    ON eat_llc_profile_access FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Admins can revoke access
CREATE POLICY "Admins can revoke EAT LLC profile access"
    ON eat_llc_profile_access FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Function to generate EAT number
CREATE OR REPLACE FUNCTION generate_eat_number(state_code TEXT)
RETURNS TEXT AS $$
DECLARE
    sequence_num INTEGER;
    eat_num TEXT;
BEGIN
    -- Get count of EATs in this state
    SELECT COUNT(*) + 1 INTO sequence_num
    FROM eat_llcs
    WHERE state_formation = state_code;
    
    -- Format: EAT-[STATE]-[000]
    eat_num := 'EAT-' || state_code || '-' || LPAD(sequence_num::TEXT, 3, '0');
    
    RETURN eat_num;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE eat_llcs IS 'Exchange Accommodation Titleholder LLCs for parking properties in 1031 Exchange';
COMMENT ON COLUMN eat_llcs.company_name IS 'Legal name of the EAT LLC';
COMMENT ON COLUMN eat_llcs.eat_number IS 'Auto-generated EAT identifier: EAT-[STATE]-[SEQ]';
COMMENT ON COLUMN eat_llcs.state_formation IS 'State where LLC was formed (e.g., DE, WY, NV)';
COMMENT ON COLUMN eat_llcs.date_formation IS 'Date when LLC was formed';
COMMENT ON COLUMN eat_llcs.licensed_in IS 'State where LLC is licensed to do business';
COMMENT ON COLUMN eat_llcs.status IS 'Current status: Active, Inactive, or Dissolved';

COMMENT ON TABLE eat_llc_profile_access IS 'Profiles that have signing authority for EAT LLCs';
COMMENT ON COLUMN eat_llc_profile_access.access_type IS 'Type of access: signer (can sign docs), viewer (read-only), manager (full control)';

