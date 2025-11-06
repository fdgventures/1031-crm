-- Add spousal tax account support

-- Add fields to tax_accounts table
ALTER TABLE tax_accounts ADD COLUMN IF NOT EXISTS is_spousal boolean DEFAULT false;
ALTER TABLE tax_accounts ADD COLUMN IF NOT EXISTS spouse_profile_id bigint REFERENCES profile(id) ON DELETE SET NULL;
ALTER TABLE tax_accounts ADD COLUMN IF NOT EXISTS primary_profile_id bigint;

-- Create index for spouse lookups
CREATE INDEX IF NOT EXISTS idx_tax_accounts_spouse_profile ON tax_accounts(spouse_profile_id);
CREATE INDEX IF NOT EXISTS idx_tax_accounts_primary_profile ON tax_accounts(primary_profile_id);

-- Add comment
COMMENT ON COLUMN tax_accounts.is_spousal IS 'True if this is a spousal/joint tax account';
COMMENT ON COLUMN tax_accounts.spouse_profile_id IS 'Reference to spouse profile for spousal accounts';
COMMENT ON COLUMN tax_accounts.primary_profile_id IS 'Primary profile ID (for clarity in spousal accounts)';

-- Update existing tax accounts to have primary_profile_id = profile_id
UPDATE tax_accounts 
SET primary_profile_id = profile_id 
WHERE primary_profile_id IS NULL AND profile_id IS NOT NULL;

