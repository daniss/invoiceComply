import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createChorusProIntegration } from '@/lib/chorus-pro/api-integration'
import { createPeppolIntegration } from '@/lib/peppol/network-integration'
import { globalTransmissionTracker } from '@/lib/transmission/tracking-system'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invoiceId, recipientSiret, provider, options = {} } = body

    // Validate input
    if (!invoiceId || !recipientSiret || !provider) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, recipientSiret, provider' },
        { status: 400 }
      )
    }

    // Get invoice from database
    const { data: invoice, error: dbError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single()

    if (dbError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check if invoice is ready for transmission
    if (!invoice.factur_x_generated) {
      return NextResponse.json(
        { error: 'Invoice must have Factur-X generated before transmission' },
        { status: 400 }
      )
    }

    // Get user profile for sender information
    const { data: profile } = await supabase
      .from('users')
      .select('company_name, siret, address')
      .eq('id', user.id)
      .single()

    if (!profile?.siret) {
      return NextResponse.json(
        { error: 'User SIRET is required for transmission' },
        { status: 400 }
      )
    }

    // Create transmission request
    const transmissionRequest = {
      invoiceId: invoice.id,
      recipientSiret,
      factorXPdfBytes: new Uint8Array(), // Would need to get actual PDF bytes
      xmlContent: '', // Would need to generate XML from extracted data
      metadata: {
        senderSiret: profile.siret,
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        totalAmount: invoice.total_amount,
        currency: invoice.currency
      },
      options
    }

    let transmissionResult
    
    try {
      switch (provider) {
        case 'chorus_pro':
          const chorusProConfig = {
            environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
            clientId: process.env.CHORUS_PRO_CLIENT_ID!,
            clientSecret: process.env.CHORUS_PRO_CLIENT_SECRET!,
            login: process.env.CHORUS_PRO_LOGIN!,
            password: process.env.CHORUS_PRO_PASSWORD!
          }
          
          const chorusIntegration = createChorusProIntegration(chorusProConfig)
          transmissionResult = await chorusIntegration.transmitInvoice(transmissionRequest)
          break

        case 'peppol':
          const peppolConfig = {
            environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
            endpoint: process.env.PEPPOL_ACCESS_POINT_URL!,
            credentials: {
              clientId: process.env.PEPPOL_CLIENT_ID!,
              clientSecret: process.env.PEPPOL_CLIENT_SECRET!
            },
            timeout: 30000,
            retryAttempts: 3,
            accessPointUrl: process.env.PEPPOL_ACCESS_POINT_URL!,
            senderParticipantId: process.env.PEPPOL_PARTICIPANT_ID!,
            certificatePath: process.env.PEPPOL_CERTIFICATE_PATH!,
            privateKeyPath: process.env.PEPPOL_PRIVATE_KEY_PATH!
          }
          
          const peppolIntegration = createPeppolIntegration(peppolConfig)
          transmissionResult = await peppolIntegration.transmitInvoice(transmissionRequest)
          break

        default:
          return NextResponse.json(
            { error: `Unsupported provider: ${provider}` },
            { status: 400 }
          )
      }

      // Record transmission in tracking system
      const trackingId = globalTransmissionTracker.recordTransmission(
        invoice.id,
        invoice.invoice_number,
        transmissionResult,
        provider,
        {
          totalAmount: invoice.total_amount,
          currency: invoice.currency,
          fileName: `${invoice.invoice_number}.pdf`,
          fileSize: 0, // Would need actual file size
          senderSiret: profile.siret
        }
      )

      // Save transmission record to database
      const { data: transmission, error: transmissionError } = await supabase
        .from('transmissions')
        .insert({
          invoice_id: invoice.id,
          user_id: user.id,
          recipient_siret: recipientSiret,
          provider,
          transmission_id: transmissionResult.transmissionId,
          status: transmissionResult.status,
          tracking_id: trackingId,
          submitted_at: transmissionResult.timestamp.toISOString(),
          metadata: {
            provider_response: transmissionResult,
            options
          }
        })
        .select()
        .single()

      if (transmissionError) {
        console.error('Failed to save transmission:', transmissionError)
      }

      // Update invoice status
      await supabase
        .from('invoices')
        .update({
          status: 'transmitted',
          transmitted_at: new Date().toISOString()
        })
        .eq('id', invoice.id)

      return NextResponse.json({
        success: true,
        transmission: {
          id: transmission?.id,
          trackingId,
          transmissionId: transmissionResult.transmissionId,
          status: transmissionResult.status,
          provider,
          submittedAt: transmissionResult.timestamp
        }
      })

    } catch (transmissionError) {
      console.error('Transmission failed:', transmissionError)
      
      // Record failed transmission
      await supabase
        .from('transmissions')
        .insert({
          invoice_id: invoice.id,
          user_id: user.id,
          recipient_siret: recipientSiret,
          provider,
          status: 'failed',
          error_message: (transmissionError as Error).message,
          submitted_at: new Date().toISOString()
        })

      return NextResponse.json(
        { 
          error: 'Transmission failed',
          details: (transmissionError as Error).message
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Transmission API error:', error)
    return NextResponse.json(
      { error: 'Failed to process transmission' },
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
    const provider = searchParams.get('provider')

    let query = supabase
      .from('transmissions')
      .select(`
        *,
        invoice:invoices(invoice_number, supplier_name, total_amount)
      `)
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    
    if (provider) {
      query = query.eq('provider', provider)
    }

    const { data: transmissions, error: dbError } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to fetch transmissions' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      transmissions,
      pagination: {
        page,
        limit,
        total: transmissions.length
      }
    })

  } catch (error) {
    console.error('Transmission list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transmissions' },
      { status: 500 }
    )
  }
}