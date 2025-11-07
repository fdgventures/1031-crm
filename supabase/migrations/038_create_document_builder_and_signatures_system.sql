-- =============================================
-- Document Builder & Digital Signature System
-- This creates a comprehensive document template builder with DocuSign-like signature functionality
-- =============================================

-- =============================================
-- 1. Document Template Components (Headers/Footers)
-- =============================================
CREATE TABLE IF NOT EXISTS document_template_components (
    id BIGSERIAL PRIMARY KEY,
    
    -- Component details
    name TEXT NOT NULL,
    component_type TEXT NOT NULL CHECK (component_type IN ('header', 'footer')),
    content JSONB NOT NULL DEFAULT '{}'::jsonb, -- Rich text content with formatting
    
    -- QI Company association
    qi_company_id UUID REFERENCES qi_companies(id) ON DELETE CASCADE,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =============================================
-- 2. Document Templates
-- =============================================
CREATE TABLE IF NOT EXISTS document_templates (
    id BIGSERIAL PRIMARY KEY,
    
    -- Basic information
    name TEXT NOT NULL,
    description TEXT,
    
    -- Template type - which object this template is for
    template_type TEXT NOT NULL CHECK (template_type IN ('transaction', 'exchange', 'property', 'eat')),
    
    -- Template content (A4 format)
    content JSONB NOT NULL DEFAULT '{}'::jsonb, -- Rich text content with formatting and dynamic fields
    
    -- Components (header/footer)
    header_component_id BIGINT REFERENCES document_template_components(id) ON DELETE SET NULL,
    footer_component_id BIGINT REFERENCES document_template_components(id) ON DELETE SET NULL,
    
    -- Dynamic field mappings
    -- Stores the list of dynamic fields like <<tax seller>>, <<property address>>, etc.
    dynamic_fields JSONB DEFAULT '[]'::jsonb,
    
    -- QI Company association
    qi_company_id UUID REFERENCES qi_companies(id) ON DELETE CASCADE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =============================================
-- 3. Signature Fields in Templates
-- Defines where signatures should be placed in the template
-- =============================================
CREATE TABLE IF NOT EXISTS template_signature_fields (
    id BIGSERIAL PRIMARY KEY,
    
    -- Template reference
    template_id BIGINT NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    
    -- Field details
    field_name TEXT NOT NULL, -- e.g., "Seller Signature", "Buyer Signature"
    field_type TEXT NOT NULL CHECK (field_type IN ('signature', 'date', 'text')),
    
    -- Position in document (for drag-and-drop placement)
    position_x NUMERIC(10, 2) NOT NULL,
    position_y NUMERIC(10, 2) NOT NULL,
    page_number INTEGER NOT NULL DEFAULT 1,
    
    -- Size
    width NUMERIC(10, 2) DEFAULT 200,
    height NUMERIC(10, 2) DEFAULT 50,
    
    -- Who should sign (role-based)
    signer_role TEXT, -- 'admin', 'client', 'closing_agent', etc.
    
    -- Required or optional
    is_required BOOLEAN DEFAULT true,
    
    -- Order of signing
    signing_order INTEGER DEFAULT 1,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4. User Signatures (for Vesting Names)
-- Signatures for individual users' vesting names
-- =============================================
CREATE TABLE IF NOT EXISTS vesting_name_signatures (
    id BIGSERIAL PRIMARY KEY,
    
    -- User and vesting name reference
    tax_account_id BIGINT NOT NULL REFERENCES tax_accounts(id) ON DELETE CASCADE,
    vesting_name TEXT NOT NULL,
    
    -- Signature details
    signature_type TEXT NOT NULL CHECK (signature_type IN ('property', 'entity')),
    
    -- Signature content
    signature_text TEXT NOT NULL, -- The actual signature text
    signature_font TEXT DEFAULT 'Brush Script MT', -- Font for signature
    
    -- For Property type signatures
    printed_name TEXT, -- Below signature for Property type
    
    -- For Entity type signatures
    entity_name TEXT, -- Above signature for Entity type
    by_name TEXT, -- BY: field
    its_title TEXT, -- ITS: field
    
    -- Unique signature ID (generated alphanumeric)
    signature_id TEXT UNIQUE NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint: one signature per vesting name per tax account
    UNIQUE(tax_account_id, vesting_name)
);

-- =============================================
-- 5. Admin Signatures
-- Signatures for admin users, set by QI workspace owner
-- =============================================
CREATE TABLE IF NOT EXISTS admin_signatures (
    id BIGSERIAL PRIMARY KEY,
    
    -- Admin user reference
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Signature details
    signature_type TEXT NOT NULL CHECK (signature_type IN ('property', 'entity')),
    
    -- Signature content
    signature_text TEXT NOT NULL,
    signature_font TEXT DEFAULT 'Brush Script MT',
    
    -- For Property type
    printed_name TEXT,
    
    -- For Entity type
    entity_name TEXT,
    by_name TEXT,
    its_title TEXT,
    
    -- Unique signature ID
    signature_id TEXT UNIQUE NOT NULL,
    
    -- QI Company association
    qi_company_id UUID REFERENCES qi_companies(id) ON DELETE CASCADE,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- QI owner who set this
    
    -- Unique constraint: one signature per admin per QI company
    UNIQUE(admin_user_id, qi_company_id)
);

-- =============================================
-- 6. Generated Documents
-- Documents created from templates
-- =============================================
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    
    -- Template reference
    template_id BIGINT NOT NULL REFERENCES document_templates(id) ON DELETE RESTRICT,
    
    -- Document details
    document_name TEXT NOT NULL,
    document_number TEXT UNIQUE, -- Auto-generated document number
    
    -- Object references (what this document is for)
    transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE,
    exchange_id BIGINT REFERENCES exchanges(id) ON DELETE CASCADE,
    property_id BIGINT REFERENCES properties(id) ON DELETE CASCADE,
    eat_parked_file_id BIGINT REFERENCES eat_parked_files(id) ON DELETE CASCADE,
    
    -- Final rendered content (with filled dynamic fields)
    content JSONB NOT NULL,
    
    -- PDF storage
    pdf_url TEXT, -- Storage URL for generated PDF
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',
        'pending_signatures',
        'partially_signed',
        'fully_signed',
        'completed',
        'cancelled'
    )),
    
    -- QI Company association
    qi_company_id UUID REFERENCES qi_companies(id) ON DELETE CASCADE,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ
);

