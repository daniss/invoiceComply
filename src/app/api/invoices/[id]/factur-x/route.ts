import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateFacturXPdf } from '@/lib/factur-x/pdf-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const { bypass = false } = body

    // Get invoice from database
    const { data: invoice, error: dbError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (dbError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check if invoice is compliant (bypass in test mode)
    if (!bypass && invoice.status !== 'validated' && invoice.compliance_result?.overall?.level !== 'compliant') {
      return NextResponse.json(
        { error: 'Invoice must be compliant before generating Factur-X' },
        { status: 400 }
      )
    }

    // Get original PDF bytes if available
    let originalPdfBytes: Uint8Array | undefined
    if (invoice.file_path) {
      try {
        // In a real implementation, you'd fetch from your file storage
        // For now, we'll generate a new PDF from extracted data
        originalPdfBytes = undefined
      } catch (error) {
        console.warn('Could not load original PDF, will generate new one')
      }
    }

    // Generate Factur-X PDF
    const factorXResult = await generateFacturXPdf(
      invoice.extracted_data,
      originalPdfBytes,
      {
        format: 'EN16931',
        includeAttachments: false,
        embedOriginalPdf: !!originalPdfBytes,
        pdfMetadata: {
          title: `Facture ${invoice.invoice_number}`,
          subject: 'Facture électronique conforme Factur-X',
          author: invoice.extracted_data.supplierName || 'InvoiceComply',
          creator: 'InvoiceComply PDF Generator'
        }
      }
    )

    // Update invoice with Factur-X data
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        factur_x_generated: true,
        factur_x_metadata: factorXResult.metadata,
        factur_x_compliance: factorXResult.compliance,
        status: 'ready_for_transmission'
      })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update invoice:', updateError)
    }

    // Return the PDF as response
    return new NextResponse(factorXResult.pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture-${invoice.invoice_number}.pdf"`,
        'X-Factur-X-Profile': factorXResult.metadata.factorXProfile,
        'X-Invoice-Number': factorXResult.metadata.invoiceNumber,
        'X-Total-Amount': factorXResult.metadata.totalAmount.toString(),
        'X-Currency': factorXResult.metadata.currency
      }
    })

  } catch (error) {
    console.error('Factur-X generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Factur-X PDF' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get invoice status
    const { data: invoice, error: dbError } = await supabase
      .from('invoices')
      .select('factur_x_generated, factur_x_metadata, factur_x_compliance, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (dbError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      factorXGenerated: invoice.factur_x_generated,
      metadata: invoice.factur_x_metadata,
      compliance: invoice.factur_x_compliance,
      status: invoice.status
    })

  } catch (error) {
    console.error('Factur-X status error:', error)
    return NextResponse.json(
      { error: 'Failed to get Factur-X status' },
      { status: 500 }
    )
  }
}