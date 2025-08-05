-- Quick setup script for InvoiceComply
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create basic users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    company_name TEXT,
    siret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create basic invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT,
    status TEXT DEFAULT 'draft',
    total_amount DECIMAL(12,2),
    currency TEXT DEFAULT 'EUR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own invoices" ON public.invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON public.invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.invoices TO authenticated;