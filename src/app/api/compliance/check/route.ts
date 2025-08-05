import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateCompliance } from '@/lib/compliance/validation-engine'
import { z } from 'zod'

const complianceCheckSchema = z.object({
  invoiceId: z.string().optional(),
  // Allow direct extracted data object or nested invoiceData
  invoiceNumber: z.string().optional(),
  supplierSiret: z.string().optional(),
  buyerSiret: z.string().optional(),
  invoiceDate: z.string().optional(),
  totalAmountIncludingVat: z.number().optional(),
  totalAmountExcludingVat: z.number().optional(),
  totalVatAmount: z.number().optional(),
  supplierName: z.string().optional(),
  buyerName: z.string().optional(),
  paymentTerms: z.number().optional(),
  currency: z.string().optional(),
  confidence: z.number().optional(),
  issues: z.array(z.string()).optional(),
  extractedText: z.string().optional(),
  // Legacy support for nested invoiceData
  invoiceData: z.object({
    invoiceNumber: z.string().optional(),
    supplierSiret: z.string().optional(),
    buyerSiret: z.string().optional(),
    invoiceDate: z.string().optional(),
    totalAmountIncludingVat: z.number().optional(),
    totalAmountExcludingVat: z.number().optional(),
    totalVatAmount: z.number().optional(),
    supplierName: z.string().optional(),
    buyerName: z.string().optional(),
    paymentTerms: z.number().optional(),
    currency: z.string().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const validation = complianceCheckSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Données invalides',
        details: validation.error.issues 
      }, { status: 400 })
    }

    const data = validation.data
    
    // Extract invoice data (either direct fields or nested invoiceData)
    const invoiceData = data.invoiceData || {
      invoiceNumber: data.invoiceNumber,
      supplierSiret: data.supplierSiret,
      buyerSiret: data.buyerSiret,
      invoiceDate: data.invoiceDate,
      totalAmountIncludingVat: data.totalAmountIncludingVat,
      totalAmountExcludingVat: data.totalAmountExcludingVat,
      totalVatAmount: data.totalVatAmount,
      supplierName: data.supplierName,
      buyerName: data.buyerName,
      paymentTerms: data.paymentTerms,
      currency: data.currency
    }

    // Run compliance check
    const complianceResult = validateCompliance(invoiceData)

    // Store compliance check result if invoice exists
    if (data.invoiceId) {
      const { error: updateError } = await supabase
        .from('compliance_checks')
        .upsert({
          invoice_id: data.invoiceId,
          user_id: user.id,
          check_result: complianceResult,
          field_validations: complianceResult.rules || [],
          passed: complianceResult.overall.level === 'compliant',
          errors: complianceResult.rules
            ? complianceResult.rules
                .filter(rule => rule.status === 'failed')
                .map(rule => rule.message)
                .join('; ')
            : '',
          checked_at: new Date().toISOString()
        })

      if (updateError) {
        console.error('Error storing compliance check:', updateError)
      }
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'compliance_check',
        details: {
          invoiceId: data.invoiceId,
          complianceScore: complianceResult.overall.score,
          level: complianceResult.overall.level,
          rulesChecked: complianceResult.rules?.length || 0
        }
      })

    return NextResponse.json({
      success: true,
      compliance: complianceResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Compliance check error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de conformité' },
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
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoiceId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    let query = supabase
      .from('compliance_checks')
      .select(`
        *,
        invoices:invoice_id (
          invoice_number,
          supplier_name,
          total_amount
        )
      `)
      .eq('user_id', user.id)
      .order('checked_at', { ascending: false })

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId)
    }

    const { data: checks, error: dbError } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Erreur de base de données' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      complianceChecks: checks,
      pagination: {
        page,
        limit,
        total: checks.length
      }
    })

  } catch (error) {
    console.error('Compliance fetch error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des vérifications' },
      { status: 500 }
    )
  }
}