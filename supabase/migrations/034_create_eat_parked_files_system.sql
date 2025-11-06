-- Create EAT Parked Files System for managing EAT transactions and parking

-- =============================================
-- 1. EAT Parked Files (Main Table)
-- =============================================
CREATE TABLE IF NOT EXISTS eat_parked_files (
    id BIGSERIAL PRIMARY KEY,
    
    -- Basic Information
    eat_number TEXT UNIQUE NOT NULL, -- EAT-[FirstName3Letters]-[StateAbbr]-[Year]-[Seq]
    eat_name TEXT NOT NULL,
    eat_llc_id BIGINT REFERENCES eat_llcs(id) ON DELETE SET NULL,
    
    -- Financial Information
    total_acquired_property_value NUMERIC(15, 2) DEFAULT 0,
    total_invoice_value NUMERIC(15, 2) DEFAULT 0,
    total_parked_property_value NUMERIC(15, 2) DEFAULT 0,
    total_sale_property_value NUMERIC(15, 2) DEFAULT 0,
    value_remaining NUMERIC(15, 2) DEFAULT 0,
    
    -- Important Dates
    day_45_date DATE,
    day_180_date DATE,
    close_date DATE,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    state TEXT NOT NULL, -- State abbreviation
    
    -- QI Company (who manages this EAT)
    qi_company_id UUID REFERENCES qi_companies(id) ON DELETE SET NULL,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =============================================
-- 2. EAT Exchangors (Tax Accounts linked to EAT)
-- =============================================
CREATE TABLE IF NOT EXISTS eat_exchangors (
    id BIGSERIAL PRIMARY KEY,
    eat_parked_file_id BIGINT NOT NULL REFERENCES eat_parked_files(id) ON DELETE CASCADE,
    tax_account_id BIGINT NOT NULL REFERENCES tax_accounts(id) ON DELETE CASCADE,
    
    -- Additional info
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Unique constraint: same tax account can't be added twice to same EAT
    UNIQUE(eat_parked_file_id, tax_account_id)
);

-- =============================================
-- 3. Secretary of State / LLC Monitoring
-- =============================================
CREATE TABLE IF NOT EXISTS eat_secretary_of_state (
    id BIGSERIAL PRIMARY KEY,
    eat_parked_file_id BIGINT NOT NULL REFERENCES eat_parked_files(id) ON DELETE CASCADE,
    
    -- Fields
    transfer_type TEXT,
    eat_transfer_to_exchangor_transaction_date DATE,
    eat_sos_status TEXT CHECK (eat_sos_status IN (
        'EAT in OPUS name - Active',
        'EAT Transferred to taxpayer',
        'EAT Disolved'
    )),
    eat_client_touchback_date DATE,
    eat_sos_dissolve_transfer_date DATE,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Only one record per EAT
    UNIQUE(eat_parked_file_id)
);

-- =============================================
-- 4. EAT Transactions (links to transactions)
-- =============================================
CREATE TABLE IF NOT EXISTS eat_transactions (
    id BIGSERIAL PRIMARY KEY,
    eat_parked_file_id BIGINT NOT NULL REFERENCES eat_parked_files(id) ON DELETE CASCADE,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'EAT Acquisition',
        'Sale Transaction by Exchangor',
        'EAT to Exchangor'
    )),
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Unique constraint: same transaction can't be linked twice with same type
    UNIQUE(eat_parked_file_id, transaction_id, transaction_type)
);

