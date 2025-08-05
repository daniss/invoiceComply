-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Invoices policies
CREATE POLICY "Users can view their own invoices" ON public.invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices" ON public.invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices" ON public.invoices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices" ON public.invoices
    FOR DELETE USING (auth.uid() = user_id);

-- Transmissions policies
CREATE POLICY "Users can view transmissions for their invoices" ON public.transmissions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.invoices WHERE id = transmissions.invoice_id
        )
    );

CREATE POLICY "Users can insert transmissions for their invoices" ON public.transmissions
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.invoices WHERE id = transmissions.invoice_id
        )
    );

CREATE POLICY "Users can update transmissions for their invoices" ON public.transmissions
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.invoices WHERE id = transmissions.invoice_id
        )
    );

-- Compliance checks policies
CREATE POLICY "Users can view compliance checks for their invoices" ON public.compliance_checks
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.invoices WHERE id = compliance_checks.invoice_id
        )
    );

CREATE POLICY "Users can insert compliance checks for their invoices" ON public.compliance_checks
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.invoices WHERE id = compliance_checks.invoice_id
        )
    );

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- File uploads policies
CREATE POLICY "Users can view their own file uploads" ON public.file_uploads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own file uploads" ON public.file_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own file uploads" ON public.file_uploads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own file uploads" ON public.file_uploads
    FOR DELETE USING (auth.uid() = user_id);