export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          company_name: string | null
          siret: string | null
          subscription_tier: 'starter' | 'professional' | 'business' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          company_name?: string | null
          siret?: string | null
          subscription_tier?: 'starter' | 'professional' | 'business' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          company_name?: string | null
          siret?: string | null
          subscription_tier?: 'starter' | 'professional' | 'business' | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          original_pdf_url: string | null
          facturx_xml: string | null
          status: 'uploaded' | 'processing' | 'converted' | 'transmitted' | 'failed'
          invoice_number: string | null
          invoice_date: string | null
          total_amount: number | null
          vat_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          original_pdf_url?: string | null
          facturx_xml?: string | null
          status?: 'uploaded' | 'processing' | 'converted' | 'transmitted' | 'failed'
          invoice_number?: string | null
          invoice_date?: string | null
          total_amount?: number | null
          vat_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          original_pdf_url?: string | null
          facturx_xml?: string | null
          status?: 'uploaded' | 'processing' | 'converted' | 'transmitted' | 'failed'
          invoice_number?: string | null
          invoice_date?: string | null
          total_amount?: number | null
          vat_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      transmissions: {
        Row: {
          id: string
          invoice_id: string
          pdp_provider: 'chorus_pro' | 'partner'
          transmission_id: string | null
          status: 'pending' | 'sent' | 'confirmed' | 'failed'
          response: Json | null
          sent_at: string | null
          confirmed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          pdp_provider: 'chorus_pro' | 'partner'
          transmission_id?: string | null
          status?: 'pending' | 'sent' | 'confirmed' | 'failed'
          response?: Json | null
          sent_at?: string | null
          confirmed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          pdp_provider?: 'chorus_pro' | 'partner'
          transmission_id?: string | null
          status?: 'pending' | 'sent' | 'confirmed' | 'failed'
          response?: Json | null
          sent_at?: string | null
          confirmed_at?: string | null
          created_at?: string
        }
      }
      compliance_checks: {
        Row: {
          id: string
          invoice_id: string
          field_validations: Json
          errors: Json | null
          passed: boolean
          checked_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          field_validations: Json
          errors?: Json | null
          passed: boolean
          checked_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          field_validations?: Json
          errors?: Json | null
          passed?: boolean
          checked_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          details: Json | null
          timestamp: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          details?: Json | null
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          details?: Json | null
          timestamp?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}