import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Manual invoice creation schema
const manualInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Numéro de facture requis'),
  invoiceDate: z.string().min(1, 'Date de facture requise'),
  dueDate: z.string().optional(),
  
  issuer: z.object({
    companyName: z.string().min(1, 'Nom de l\'entreprise requis'),
    address: z.string().min(1, 'Adresse requise'),
    siret: z.string().min(14, 'SIRET requis').max(14, 'SIRET invalide'),
    vatNumber: z.string().min(11, 'Numéro de TVA requis'),
    iban: z.string().optional(),
  }),
  
  customer: z.object({
    companyName: z.string().min(1, 'Nom du client requis'),
    address: z.string().min(1, 'Adresse du client requise'),
    vatNumber: z.string().optional(),
    siret: z.string().optional(),
  }),
  
  lineItems: z.array(z.object({
    id: z.string(),
    description: z.string().min(1, 'Description requise'),
    quantity: z.number().min(0.01, 'Quantité doit être positive'),
    unitPrice: z.number().min(0, 'Prix unitaire doit être positif'),
    vatRate: z.number().min(0).max(100, 'Taux de TVA invalide'),
  })).min(1, 'Au moins une ligne de facturation requise'),
  
  notes: z.string().optional(),
  paymentTerms: z.number().min(1).max(60, 'Délai de paiement entre 1 et 60 jours').optional(),
  paymentMethod: z.string().optional(),
})

// GET /api/manual-invoices - Get user's manual invoices
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('manual_invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by status if provided
    if (status && ['draft', 'finalized', 'transmitted'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data: invoices, error, count } = await query

    if (error) {
      console.error('Error fetching manual invoices:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des factures' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invoices: invoices || [],
      total: count || 0,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error('Manual invoices fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST /api/manual-invoices - Create new manual invoice
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate invoice data
    const validatedData = manualInvoiceSchema.parse(body)

    // Check for duplicate invoice number
    const { data: existingInvoice } = await supabase
      .from('manual_invoices')
      .select('id')
      .eq('user_id', user.id)
      .eq('invoice_number', validatedData.invoiceNumber)
      .single()

    if (existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Une facture avec ce numéro existe déjà' },
        { status: 400 }
      )
    }

    // Calculate totals
    let totalHT = 0
    let totalVAT = 0

    validatedData.lineItems.forEach(item => {
      const htAmount = item.quantity * item.unitPrice
      const vatAmount = htAmount * (item.vatRate / 100)
      totalHT += htAmount
      totalVAT += vatAmount
    })

    const totalTTC = totalHT + totalVAT

    // Create manual invoice
    const { data: invoice, error } = await supabase
      .from('manual_invoices')
      .insert({
        user_id: user.id,
        invoice_number: validatedData.invoiceNumber,
        invoice_date: validatedData.invoiceDate,
        due_date: validatedData.dueDate || null,
        issuer_data: validatedData.issuer,
        customer_data: validatedData.customer,
        line_items: validatedData.lineItems,
        total_ht: totalHT,
        total_vat: totalVAT,
        total_ttc: totalTTC,
        payment_terms: validatedData.paymentTerms || null,
        payment_method: validatedData.paymentMethod || null,
        notes: validatedData.notes || null,
        status: 'draft'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating manual invoice:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création de la facture' },
        { status: 500 }
      )
    }

    // Clear draft after successful creation
    await supabase
      .from('invoice_drafts')
      .delete()
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      message: 'Facture créée avec succès',
      invoice
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Manual invoice create error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}