-- =============================================
-- 5. EAT Identified Properties (like exchange identified properties)
-- =============================================
CREATE TABLE IF NOT EXISTS eat_identified_properties (
    id BIGSERIAL PRIMARY KEY,
    eat_parked_file_id BIGINT NOT NULL REFERENCES eat_parked_files(id) ON DELETE CASCADE,
    property_id BIGINT REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Identification details
    identification_type TEXT NOT NULL CHECK (identification_type IN ('written_form', 'by_contract')),
    property_type TEXT NOT NULL CHECK (property_type IN ('standard_address', 'dst', 'membership_interest')),
    
    -- Property details
    description TEXT,
    status TEXT DEFAULT 'identified',
    percentage NUMERIC(5, 2),
    value NUMERIC(15, 2),
    identification_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Flags
    is_parked BOOLEAN DEFAULT false,
    
    -- Document reference
    document_storage_path TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =============================================
-- 6. EAT Property Improvements
-- =============================================
CREATE TABLE IF NOT EXISTS eat_property_improvements (
    id BIGSERIAL PRIMARY KEY,
    eat_identified_property_id BIGINT NOT NULL REFERENCES eat_identified_properties(id) ON DELETE CASCADE,
    
    -- Improvement details
    description TEXT NOT NULL,
    value NUMERIC(15, 2) NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 7. EAT Lender Information
-- =============================================
CREATE TABLE IF NOT EXISTS eat_lenders (
    id BIGSERIAL PRIMARY KEY,
    eat_parked_file_id BIGINT NOT NULL REFERENCES eat_parked_files(id) ON DELETE CASCADE,
    
    -- Lender Information
    loan_to_value_ratio TEXT,
    lender_business_card_id BIGINT REFERENCES business_cards(id) ON DELETE SET NULL,
    lender_note_amount NUMERIC(15, 2),
    lender_note_date DATE,
    lender_document_path TEXT, -- Storage path for uploaded document
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Only one lender record per EAT
    UNIQUE(eat_parked_file_id)
);

-- =============================================
-- 8. EAT Invoices (Construction Information)
-- =============================================
CREATE TABLE IF NOT EXISTS eat_invoices (
    id BIGSERIAL PRIMARY KEY,
    eat_parked_file_id BIGINT NOT NULL REFERENCES eat_parked_files(id) ON DELETE CASCADE,
    
    -- Invoice Information
    invoice_type TEXT NOT NULL CHECK (invoice_type IN (
        'Invoice paid through exchange',
        'Invoice paid outside of exchange'
    )),
    paid_to TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    invoice_number TEXT,
    invoice_document_path TEXT, -- Storage path for uploaded invoice
    
    -- Calculated total (from invoice items)
    total_amount NUMERIC(15, 2) DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =============================================
-- 9. EAT Invoice Items
-- =============================================
CREATE TABLE IF NOT EXISTS eat_invoice_items (
    id BIGSERIAL PRIMARY KEY,
    eat_invoice_id BIGINT NOT NULL REFERENCES eat_invoices(id) ON DELETE CASCADE,
    
    -- Link to property from EAT Acquisition transaction
    property_id BIGINT REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Item details
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_eat_parked_files_eat_number ON eat_parked_files(eat_number);
CREATE INDEX IF NOT EXISTS idx_eat_parked_files_eat_llc ON eat_parked_files(eat_llc_id);
CREATE INDEX IF NOT EXISTS idx_eat_parked_files_status ON eat_parked_files(status);
CREATE INDEX IF NOT EXISTS idx_eat_parked_files_state ON eat_parked_files(state);
CREATE INDEX IF NOT EXISTS idx_eat_parked_files_qi_company ON eat_parked_files(qi_company_id);

CREATE INDEX IF NOT EXISTS idx_eat_exchangors_eat ON eat_exchangors(eat_parked_file_id);
CREATE INDEX IF NOT EXISTS idx_eat_exchangors_tax_account ON eat_exchangors(tax_account_id);

CREATE INDEX IF NOT EXISTS idx_eat_secretary_of_state_eat ON eat_secretary_of_state(eat_parked_file_id);

CREATE INDEX IF NOT EXISTS idx_eat_transactions_eat ON eat_transactions(eat_parked_file_id);
CREATE INDEX IF NOT EXISTS idx_eat_transactions_transaction ON eat_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_eat_transactions_type ON eat_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_eat_identified_properties_eat ON eat_identified_properties(eat_parked_file_id);
CREATE INDEX IF NOT EXISTS idx_eat_identified_properties_property ON eat_identified_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_eat_identified_properties_type ON eat_identified_properties(identification_type);

CREATE INDEX IF NOT EXISTS idx_eat_property_improvements_property ON eat_property_improvements(eat_identified_property_id);

CREATE INDEX IF NOT EXISTS idx_eat_lenders_eat ON eat_lenders(eat_parked_file_id);
CREATE INDEX IF NOT EXISTS idx_eat_lenders_business_card ON eat_lenders(lender_business_card_id);

CREATE INDEX IF NOT EXISTS idx_eat_invoices_eat ON eat_invoices(eat_parked_file_id);

CREATE INDEX IF NOT EXISTS idx_eat_invoice_items_invoice ON eat_invoice_items(eat_invoice_id);
CREATE INDEX IF NOT EXISTS idx_eat_invoice_items_property ON eat_invoice_items(property_id);

-- =============================================
-- Triggers for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_eat_parked_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eat_parked_files_updated_at ON eat_parked_files;
CREATE TRIGGER eat_parked_files_updated_at
    BEFORE UPDATE ON eat_parked_files
    FOR EACH ROW
    EXECUTE FUNCTION update_eat_parked_files_updated_at();

DROP TRIGGER IF EXISTS eat_secretary_of_state_updated_at ON eat_secretary_of_state;
CREATE TRIGGER eat_secretary_of_state_updated_at
    BEFORE UPDATE ON eat_secretary_of_state
    FOR EACH ROW
    EXECUTE FUNCTION update_eat_parked_files_updated_at();

DROP TRIGGER IF EXISTS eat_identified_properties_updated_at ON eat_identified_properties;
CREATE TRIGGER eat_identified_properties_updated_at
    BEFORE UPDATE ON eat_identified_properties
    FOR EACH ROW
    EXECUTE FUNCTION update_eat_parked_files_updated_at();

DROP TRIGGER IF EXISTS eat_property_improvements_updated_at ON eat_property_improvements;
CREATE TRIGGER eat_property_improvements_updated_at
    BEFORE UPDATE ON eat_property_improvements
    FOR EACH ROW
    EXECUTE FUNCTION update_eat_parked_files_updated_at();

DROP TRIGGER IF EXISTS eat_lenders_updated_at ON eat_lenders;
CREATE TRIGGER eat_lenders_updated_at
    BEFORE UPDATE ON eat_lenders
    FOR EACH ROW
    EXECUTE FUNCTION update_eat_parked_files_updated_at();

DROP TRIGGER IF EXISTS eat_invoices_updated_at ON eat_invoices;
CREATE TRIGGER eat_invoices_updated_at
    BEFORE UPDATE ON eat_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_eat_parked_files_updated_at();

DROP TRIGGER IF EXISTS eat_invoice_items_updated_at ON eat_invoice_items;
CREATE TRIGGER eat_invoice_items_updated_at
    BEFORE UPDATE ON eat_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_eat_parked_files_updated_at();

-- =============================================
-- Function to generate EAT Parked File number
-- =============================================
CREATE OR REPLACE FUNCTION generate_eat_parked_file_number(
    tax_account_name TEXT,
    state_code TEXT,
    formation_year INTEGER
)
RETURNS TEXT AS $$
DECLARE
    sequence_num INTEGER;
    eat_num TEXT;
    first_name_letters TEXT;
BEGIN
    -- Get first 3 letters of tax account name (uppercase)
    first_name_letters := UPPER(SUBSTRING(tax_account_name, 1, 3));
    
    -- Get sequence number for this year and state
    SELECT COUNT(*) + 1 INTO sequence_num
    FROM eat_parked_files
    WHERE state = state_code 
    AND EXTRACT(YEAR FROM created_at) = formation_year;
    
    -- Format: EAT-[FirstName3]-[STATE]-[YEAR]-[SEQ]
    eat_num := 'EAT-' || first_name_letters || '-' || state_code || '-' || 
               formation_year || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN eat_num;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Trigger to update invoice total_amount when items change
-- =============================================
CREATE OR REPLACE FUNCTION update_eat_invoice_total()
RETURNS TRIGGER AS $$
DECLARE
    new_total NUMERIC(15, 2);
BEGIN
    -- Calculate total from all items
    SELECT COALESCE(SUM(amount), 0) INTO new_total
    FROM eat_invoice_items
    WHERE eat_invoice_id = COALESCE(NEW.eat_invoice_id, OLD.eat_invoice_id);
    
    -- Update invoice total
    UPDATE eat_invoices
    SET total_amount = new_total
    WHERE id = COALESCE(NEW.eat_invoice_id, OLD.eat_invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invoice_total_on_item_insert ON eat_invoice_items;
CREATE TRIGGER update_invoice_total_on_item_insert
    AFTER INSERT ON eat_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_eat_invoice_total();

DROP TRIGGER IF EXISTS update_invoice_total_on_item_update ON eat_invoice_items;
CREATE TRIGGER update_invoice_total_on_item_update
    AFTER UPDATE ON eat_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_eat_invoice_total();

DROP TRIGGER IF EXISTS update_invoice_total_on_item_delete ON eat_invoice_items;
CREATE TRIGGER update_invoice_total_on_item_delete
    AFTER DELETE ON eat_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_eat_invoice_total();

-- =============================================
-- RLS Policies
-- =============================================

-- eat_parked_files
ALTER TABLE eat_parked_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view EAT parked files" ON eat_parked_files;
CREATE POLICY "Anyone can view EAT parked files"
    ON eat_parked_files FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can create EAT parked files" ON eat_parked_files;
CREATE POLICY "Admins can create EAT parked files"
    ON eat_parked_files FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update EAT parked files" ON eat_parked_files;
CREATE POLICY "Admins can update EAT parked files"
    ON eat_parked_files FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "Workspace owner can delete EAT parked files" ON eat_parked_files;
CREATE POLICY "Workspace owner can delete EAT parked files"
    ON eat_parked_files FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type = 'workspace_owner'
        )
    );

-- eat_exchangors
ALTER TABLE eat_exchangors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view EAT exchangors" ON eat_exchangors;
CREATE POLICY "Anyone can view EAT exchangors" ON eat_exchangors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage EAT exchangors" ON eat_exchangors;
CREATE POLICY "Admins can manage EAT exchangors" ON eat_exchangors FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin'))
);

-- eat_secretary_of_state
ALTER TABLE eat_secretary_of_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view EAT SOS" ON eat_secretary_of_state;
CREATE POLICY "Anyone can view EAT SOS" ON eat_secretary_of_state FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage EAT SOS" ON eat_secretary_of_state;
CREATE POLICY "Admins can manage EAT SOS" ON eat_secretary_of_state FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin'))
);

-- eat_transactions
ALTER TABLE eat_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view EAT transactions" ON eat_transactions;
CREATE POLICY "Anyone can view EAT transactions" ON eat_transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage EAT transactions" ON eat_transactions;
CREATE POLICY "Admins can manage EAT transactions" ON eat_transactions FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin'))
);

