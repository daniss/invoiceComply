-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: JWT secret should be configured via environment variables in production

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'business');
CREATE TYPE invoice_status AS ENUM ('uploaded', 'processing', 'converted', 'transmitted', 'failed');
CREATE TYPE transmission_status AS ENUM ('pending', 'sent', 'confirmed', 'failed');
CREATE TYPE pdp_provider AS ENUM ('chorus_pro', 'partner');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE CHECK (length(email) > 0),
    company_name TEXT CHECK (length(company_name) >= 2),
    siret TEXT UNIQUE CHECK (siret ~ '^\d{14}$'),
    vat_number TEXT CHECK (vat_number ~ '^FR\d{11}$'),
    legal_entity TEXT,
    business_sector TEXT,
    address JSONB,
    subscription_tier subscription_tier DEFAULT 'starter',
    subscription_active BOOLEAN DEFAULT FALSE,
    stripe_customer_id TEXT,
    invoice_count_current_month INTEGER DEFAULT 0 CHECK (invoice_count_current_month >= 0),
    last_invoice_reset DATE DEFAULT CURRENT_DATE,
    gdpr_consent BOOLEAN DEFAULT FALSE,
    gdpr_consent_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE public.invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    original_filename TEXT,
    original_pdf_url TEXT,
    facturx_xml TEXT,
    status invoice_status DEFAULT 'uploaded',
    invoice_number TEXT,
    invoice_date DATE,
    due_date DATE,
    supplier_siret TEXT,
    buyer_siret TEXT,
    supplier_name TEXT,
    buyer_name TEXT,
    supplier_address JSONB,
    buyer_address JSONB,
    total_amount_excluding_vat DECIMAL(12,2),
    total_vat_amount DECIMAL(12,2),
    total_amount_including_vat DECIMAL(12,2),
    vat_breakdown JSONB,
    payment_terms INTEGER,
    currency TEXT DEFAULT 'EUR',
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transmissions table
CREATE TABLE public.transmissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    pdp_provider pdp_provider NOT NULL,
    transmission_id TEXT,
    status transmission_status DEFAULT 'pending',
    request_payload JSONB,
    response_payload JSONB,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance checks table
CREATE TABLE public.compliance_checks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    field_validations JSONB NOT NULL,
    errors JSONB,
    warnings JSONB,
    passed BOOLEAN NOT NULL,
    compliance_score INTEGER,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table (for Stripe integration)
CREATE TABLE public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    stripe_price_id TEXT,
    status TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File uploads table (for tracking uploaded files)
CREATE TABLE public.file_uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    storage_path TEXT,
    upload_status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_siret ON public.users(siret);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_invoice_date ON public.invoices(invoice_date);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_transmissions_invoice_id ON public.transmissions(invoice_id);
CREATE INDEX idx_transmissions_status ON public.transmissions(status);
CREATE INDEX idx_compliance_checks_invoice_id ON public.compliance_checks(invoice_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();