-- =============================================
-- 7. Document Signature Requests
-- Tracks who needs to sign each document
-- =============================================
CREATE TABLE IF NOT EXISTS document_signature_requests (
    id BIGSERIAL PRIMARY KEY,
    
    -- Document reference
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Template signature field reference
    template_field_id BIGINT NOT NULL REFERENCES template_signature_fields(id) ON DELETE RESTRICT,
    
    -- Signer details
    signer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    signer_email TEXT,
    signer_name TEXT,
    
    -- Signature to use (either admin or vesting name signature)
    admin_signature_id BIGINT REFERENCES admin_signatures(id) ON DELETE SET NULL,
    vesting_signature_id BIGINT REFERENCES vesting_name_signatures(id) ON DELETE SET NULL,
    
    -- Signing status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'sent',
        'viewed',
        'signed',
        'declined',
        'expired'
    )),
    
    -- Signing order
    signing_order INTEGER DEFAULT 1,
    
    -- Signature data (when signed)
    signed_at TIMESTAMPTZ,
    signature_image_url TEXT, -- URL to rendered signature image
    ip_address TEXT,
    user_agent TEXT,
    
    -- Notifications
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Indexes
-- =============================================

-- Document Template Components
CREATE INDEX IF NOT EXISTS idx_doc_template_components_type ON document_template_components(component_type);
CREATE INDEX IF NOT EXISTS idx_doc_template_components_qi_company ON document_template_components(qi_company_id);

-- Document Templates
CREATE INDEX IF NOT EXISTS idx_doc_templates_type ON document_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_doc_templates_qi_company ON document_templates(qi_company_id);
CREATE INDEX IF NOT EXISTS idx_doc_templates_active ON document_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_doc_templates_created_by ON document_templates(created_by);

-- Template Signature Fields
CREATE INDEX IF NOT EXISTS idx_template_sig_fields_template ON template_signature_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_template_sig_fields_role ON template_signature_fields(signer_role);
CREATE INDEX IF NOT EXISTS idx_template_sig_fields_order ON template_signature_fields(signing_order);

-- Vesting Name Signatures
CREATE INDEX IF NOT EXISTS idx_vesting_signatures_tax_account ON vesting_name_signatures(tax_account_id);
CREATE INDEX IF NOT EXISTS idx_vesting_signatures_signature_id ON vesting_name_signatures(signature_id);
CREATE INDEX IF NOT EXISTS idx_vesting_signatures_type ON vesting_name_signatures(signature_type);

