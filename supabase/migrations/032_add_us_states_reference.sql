-- Create reference table for US States (for dropdowns)

CREATE TABLE IF NOT EXISTS us_states (
    code TEXT PRIMARY KEY, -- Two-letter state code (e.g., 'CA', 'TX')
    name TEXT NOT NULL,    -- Full state name (e.g., 'California', 'Texas')
    is_popular_for_llc BOOLEAN DEFAULT false -- Popular states for LLC formation
);

-- Insert all US states
INSERT INTO us_states (code, name, is_popular_for_llc) VALUES
    ('AL', 'Alabama', false),
    ('AK', 'Alaska', false),
    ('AZ', 'Arizona', false),
    ('AR', 'Arkansas', false),
    ('CA', 'California', false),
    ('CO', 'Colorado', false),
    ('CT', 'Connecticut', false),
    ('DE', 'Delaware', true),  -- Popular for LLCs
    ('FL', 'Florida', true),   -- Popular for LLCs
    ('GA', 'Georgia', false),
    ('HI', 'Hawaii', false),
    ('ID', 'Idaho', false),
    ('IL', 'Illinois', false),
    ('IN', 'Indiana', false),
    ('IA', 'Iowa', false),
    ('KS', 'Kansas', false),
    ('KY', 'Kentucky', false),
    ('LA', 'Louisiana', false),
    ('ME', 'Maine', false),
    ('MD', 'Maryland', false),
    ('MA', 'Massachusetts', false),
    ('MI', 'Michigan', false),
    ('MN', 'Minnesota', false),
    ('MS', 'Mississippi', false),
    ('MO', 'Missouri', false),
    ('MT', 'Montana', false),
    ('NE', 'Nebraska', false),
    ('NV', 'Nevada', true),    -- Popular for LLCs
    ('NH', 'New Hampshire', false),
    ('NJ', 'New Jersey', false),
    ('NM', 'New Mexico', false),
    ('NY', 'New York', false),
    ('NC', 'North Carolina', false),
    ('ND', 'North Dakota', false),
    ('OH', 'Ohio', false),
    ('OK', 'Oklahoma', false),
    ('OR', 'Oregon', false),
    ('PA', 'Pennsylvania', false),
    ('RI', 'Rhode Island', false),
    ('SC', 'South Carolina', false),
    ('SD', 'South Dakota', false),
    ('TN', 'Tennessee', false),
    ('TX', 'Texas', true),     -- Popular for LLCs
    ('UT', 'Utah', false),
    ('VT', 'Vermont', false),
    ('VA', 'Virginia', false),
    ('WA', 'Washington', false),
    ('WV', 'West Virginia', false),
    ('WI', 'Wisconsin', false),
    ('WY', 'Wyoming', true);   -- Popular for LLCs

-- Create index for popular states
CREATE INDEX IF NOT EXISTS idx_us_states_popular ON us_states(is_popular_for_llc);

-- Add comment
COMMENT ON TABLE us_states IS 'Reference table for US states, used in dropdowns for LLC formation and licensing';
COMMENT ON COLUMN us_states.is_popular_for_llc IS 'Popular states for LLC formation (DE, FL, NV, TX, WY) due to favorable laws';

