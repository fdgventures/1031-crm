-- Add Improvement Timeline fields to eat_parked_files table

ALTER TABLE eat_parked_files
ADD COLUMN IF NOT EXISTS improvement_start_date DATE,
ADD COLUMN IF NOT EXISTS improvement_estimated_completion_date DATE,
ADD COLUMN IF NOT EXISTS improvement_actual_completion_date DATE;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_eat_parked_files_improvement_dates 
ON eat_parked_files(improvement_start_date, improvement_estimated_completion_date, improvement_actual_completion_date);

-- Update comments
COMMENT ON COLUMN eat_parked_files.improvement_start_date IS 'Start date for construction/improvements';
COMMENT ON COLUMN eat_parked_files.improvement_estimated_completion_date IS 'Estimated completion date for improvements';
COMMENT ON COLUMN eat_parked_files.improvement_actual_completion_date IS 'Actual completion date for improvements';

