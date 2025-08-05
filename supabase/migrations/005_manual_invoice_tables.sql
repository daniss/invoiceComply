-- Manual Invoice Builder tables
-- Created: 2025-01-05
-- Description: Add support for manual invoice creation, templates, and drafts

-- Create additional enums for manual invoices
CREATE TYPE manual_invoice_status AS ENUM ('draft', 'finalized', 'transmitted');

-- Invoice drafts table - for auto-save functionality
CREATE TABLE public.invoice_drafts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    form_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one draft per user
    CONSTRAINT invoice_drafts_user_id_key UNIQUE (user_id)
);

-- Invoice templates table - for reusable invoice templates
CREATE TABLE public.invoice_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL CHECK (length(name) >= 1),
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('service', 'product', 'consulting', 'other')) DEFAULT 'other',
    is_default BOOLEAN DEFAULT FALSE,
    template_data JSONB NOT NULL,
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure template names are unique per user
    CONSTRAINT invoice_templates_user_name_key UNIQUE (user_id, name)
);

-- Manual invoices table - for invoices created through the form builder
CREATE TABLE public.manual_invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    status manual_invoice_status DEFAULT 'draft',
    
    -- Basic invoice info
    invoice_date DATE NOT NULL,
    due_date DATE,
    
    -- Issuer information (from form)
    issuer_company_name TEXT NOT NULL,
    issuer_address TEXT NOT NULL,
    issuer_siret TEXT CHECK (issuer_siret ~ '^\d{14}$'),
    issuer_vat_number TEXT CHECK (issuer_vat_number ~ '^FR\d{11}$'),
    issuer_iban TEXT,
    
    -- Customer information
    customer_company_name TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_siret TEXT CHECK (customer_siret ~ '^\d{14}$' OR customer_siret IS NULL),
    customer_vat_number TEXT CHECK (customer_vat_number ~ '^FR\d{11}$' OR customer_vat_number IS NULL),
    
    -- Line items (stored as JSONB array)
    line_items JSONB NOT NULL,
    
    -- Totals (calculated from line items)
    total_amount_excluding_vat DECIMAL(12,2) NOT NULL CHECK (total_amount_excluding_vat >= 0),
    total_vat_amount DECIMAL(12,2) NOT NULL CHECK (total_vat_amount >= 0),
    total_amount_including_vat DECIMAL(12,2) NOT NULL CHECK (total_amount_including_vat >= 0),
    
    -- Additional information
    notes TEXT,
    payment_terms INTEGER CHECK (payment_terms >= 1 AND payment_terms <= 60),
    payment_method TEXT,
    
    -- File references
    facturx_pdf_url TEXT,
    facturx_xml TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure invoice numbers are unique per user (French legal requirement)
    CONSTRAINT manual_invoices_user_invoice_number_key UNIQUE (user_id, invoice_number)
);

-- Add indexes for performance
CREATE INDEX idx_invoice_drafts_user_id ON public.invoice_drafts(user_id);
CREATE INDEX idx_invoice_templates_user_id ON public.invoice_templates(user_id);
CREATE INDEX idx_invoice_templates_category ON public.invoice_templates(category);
CREATE INDEX idx_manual_invoices_user_id ON public.manual_invoices(user_id);
CREATE INDEX idx_manual_invoices_status ON public.manual_invoices(status);
CREATE INDEX idx_manual_invoices_invoice_date ON public.manual_invoices(invoice_date);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoice_drafts_updated_at 
    BEFORE UPDATE ON public.invoice_drafts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_templates_updated_at 
    BEFORE UPDATE ON public.invoice_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_invoices_updated_at 
    BEFORE UPDATE ON public.manual_invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE public.invoice_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policy for invoice_drafts
CREATE POLICY "Users can manage their own drafts" ON public.invoice_drafts
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for invoice_templates
CREATE POLICY "Users can view their own templates" ON public.invoice_templates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" ON public.invoice_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON public.invoice_templates
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON public.invoice_templates
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for manual_invoices
CREATE POLICY "Users can view their own manual invoices" ON public.manual_invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own manual invoices" ON public.manual_invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manual invoices" ON public.manual_invoices
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manual invoices" ON public.manual_invoices
    FOR DELETE USING (auth.uid() = user_id);

-- Insert some default templates for new users
INSERT INTO public.invoice_templates (
    user_id, 
    name, 
    description, 
    category, 
    is_default, 
    template_data
) VALUES 
(
    '00000000-0000-0000-0000-000000000000',  -- System template
    'Prestation de service standard',
    'Template de base pour les prestations de service',
    'service',
    true,
    '{
        "paymentTerms": 30,
        "paymentMethod": "Virement bancaire",
        "lineItems": [
            {
                "id": "1",
                "description": "Prestation de service",
                "quantity": 1,
                "unitPrice": 0,
                "vatRate": 20
            }
        ]
    }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.invoice_drafts IS 'Auto-saved draft data for manual invoice builder';
COMMENT ON TABLE public.invoice_templates IS 'Reusable templates for manual invoice creation';
COMMENT ON TABLE public.manual_invoices IS 'Invoices created through the manual form builder';

COMMENT ON COLUMN public.manual_invoices.line_items IS 'JSON array of invoice line items with description, quantity, unitPrice, vatRate';
COMMENT ON COLUMN public.invoice_templates.template_data IS 'Partial invoice form data for template reuse';
COMMENT ON COLUMN public.invoice_drafts.form_data IS 'Complete form state for auto-save functionality';