-- Add new fields to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS estimated_close_date date;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending';

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Add comment to document the status field
COMMENT ON COLUMN transactions.status IS 'Transaction status: Pending (default), On-Hold, Closed, Canceled';
COMMENT ON COLUMN transactions.estimated_close_date IS 'Estimated closing date for the transaction';

