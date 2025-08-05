import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePdfInvoice } from '@/lib/pdf/parser'
import { validateInvoiceData } from '@/lib/invoice/validation-integration'
import { validateCompliance } from '@/lib/compliance/validation-engine'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type and size
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // Parse PDF and extract invoice data
    const extractedData = await parsePdfInvoice(arrayBuffer, {
      extractText: true,
      extractMetadata: true,
      validateFields: true,
      language: 'fr'
    })

    // Convert French date format (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
    const convertFrenchDateToISO = (frenchDate: string | undefined): string | null => {
      if (!frenchDate) return null
      
      try {
        // Parse DD/MM/YYYY format
        const parts = frenchDate.split('/')
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0')
          const month = parts[1].padStart(2, '0')
          const year = parts[2]
          return `${year}-${month}-${day}`
        }
      } catch (error) {
        console.warn('Failed to convert date:', frenchDate, error)
      }
      return null
    }

    // Validate compliance
    const validation = validateInvoiceData(extractedData)
    const compliance = validateCompliance(extractedData)

    // Store in database
    const { data: invoice, error: dbError } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        original_filename: file.name,
        invoice_number: extractedData.invoiceNumber,
        invoice_date: convertFrenchDateToISO(extractedData.invoiceDate),
        due_date: convertFrenchDateToISO(extractedData.dueDate),
        supplier_name: extractedData.supplierName,
        supplier_siret: extractedData.supplierSiret,
        total_amount_including_vat: extractedData.totalAmountIncludingVat,
        total_amount_excluding_vat: extractedData.totalAmountExcludingVat,
        total_vat_amount: extractedData.totalVatAmount,
        currency: extractedData.currency || 'EUR',
        extracted_data: extractedData,
        status: 'uploaded',
        metadata: {
          validation,
          compliance,
          confidence_score: Math.round(extractedData.confidence * 100)
        }
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save invoice' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      invoices: [{
        id: invoice.id,
        extractedData,
        validation,
        compliance
      }]
    })

  } catch (error) {
    console.error('Invoice upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process invoice' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')

    let query = supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invoices, error: dbError } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      invoices,
      pagination: {
        page,
        limit,
        total: invoices.length
      }
    })

  } catch (error) {
    console.error('Invoice fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}