-- eat_identified_properties
ALTER TABLE eat_identified_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view EAT identified properties" ON eat_identified_properties;
CREATE POLICY "Anyone can view EAT identified properties" ON eat_identified_properties FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage EAT identified properties" ON eat_identified_properties;
CREATE POLICY "Admins can manage EAT identified properties" ON eat_identified_properties FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin'))
);

-- eat_property_improvements
ALTER TABLE eat_property_improvements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view EAT property improvements" ON eat_property_improvements;
CREATE POLICY "Anyone can view EAT property improvements" ON eat_property_improvements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage EAT property improvements" ON eat_property_improvements;
CREATE POLICY "Admins can manage EAT property improvements" ON eat_property_improvements FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin'))
);

-- eat_lenders
ALTER TABLE eat_lenders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view EAT lenders" ON eat_lenders;
CREATE POLICY "Anyone can view EAT lenders" ON eat_lenders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage EAT lenders" ON eat_lenders;
CREATE POLICY "Admins can manage EAT lenders" ON eat_lenders FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin'))
);

-- eat_invoices
ALTER TABLE eat_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view EAT invoices" ON eat_invoices;
CREATE POLICY "Anyone can view EAT invoices" ON eat_invoices FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage EAT invoices" ON eat_invoices;
CREATE POLICY "Admins can manage EAT invoices" ON eat_invoices FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin'))
);

