-- Fix EAT LLC Profile Access to use user_profiles instead of profile
-- Because admins are in user_profiles table, not in profile table

-- Drop existing table
DROP TABLE IF EXISTS eat_llc_profile_access CASCADE;

-- Recreate with correct reference
CREATE TABLE eat_llc_profile_access (
    id BIGSERIAL PRIMARY KEY,
    eat_llc_id BIGINT NOT NULL REFERENCES eat_llcs(id) ON DELETE CASCADE,
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE, -- Changed from profile_id
    
    -- Access level
    access_type TEXT DEFAULT 'signer' CHECK (access_type IN ('signer', 'viewer', 'manager')),
    
    -- When access was granted
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Unique constraint: one user can't have duplicate access
    UNIQUE(eat_llc_id, user_profile_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eat_llc_profile_access_eat_llc ON eat_llc_profile_access(eat_llc_id);
CREATE INDEX IF NOT EXISTS idx_eat_llc_profile_access_user_profile ON eat_llc_profile_access(user_profile_id);

-- RLS Policies
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

-- Add comments
COMMENT ON TABLE eat_llc_profile_access IS 'Admin users (from user_profiles) that have signing authority for EAT LLCs';
COMMENT ON COLUMN eat_llc_profile_access.user_profile_id IS 'Reference to user_profiles (admins), NOT profile table';
COMMENT ON COLUMN eat_llc_profile_access.access_type IS 'Type of access: signer (can sign docs), viewer (read-only), manager (full control)';

