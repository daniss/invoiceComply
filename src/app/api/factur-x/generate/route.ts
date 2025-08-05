import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateFacturXXML } from '@/lib/factur-x/xml-generator'
import { generateFacturXPdf } from '@/lib/factur-x/pdf-generator'
import { validateCompliance } from '@/lib/compliance/validation-engine'
import { z } from 'zod'

const generateFacturXSchema = z.object({
  invoiceId: z.string().optional(),
  invoiceData: z.object({
    invoiceNumber: z.string(),
    invoiceDate: z.string(),
    dueDate: z.string().optional(),
    supplierName: z.string(),
    supplierAddress: z.string().optional(),
    supplierSiret: z.string(),
    supplierVatNumber: z.string().optional(),
    buyerName: z.string(),
    buyerAddress: z.string().optional(),
    buyerSiret: z.string().optional(),
    buyerVatNumber: z.string().optional(),
    totalAmountExcludingVat: z.number(),
    totalVatAmount: z.number(),
    totalAmountIncludingVat: z.number(),
    vatRate: z.number().default(20),
    currency: z.string().default('EUR'),
    paymentTerms: z.number().optional(),
    paymentMeans: z.string().optional(),
    lineItems: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      vatRate: z.number(),
      totalAmount: z.number()
    })).optional()
  }),
  format: z.enum(['xml', 'pdf', 'both']).default('both'),
  compliance: z.boolean().default(true)
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
    const validation = generateFacturXSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Données invalides',
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { invoiceId, invoiceData, format, compliance } = validation.data

    // Validate compliance if requested
    let complianceResult = null
    if (compliance) {
      complianceResult = validateCompliance(invoiceData)
      
      // Only block if compliance is explicitly required and fails critically
      if (complianceResult.overall.level === 'non-compliant' && complianceResult.overall.score < 25) {
        return NextResponse.json({
          error: 'Facture non conforme',
          compliance: complianceResult,
          message: 'La facture doit être conforme avant génération Factur-X'
        }, { status: 400 })
      }
    }

    let xmlContent = null
    let pdfContent = null
    let facturXContent = null

    try {
      // Generate XML with French compliance
      if (format === 'xml' || format === 'both') {
        // Convert API data to ExtractedInvoiceData format
        const extractedData = {
          invoiceNumber: invoiceData.invoiceNumber,
          invoiceDate: invoiceData.invoiceDate,
          dueDate: invoiceData.dueDate,
          supplierName: invoiceData.supplierName,
          supplierAddress: invoiceData.supplierAddress,
          supplierSiret: invoiceData.supplierSiret,
          supplierVatNumber: invoiceData.supplierVatNumber,
          buyerName: invoiceData.buyerName,
          buyerAddress: invoiceData.buyerAddress,
          buyerSiret: invoiceData.buyerSiret,
          buyerVatNumber: invoiceData.buyerVatNumber,
          totalAmountExcludingVat: invoiceData.totalAmountExcludingVat,
          totalVatAmount: invoiceData.totalVatAmount,
          totalAmountIncludingVat: invoiceData.totalAmountIncludingVat,
          currency: invoiceData.currency,
          paymentTerms: invoiceData.paymentTerms,
          paymentMethod: invoiceData.paymentMeans,
          lineItems: invoiceData.lineItems?.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalAmount,
            vatRate: item.vatRate
          })),
          confidence: 1.0, // API data is assumed to be accurate
          extractedText: `Invoice ${invoiceData.invoiceNumber}`,
          issues: []
        }
        
        xmlContent = generateFacturXXML(extractedData, {
          format: 'EN16931',
          includeAttachments: false,
          frenchProfile: 'B2B',
          dgfipCompliant: true
        })
      }

      // Generate PDF with embedded XML (Factur-X)
      if (format === 'pdf' || format === 'both') {
        facturXContent = await generateFacturXPdf(invoiceData, xmlContent)
      }

      // Store generation result in database
      const generationResult = {
        invoice_id: invoiceId,
        user_id: user.id,
        format,
        xml_content: xmlContent,
        pdf_size: facturXContent ? facturXContent.length : null,
        compliance_result: complianceResult,
        generated_at: new Date().toISOString()
      }

      if (invoiceId) {
        // Update existing invoice with Factur-X data
        await supabase
          .from('invoices')
          .update({
            facturx_xml: xmlContent,
            facturx_pdf_size: facturXContent ? facturXContent.length : null,
            status: 'facturx_generated',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId)
          .eq('user_id', user.id)
      }

      // Store generation log
      await supabase
        .from('facturx_generations')
        .insert(generationResult)

      // Log audit trail
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'facturx_generated',
          details: {
            invoiceId,
            format,
            complianceScore: complianceResult?.overall.score,
            xmlSize: xmlContent?.length,
            pdfSize: facturXContent?.length
          }
        })

      // Prepare response
      const response: any = {
        success: true,
        invoiceNumber: invoiceData.invoiceNumber,
        format,
        generatedAt: new Date().toISOString()
      }

      if (xmlContent) {
        response.xml = {
          content: xmlContent,
          size: xmlContent.length,
          mimeType: 'application/xml'
        }
      }

      if (facturXContent) {
        response.pdf = {
          content: Buffer.from(facturXContent).toString('base64'),
          size: facturXContent.length,
          mimeType: 'application/pdf',
          filename: `${invoiceData.invoiceNumber}_factur-x.pdf`
        }
      }

      if (complianceResult) {
        response.compliance = complianceResult
      }

      return NextResponse.json(response)

    } catch (generationError) {
      console.error('Factur-X generation error:', generationError)
      
      // Log failed generation
      await supabase
        .from('facturx_generations')
        .insert({
          invoice_id: invoiceId,
          user_id: user.id,
          format,
          error_message: generationError.message,
          generated_at: new Date().toISOString()
        })

      return NextResponse.json({
        error: 'Erreur lors de la génération Factur-X',
        details: generationError.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Factur-X API error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
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

    if (invoiceId) {
      // Get specific invoice Factur-X data
      const { data: invoice, error: dbError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          facturx_xml,
          facturx_pdf_size,
          status,
          updated_at
        `)
        .eq('id', invoiceId)
        .eq('user_id', user.id)
        .single()

      if (dbError || !invoice) {
        return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          hasFacturX: !!invoice.facturx_xml,
          xmlSize: invoice.facturx_xml?.length,
          pdfSize: invoice.facturx_pdf_size,
          status: invoice.status,
          lastGenerated: invoice.updated_at
        }
      })
    }

    // Get all Factur-X generations for user
    const { data: generations, error: dbError } = await supabase
      .from('facturx_generations')
      .select(`
        *,
        invoices:invoice_id (
          invoice_number,
          supplier_name
        )
      `)
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Erreur de base de données' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      generations,
      pagination: {
        page,
        limit,
        total: generations.length
      }
    })

  } catch (error) {
    console.error('Factur-X fetch error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données Factur-X' },
      { status: 500 }
    )
  }
}