-- Admin Signatures
CREATE INDEX IF NOT EXISTS idx_admin_signatures_user ON admin_signatures(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_signatures_qi_company ON admin_signatures(qi_company_id);
CREATE INDEX IF NOT EXISTS idx_admin_signatures_signature_id ON admin_signatures(signature_id);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_template ON documents(template_id);
CREATE INDEX IF NOT EXISTS idx_documents_transaction ON documents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_documents_exchange ON documents(exchange_id);
CREATE INDEX IF NOT EXISTS idx_documents_property ON documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_eat ON documents(eat_parked_file_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_qi_company ON documents(qi_company_id);
CREATE INDEX IF NOT EXISTS idx_documents_number ON documents(document_number);

-- Document Signature Requests
CREATE INDEX IF NOT EXISTS idx_doc_sig_requests_document ON document_signature_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_sig_requests_signer ON document_signature_requests(signer_user_id);
CREATE INDEX IF NOT EXISTS idx_doc_sig_requests_status ON document_signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_doc_sig_requests_admin_sig ON document_signature_requests(admin_signature_id);
CREATE INDEX IF NOT EXISTS idx_doc_sig_requests_vesting_sig ON document_signature_requests(vesting_signature_id);
CREATE INDEX IF NOT EXISTS idx_doc_sig_requests_order ON document_signature_requests(signing_order);

-- =============================================
-- Triggers for updated_at
-- =============================================

-- Document Template Components
CREATE OR REPLACE FUNCTION update_document_template_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_template_components_updated_at ON document_template_components;
CREATE TRIGGER document_template_components_updated_at
    BEFORE UPDATE ON document_template_components
    FOR EACH ROW
    EXECUTE FUNCTION update_document_template_components_updated_at();

-- Document Templates
CREATE OR REPLACE FUNCTION update_document_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_templates_updated_at ON document_templates;
CREATE TRIGGER document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_document_templates_updated_at();

-- Template Signature Fields
CREATE OR REPLACE FUNCTION update_template_signature_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS template_signature_fields_updated_at ON template_signature_fields;
CREATE TRIGGER template_signature_fields_updated_at
    BEFORE UPDATE ON template_signature_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_template_signature_fields_updated_at();

-- Vesting Name Signatures
CREATE OR REPLACE FUNCTION update_vesting_name_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vesting_name_signatures_updated_at ON vesting_name_signatures;
CREATE TRIGGER vesting_name_signatures_updated_at
    BEFORE UPDATE ON vesting_name_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_vesting_name_signatures_updated_at();

-- Admin Signatures
CREATE OR REPLACE FUNCTION update_admin_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_signatures_updated_at ON admin_signatures;
CREATE TRIGGER admin_signatures_updated_at
    BEFORE UPDATE ON admin_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_signatures_updated_at();

-- Documents
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Document Signature Requests
CREATE OR REPLACE FUNCTION update_document_signature_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_signature_requests_updated_at ON document_signature_requests;
CREATE TRIGGER document_signature_requests_updated_at
    BEFORE UPDATE ON document_signature_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_document_signature_requests_updated_at();

-- =============================================
-- Functions for Signature ID Generation
-- =============================================

-- Generate unique signature ID (alphanumeric)
CREATE OR REPLACE FUNCTION generate_signature_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := 'SIG-';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate signature ID for vesting name signatures
CREATE OR REPLACE FUNCTION auto_generate_vesting_signature_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.signature_id IS NULL OR NEW.signature_id = '' THEN
        NEW.signature_id := generate_signature_id();
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM vesting_name_signatures WHERE signature_id = NEW.signature_id) LOOP
            NEW.signature_id := generate_signature_id();
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_vesting_signature_id ON vesting_name_signatures;
CREATE TRIGGER auto_vesting_signature_id
    BEFORE INSERT ON vesting_name_signatures
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_vesting_signature_id();

-- Auto-generate signature ID for admin signatures
CREATE OR REPLACE FUNCTION auto_generate_admin_signature_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.signature_id IS NULL OR NEW.signature_id = '' THEN
        NEW.signature_id := generate_signature_id();
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM admin_signatures WHERE signature_id = NEW.signature_id) LOOP
            NEW.signature_id := generate_signature_id();
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_admin_signature_id ON admin_signatures;
CREATE TRIGGER auto_admin_signature_id
    BEFORE INSERT ON admin_signatures
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_admin_signature_id();

-- =============================================
-- Function for Document Number Generation
-- =============================================
CREATE OR REPLACE FUNCTION generate_document_number()
RETURNS TEXT AS $$
DECLARE
    year_str TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
    month_str TEXT := TO_CHAR(CURRENT_DATE, 'MM');
    seq_num INTEGER;
    result TEXT;
BEGIN
    -- Get next sequence number for this month
    SELECT COUNT(*) + 1 INTO seq_num
    FROM documents
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE);
    
    result := 'DOC-' || year_str || month_str || '-' || LPAD(seq_num::TEXT, 5, '0');
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate document number
CREATE OR REPLACE FUNCTION auto_generate_document_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.document_number IS NULL OR NEW.document_number = '' THEN
        NEW.document_number := generate_document_number();
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM documents WHERE document_number = NEW.document_number) LOOP
            NEW.document_number := generate_document_number();
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_document_number ON documents;
CREATE TRIGGER auto_document_number
    BEFORE INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_document_number();

