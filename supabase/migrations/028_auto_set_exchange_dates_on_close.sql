-- Add actual_close_date to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS actual_close_date date;

-- Create index for actual_close_date
CREATE INDEX IF NOT EXISTS idx_transactions_actual_close_date ON transactions(actual_close_date);

-- Function to automatically set exchange dates when transaction closes
CREATE OR REPLACE FUNCTION auto_set_exchange_dates_on_transaction_close()
RETURNS TRIGGER AS $$
DECLARE
  close_date date;
  exchange_record RECORD;
BEGIN
  -- Only proceed if status changed to 'Closed'
  IF NEW.status = 'Closed' AND (OLD.status IS NULL OR OLD.status != 'Closed') THEN
    
    -- Determine which close date to use
    -- Priority: actual_close_date > estimated_close_date > current date
    IF NEW.actual_close_date IS NOT NULL THEN
      close_date := NEW.actual_close_date;
    ELSIF NEW.estimated_close_date IS NOT NULL THEN
      close_date := NEW.estimated_close_date;
    ELSE
      close_date := CURRENT_DATE;
    END IF;
    
    -- Find all exchanges linked to this transaction as 'Sale' type
    FOR exchange_record IN
      SELECT DISTINCT e.id
      FROM exchanges e
      INNER JOIN exchange_transactions et ON et.exchange_id = e.id
      WHERE et.transaction_id = NEW.id
        AND et.transaction_type = 'Sale'
    LOOP
      -- Update exchange with calculated dates
      UPDATE exchanges
      SET 
        relinquished_close_date = close_date,
        day_45_date = close_date + INTERVAL '45 days',
        day_180_date = close_date + INTERVAL '180 days'
      WHERE id = exchange_record.id;
      
      -- Log the update
      RAISE NOTICE 'Updated exchange % with relinquished_close_date: %, 45-day: %, 180-day: %',
        exchange_record.id,
        close_date,
        close_date + INTERVAL '45 days',
        close_date + INTERVAL '180 days';
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS trigger_auto_set_exchange_dates ON transactions;

CREATE TRIGGER trigger_auto_set_exchange_dates
  AFTER UPDATE OF status, actual_close_date, estimated_close_date ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_exchange_dates_on_transaction_close();

-- Add comment
COMMENT ON COLUMN transactions.actual_close_date IS 'Actual closing date when transaction status changed to Closed. Used to calculate 45-day and 180-day deadlines for 1031 exchange';
COMMENT ON FUNCTION auto_set_exchange_dates_on_transaction_close IS 'Automatically sets relinquished_close_date, day_45_date, and day_180_date in exchanges when a Sale transaction is marked as Closed';

