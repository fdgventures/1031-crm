-- Add new fields to exchanges table
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS relinquished_close_date date;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS day_45_date date;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS day_180_date date;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS total_sale_property_value numeric(15, 2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS total_replacement_property numeric(15, 2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS value_remaining numeric(15, 2);

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_exchanges_status ON exchanges(status);

-- Add comment to document the status field
COMMENT ON COLUMN exchanges.status IS 'Exchange status. Default is Pending';

