-- Create identified_properties table for 1031 exchange property identification
CREATE TABLE IF NOT EXISTS identified_properties (
  id BIGSERIAL PRIMARY KEY,
  exchange_id BIGINT NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  property_id BIGINT REFERENCES properties(id) ON DELETE SET NULL,
  
  -- Identification details
  identification_type TEXT NOT NULL CHECK (identification_type IN ('written_form', 'by_contract')),
  property_type TEXT NOT NULL CHECK (property_type IN ('standard_address', 'dst', 'membership_interest')),
  
  -- Property details
  description TEXT,
  status TEXT DEFAULT 'identified',
  percentage NUMERIC(5, 2), -- Percentage ownership/allocation
  value NUMERIC(15, 2), -- Property value in dollars
  identification_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Flags
  is_parked BOOLEAN DEFAULT false,
  
  -- Document reference
  document_storage_path TEXT, -- Path to uploaded identification document
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create property_improvements table for improvements to identified properties
CREATE TABLE IF NOT EXISTS property_improvements (
  id BIGSERIAL PRIMARY KEY,
  identified_property_id BIGINT NOT NULL REFERENCES identified_properties(id) ON DELETE CASCADE,
  
  -- Improvement details
  description TEXT NOT NULL,
  value NUMERIC(15, 2) NOT NULL, -- Cost/value of improvement
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_identified_properties_exchange ON identified_properties(exchange_id);
CREATE INDEX IF NOT EXISTS idx_identified_properties_property ON identified_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_identified_properties_type ON identified_properties(identification_type);
CREATE INDEX IF NOT EXISTS idx_identified_properties_status ON identified_properties(status);
CREATE INDEX IF NOT EXISTS idx_property_improvements_identified_property ON property_improvements(identified_property_id);

-- Trigger for updated_at on identified_properties
CREATE OR REPLACE FUNCTION update_identified_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER identified_properties_updated_at
  BEFORE UPDATE ON identified_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_identified_properties_updated_at();

-- Trigger for updated_at on property_improvements
CREATE OR REPLACE FUNCTION update_property_improvements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_improvements_updated_at
  BEFORE UPDATE ON property_improvements
  FOR EACH ROW
  EXECUTE FUNCTION update_property_improvements_updated_at();

-- RLS Policies for identified_properties
ALTER TABLE identified_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view identified properties"
  ON identified_properties FOR SELECT
  USING (true);

CREATE POLICY "Admins can create identified properties"
  ON identified_properties FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update identified properties"
  ON identified_properties FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete identified properties"
  ON identified_properties FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
    )
  );

-- RLS Policies for property_improvements
ALTER TABLE property_improvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view property improvements"
  ON property_improvements FOR SELECT
  USING (true);

CREATE POLICY "Admins can create property improvements"
  ON property_improvements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update property improvements"
  ON property_improvements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete property improvements"
  ON property_improvements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
    )
  );

-- Comments
COMMENT ON TABLE identified_properties IS '1031 Exchange identified replacement properties';
COMMENT ON COLUMN identified_properties.identification_type IS 'Type: written_form or by_contract';
COMMENT ON COLUMN identified_properties.property_type IS 'Type: standard_address, dst, or membership_interest';
COMMENT ON COLUMN identified_properties.is_parked IS 'Whether property is parked';
COMMENT ON TABLE property_improvements IS 'Improvements to identified properties affecting final value';

