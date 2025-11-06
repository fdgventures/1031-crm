-- Add eat_parked_file_id to accounting_entries table

ALTER TABLE accounting_entries 
ADD COLUMN IF NOT EXISTS eat_parked_file_id BIGINT REFERENCES eat_parked_files(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_accounting_entries_eat_parked_file 
ON accounting_entries(eat_parked_file_id);

-- Update comment
COMMENT ON COLUMN accounting_entries.eat_parked_file_id IS 'Link to EAT Parked File if entry is related to EAT';