-- eat_invoice_items
ALTER TABLE eat_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view EAT invoice items" ON eat_invoice_items;
CREATE POLICY "Anyone can view EAT invoice items" ON eat_invoice_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage EAT invoice items" ON eat_invoice_items;
CREATE POLICY "Admins can manage EAT invoice items" ON eat_invoice_items FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin'))
);

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE eat_parked_files IS 'EAT Parked Files for managing reverse/forward exchanges';
COMMENT ON COLUMN eat_parked_files.eat_number IS 'Auto-generated: EAT-[FirstName3]-[StateAbbr]-[Year]-[SeqNum]';
COMMENT ON TABLE eat_exchangors IS 'Tax accounts (exchangors) associated with EAT parked files';
COMMENT ON TABLE eat_secretary_of_state IS 'Secretary of State / LLC Monitoring information';
COMMENT ON TABLE eat_transactions IS 'Transactions linked to EAT (Acquisition, Sale by Exchangor, EAT to Exchangor)';
COMMENT ON TABLE eat_identified_properties IS 'Identified properties for EAT (similar to exchange identified properties)';
COMMENT ON TABLE eat_lenders IS 'Lender information for EAT parked files';
COMMENT ON TABLE eat_invoices IS 'Construction invoices for improvements on EAT properties';
COMMENT ON TABLE eat_invoice_items IS 'Line items for construction invoices';

