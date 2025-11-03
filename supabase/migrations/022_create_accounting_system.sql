-- Drop existing table and recreate (for clean migration)
DROP TABLE IF EXISTS accounting_entries CASCADE;

-- Create accounting_entries table
CREATE TABLE accounting_entries (
  id BIGSERIAL PRIMARY KEY,
  
  -- Core fields
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  credit DECIMAL(15, 2) DEFAULT 0,
  debit DECIMAL(15, 2) DEFAULT 0,
  description TEXT,
  
  -- Type of accounting entry
  entry_type TEXT NOT NULL DEFAULT 'manual',
  -- Possible types: 'sale_proceeds', 'purchase_funds', 'fees', 'earnest_money', 'manual', etc.
  
  -- Relations
  from_exchange_id BIGINT REFERENCES exchanges(id) ON DELETE SET NULL,
  to_exchange_id BIGINT REFERENCES exchanges(id) ON DELETE SET NULL,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE,
  task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- Settlement reference (if created from settlement)
  -- Note: We store the UUID as text since settlement_sellers/buyers use UUID
  settlement_seller_id UUID, -- References settlement_sellers(id) but not enforced via FK
  settlement_buyer_id UUID,  -- References settlement_buyers(id) but not enforced via FK
  settlement_type TEXT, -- 'seller' or 'buyer'
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for better query performance
CREATE INDEX idx_accounting_entries_transaction ON accounting_entries(transaction_id);
CREATE INDEX idx_accounting_entries_from_exchange ON accounting_entries(from_exchange_id);
CREATE INDEX idx_accounting_entries_to_exchange ON accounting_entries(to_exchange_id);
CREATE INDEX idx_accounting_entries_task ON accounting_entries(task_id);
CREATE INDEX idx_accounting_entries_settlement_seller ON accounting_entries(settlement_seller_id);
CREATE INDEX idx_accounting_entries_settlement_buyer ON accounting_entries(settlement_buyer_id);
CREATE INDEX idx_accounting_entries_date ON accounting_entries(date);
CREATE INDEX idx_accounting_entries_type ON accounting_entries(entry_type);

-- Enable RLS
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view accounting entries" ON accounting_entries;
DROP POLICY IF EXISTS "Allow authenticated users to create accounting entries" ON accounting_entries;
DROP POLICY IF EXISTS "Allow authenticated users to update accounting entries" ON accounting_entries;
DROP POLICY IF EXISTS "Allow authenticated users to delete accounting entries" ON accounting_entries;

-- Policy: Allow authenticated users to view all accounting entries
CREATE POLICY "Allow authenticated users to view accounting entries"
  ON accounting_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to create accounting entries
CREATE POLICY "Allow authenticated users to create accounting entries"
  ON accounting_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update accounting entries
CREATE POLICY "Allow authenticated users to update accounting entries"
  ON accounting_entries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to delete accounting entries
CREATE POLICY "Allow authenticated users to delete accounting entries"
  ON accounting_entries
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_accounting_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on accounting_entries
DROP TRIGGER IF EXISTS set_accounting_entries_updated_at ON accounting_entries;
CREATE TRIGGER set_accounting_entries_updated_at
  BEFORE UPDATE ON accounting_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_accounting_entries_updated_at();

-- Add comment to table
COMMENT ON TABLE accounting_entries IS 'Accounting entries for tracking debits, credits, and fund movements in transactions and exchanges';
COMMENT ON COLUMN accounting_entries.entry_type IS 'Type of entry: sale_proceeds, purchase_funds, fees, earnest_money, manual, etc.';
COMMENT ON COLUMN accounting_entries.from_exchange_id IS 'Source exchange (where funds come from)';
COMMENT ON COLUMN accounting_entries.to_exchange_id IS 'Destination exchange (where funds go to)';
COMMENT ON COLUMN accounting_entries.settlement_seller_id IS 'Reference to settlement_sellers if entry was auto-created from seller';
COMMENT ON COLUMN accounting_entries.settlement_buyer_id IS 'Reference to settlement_buyers if entry was auto-created from buyer';