-- =============================================
-- RLS Policies
-- =============================================

-- Document Template Components
ALTER TABLE document_template_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view document template components" ON document_template_components;
CREATE POLICY "Anyone can view document template components"
    ON document_template_components FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can create document template components" ON document_template_components;
CREATE POLICY "Admins can create document template components"
    ON document_template_components FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update document template components" ON document_template_components;
CREATE POLICY "Admins can update document template components"
    ON document_template_components FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can delete document template components" ON document_template_components;
CREATE POLICY "Admins can delete document template components"
    ON document_template_components FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Document Templates
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view document templates" ON document_templates;
CREATE POLICY "Anyone can view document templates"
    ON document_templates FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can create document templates" ON document_templates;
CREATE POLICY "Admins can create document templates"
    ON document_templates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update document templates" ON document_templates;
CREATE POLICY "Admins can update document templates"
    ON document_templates FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can delete document templates" ON document_templates;
CREATE POLICY "Admins can delete document templates"
    ON document_templates FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Template Signature Fields
ALTER TABLE template_signature_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view template signature fields" ON template_signature_fields;
CREATE POLICY "Anyone can view template signature fields"
    ON template_signature_fields FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can manage template signature fields" ON template_signature_fields;
CREATE POLICY "Admins can manage template signature fields"
    ON template_signature_fields FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Vesting Name Signatures
ALTER TABLE vesting_name_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view vesting name signatures" ON vesting_name_signatures;
CREATE POLICY "Anyone can view vesting name signatures"
    ON vesting_name_signatures FOR SELECT
    USING (true);

-- Simplified policy: Users can manage signatures through application logic
-- RLS allows all authenticated users, actual permissions handled in app
DROP POLICY IF EXISTS "Authenticated users can manage vesting signatures" ON vesting_name_signatures;
CREATE POLICY "Authenticated users can manage vesting signatures"
    ON vesting_name_signatures FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage all vesting signatures" ON vesting_name_signatures;
CREATE POLICY "Admins can manage all vesting signatures"
    ON vesting_name_signatures FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Admin Signatures
ALTER TABLE admin_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view admin signatures" ON admin_signatures;
CREATE POLICY "Anyone can view admin signatures"
    ON admin_signatures FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "QI owners can manage admin signatures" ON admin_signatures;
CREATE POLICY "QI owners can manage admin signatures"
    ON admin_signatures FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin')
        )
    );

-- Documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view documents" ON documents;
CREATE POLICY "Anyone can view documents"
    ON documents FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can create documents" ON documents;
CREATE POLICY "Admins can create documents"
    ON documents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update documents" ON documents;
CREATE POLICY "Admins can update documents"
    ON documents FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can delete documents" ON documents;
CREATE POLICY "Admins can delete documents"
    ON documents FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Document Signature Requests
ALTER TABLE document_signature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view document signature requests" ON document_signature_requests;
CREATE POLICY "Anyone can view document signature requests"
    ON document_signature_requests FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can manage document signature requests" ON document_signature_requests;
CREATE POLICY "Admins can manage document signature requests"
    ON document_signature_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "Signers can update their own signature requests" ON document_signature_requests;
CREATE POLICY "Signers can update their own signature requests"
    ON document_signature_requests FOR UPDATE
    USING (signer_user_id = auth.uid())
    WITH CHECK (signer_user_id = auth.uid());

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE document_template_components IS 'Reusable header and footer components for document templates';
COMMENT ON TABLE document_templates IS 'Document templates with rich text editor and dynamic field support';
COMMENT ON TABLE template_signature_fields IS 'Defines signature field positions in document templates (drag-and-drop)';
COMMENT ON TABLE vesting_name_signatures IS 'Digital signatures for user vesting names';
COMMENT ON TABLE admin_signatures IS 'Digital signatures for admin users, managed by QI workspace owners';
COMMENT ON TABLE documents IS 'Generated documents from templates, stored in document repository';
COMMENT ON TABLE document_signature_requests IS 'Signature requests for documents (DocuSign-like functionality)';

COMMENT ON COLUMN vesting_name_signatures.signature_type IS 'Property: signature + printed name. Entity: entity name + signature + BY + ITS';
COMMENT ON COLUMN admin_signatures.signature_type IS 'Property: signature + printed name. Entity: entity name + signature + BY + ITS';
COMMENT ON COLUMN document_templates.dynamic_fields IS 'Array of dynamic field placeholders like <<tax seller>>, <<property address>>';
COMMENT ON COLUMN template_signature_fields.position_x IS 'X coordinate for signature field placement (drag-and-drop)';
COMMENT ON COLUMN template_signature_fields.position_y IS 'Y coordinate for signature field placement (drag-and-drop)';

