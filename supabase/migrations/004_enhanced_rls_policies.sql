-- Enhanced Row Level Security (RLS) Policies for InvoiceComply
-- Ensures users can only access their own data

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmissions ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Invoices table policies
-- Users can only access their own invoices
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON public.invoices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON public.invoices
  FOR DELETE USING (auth.uid() = user_id);

-- Transmissions table policies
-- Users can only access transmissions for their own invoices
CREATE POLICY "Users can view own transmissions" ON public.transmissions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = (SELECT user_id FROM public.invoices WHERE id = invoice_id)
  );

CREATE POLICY "Users can insert own transmissions" ON public.transmissions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() = (SELECT user_id FROM public.invoices WHERE id = invoice_id)
  );

CREATE POLICY "Users can update own transmissions" ON public.transmissions
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() = (SELECT user_id FROM public.invoices WHERE id = invoice_id)
  );

-- Additional security functions
CREATE OR REPLACE FUNCTION public.check_user_invoice_access(invoice_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.invoices 
    WHERE id = invoice_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure SIRET uniqueness per user
CREATE OR REPLACE FUNCTION public.validate_user_siret()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if SIRET is already used by another user
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE siret = NEW.siret AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'SIRET already exists for another user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_siret_uniqueness
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_siret();

-- Function to validate invoice data integrity
CREATE OR REPLACE FUNCTION public.validate_invoice_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user owns the invoice
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create/modify invoice for another user';
  END IF;
  
  -- Validate basic invoice data
  IF NEW.invoice_number IS NULL OR LENGTH(NEW.invoice_number) < 1 THEN
    RAISE EXCEPTION 'Invoice number is required';
  END IF;
  
  IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
    RAISE EXCEPTION 'Valid total amount is required';
  END IF;
  
  -- Set default values
  IF NEW.currency IS NULL THEN
    NEW.currency := 'EUR';
  END IF;
  
  IF NEW.status IS NULL THEN
    NEW.status := 'draft';
  END IF;
  
  -- Update timestamps
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_invoice_data_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invoice_data();

-- Function to validate transmission data
CREATE OR REPLACE FUNCTION public.validate_transmission_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user owns the related invoice
  IF NOT public.check_user_invoice_access(NEW.invoice_id) THEN
    RAISE EXCEPTION 'Cannot create transmission for invoice not owned by user';
  END IF;
  
  -- Validate SIRET format
  IF NEW.recipient_siret IS NULL OR 
     NOT (NEW.recipient_siret ~ '^[0-9]{14}$') THEN
    RAISE EXCEPTION 'Valid recipient SIRET (14 digits) is required';
  END IF;
  
  -- Validate provider
  IF NEW.provider NOT IN ('chorus_pro', 'peppol', 'custom_partner') THEN
    RAISE EXCEPTION 'Invalid transmission provider';
  END IF;
  
  -- Set default values
  IF NEW.status IS NULL THEN
    NEW.status := 'pending';
  END IF;
  
  -- Update timestamps
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_transmission_data_trigger
  BEFORE INSERT OR UPDATE ON public.transmissions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transmission_data();

-- Audit log table for compliance tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit log policies (users can only see their own audit entries)
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    CASE 
      WHEN TG_OP = 'UPDATE' THEN 
        ARRAY(
          SELECT key FROM jsonb_each(to_jsonb(NEW)) 
          WHERE to_jsonb(NEW) ->> key != to_jsonb(OLD) ->> key
        )
      ELSE NULL 
    END
  );
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to important tables
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

CREATE TRIGGER audit_invoices_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

CREATE TRIGGER audit_transmissions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transmissions
  FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

-- Security view for user dashboard data
CREATE OR REPLACE VIEW public.user_dashboard_stats AS
SELECT 
  u.id as user_id,
  COUNT(i.id) as total_invoices,
  COUNT(CASE WHEN i.status = 'validated' THEN 1 END) as validated_invoices,
  COUNT(CASE WHEN i.status = 'transmitted' THEN 1 END) as transmitted_invoices,
  COUNT(t.id) as total_transmissions,
  COUNT(CASE WHEN t.status = 'delivered' THEN 1 END) as successful_transmissions,
  AVG(i.confidence_score) as avg_confidence_score,
  MAX(i.created_at) as last_invoice_date,
  MAX(t.submitted_at) as last_transmission_date
FROM public.users u
LEFT JOIN public.invoices i ON u.id = i.user_id
LEFT JOIN public.transmissions t ON i.id = t.invoice_id
WHERE u.id = auth.uid()
GROUP BY u.id;

-- Grant appropriate permissions
GRANT SELECT ON public.user_dashboard_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transmissions TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transmissions_user_id ON public.transmissions(user_id);
CREATE INDEX IF NOT EXISTS idx_transmissions_invoice_id ON public.transmissions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transmissions_status ON public.transmissions(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);