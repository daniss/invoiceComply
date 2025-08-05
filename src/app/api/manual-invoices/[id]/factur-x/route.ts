import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateFacturXFromManualInvoice } from '@/lib/factur-x/manual-generator'

// POST /api/manual-invoices/[id]/factur-x - Generate Factur-X for manual invoice
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get manual invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('manual_invoices')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Facture non trouvée' },
          { status: 404 }
        )
      }
      
      console.error('Error fetching manual invoice:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération de la facture' },
        { status: 500 }
      )
    }

    // Generate Factur-X PDF
    const result = await generateFacturXFromManualInvoice(invoice)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    // Upload PDF to Supabase Storage
    const fileName = `manual_invoice_${invoice.invoice_number}_${Date.now()}.pdf`
    const filePath = `factur-x/${user.id}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(filePath, result.pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading Factur-X PDF:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors du téléchargement du PDF' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(filePath)

    // Update manual invoice with Factur-X info
    const { error: updateError } = await supabase
      .from('manual_invoices')
      .update({
        factur_x_generated: true,
        factur_x_url: urlData.publicUrl,
        status: 'finalized',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating manual invoice:', updateError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour de la facture' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Factur-X généré avec succès',
      facturXUrl: urlData.publicUrl,
      fileName,
      xmlContent: result.xmlContent
    })

  } catch (error) {
    console.error('Factur-X generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération Factur-X' },
      { status: 500 }
    )
  }
}