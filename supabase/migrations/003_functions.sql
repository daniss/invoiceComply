-- Function to validate French SIRET number
CREATE OR REPLACE FUNCTION validate_siret(siret_number TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    clean_siret TEXT;
    digits INTEGER[];
    sum_val INTEGER := 0;
    i INTEGER;
    digit INTEGER;
    check_digit INTEGER;
BEGIN
    -- Remove spaces and hyphens
    clean_siret := REGEXP_REPLACE(siret_number, '[\s-]', '', 'g');
    
    -- Must be exactly 14 digits
    IF NOT clean_siret ~ '^\d{14}$' THEN
        RETURN FALSE;
    END IF;
    
    -- Convert to array of integers
    FOR i IN 1..14 LOOP
        digits[i] := SUBSTR(clean_siret, i, 1)::INTEGER;
    END LOOP;
    
    -- SIRET uses a modified Luhn algorithm, alternating from right to left
    FOR i IN 13..1 BY -1 LOOP
        digit := digits[i];
        IF (13 - i) % 2 = 1 THEN
            digit := digit * 2;
            IF digit > 9 THEN
                digit := digit - 9;
            END IF;
        END IF;
        sum_val := sum_val + digit;
    END LOOP;
    
    check_digit := (10 - (sum_val % 10)) % 10;
    RETURN check_digit = digits[14];
END;
$$ LANGUAGE plpgsql;

-- Function to validate French VAT number
CREATE OR REPLACE FUNCTION validate_french_vat(vat_number TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    clean_vat TEXT;
    siren_part TEXT;
    key_part INTEGER;
    expected_key INTEGER;
BEGIN
    -- Remove spaces and convert to uppercase
    clean_vat := UPPER(REGEXP_REPLACE(vat_number, '\s', '', 'g'));
    
    -- Must start with FR followed by 11 digits
    IF NOT clean_vat ~ '^FR\d{11}$' THEN
        RETURN FALSE;
    END IF;
    
    -- Extract SIREN (last 9 digits) and key (first 2 digits after FR)
    siren_part := SUBSTR(clean_vat, 5, 9);
    key_part := SUBSTR(clean_vat, 3, 2)::INTEGER;
    
    -- Validate SIREN using similar Luhn algorithm
    IF NOT validate_siret(siren_part || '00000') THEN
        RETURN FALSE;
    END IF;
    
    -- Validate VAT key
    expected_key := (12 + 3 * (siren_part::BIGINT % 97)) % 97;
    RETURN key_part = expected_key;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly invoice count
CREATE OR REPLACE FUNCTION reset_monthly_invoice_count()
RETURNS VOID AS $$
BEGIN
    UPDATE public.users 
    SET 
        invoice_count_current_month = 0,
        last_invoice_reset = CURRENT_DATE
    WHERE 
        last_invoice_reset < DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limits(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
    limit_reached BOOLEAN := FALSE;
BEGIN
    SELECT 
        subscription_tier,
        invoice_count_current_month,
        subscription_active
    INTO user_record
    FROM public.users 
    WHERE id = user_uuid;
    
    IF NOT user_record.subscription_active THEN
        RETURN FALSE;
    END IF;
    
    CASE user_record.subscription_tier
        WHEN 'starter' THEN
            limit_reached := user_record.invoice_count_current_month >= 50;
        WHEN 'professional' THEN
            limit_reached := user_record.invoice_count_current_month >= 500;
        WHEN 'business' THEN
            limit_reached := FALSE; -- Unlimited
    END CASE;
    
    RETURN NOT limit_reached;
END;
$$ LANGUAGE plpgsql;

-- Function to increment invoice count
CREATE OR REPLACE FUNCTION increment_invoice_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Reset monthly count if needed
    PERFORM reset_monthly_invoice_count();
    
    -- Increment count for the user
    UPDATE public.users 
    SET invoice_count_current_month = invoice_count_current_month + 1
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    action_type TEXT;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'created';
        new_data := to_jsonb(NEW);
        old_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'updated';
        new_data := to_jsonb(NEW);
        old_data := to_jsonb(OLD);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'deleted';
        new_data := NULL;
        old_data := to_jsonb(OLD);
    END IF;
    
    -- Insert audit log
    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id, auth.uid()),
        action_type,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'old_data', old_data,
            'new_data', new_data
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_invoices_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_transmissions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transmissions
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Create trigger to increment invoice count
CREATE TRIGGER increment_invoice_count_trigger
    AFTER INSERT ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION increment_invoice_count();

-- Function to clean up old data (GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
DECLARE
    retention_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate retention date (7 years)
    retention_date := NOW() - INTERVAL '7 years';
    
    -- Delete old audit logs
    DELETE FROM public.audit_logs WHERE timestamp < retention_date;
    
    -- Delete old file uploads
    DELETE FROM public.file_uploads WHERE created_at < retention_date;
    
    -- Archive old invoices (mark as archived instead of deleting)
    UPDATE public.invoices 
    SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"archived": true}'::jsonb
    WHERE created_at < retention_date 
    AND (metadata->>'archived')::boolean IS NOT TRUE;
    
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup function (to be run by cron job)
-- This would typically be set up as a database cron job or external scheduler