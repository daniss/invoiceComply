import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createChorusProIntegration } from '@/lib/chorus-pro/api-integration'
import { z } from 'zod'

const statusUpdateSchema = z.object({
  transmissionId: z.string(),
  status: z.enum(['pending', 'sending', 'sent', 'delivered', 'error']).optional(),
  errorMessage: z.string().optional(),
  chorusProId: z.string().optional()
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
    const validation = statusUpdateSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Données invalides',
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { transmissionId, status, errorMessage, chorusProId } = validation.data

    // Verify transmission belongs to user
    const { data: transmission, error: fetchError } = await supabase
      .from('transmissions')
      .select('*')
      .eq('id', transmissionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !transmission) {
      return NextResponse.json({ error: 'Transmission non trouvée' }, { status: 404 })
    }

    // Update transmission status
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updateData.status = status
      updateData.status_updated_at = new Date().toISOString()
    }

    if (errorMessage) {
      updateData.error_message = errorMessage
    }

    if (chorusProId) {
      updateData.chorus_pro_id = chorusProId
    }

    // If status is delivered, set delivered timestamp
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }

    const { data: updatedTransmission, error: updateError } = await supabase
      .from('transmissions')
      .update(updateData)
      .eq('id', transmissionId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    // Update related invoice status
    if (transmission.invoice_id) {
      let invoiceStatus = 'transmitted'
      if (status === 'delivered') {
        invoiceStatus = 'delivered'
      } else if (status === 'error') {
        invoiceStatus = 'transmission_failed'
      }

      await supabase
        .from('invoices')
        .update({
          status: invoiceStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', transmission.invoice_id)
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'transmission_status_updated',
        details: {
          transmissionId,
          oldStatus: transmission.status,
          newStatus: status,
          chorusProId,
          errorMessage
        }
      })

    return NextResponse.json({
      success: true,
      transmission: updatedTransmission,
      message: 'Statut de transmission mis à jour'
    })

  } catch (error) {
    console.error('Transmission status update error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du statut' },
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
    const transmissionId = searchParams.get('transmissionId')
    const status = searchParams.get('status')
    const invoiceId = searchParams.get('invoiceId')
    const pdpProvider = searchParams.get('pdpProvider')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const refresh = searchParams.get('refresh') === 'true'

    if (transmissionId) {
      // Get specific transmission status
      const { data: transmission, error: dbError } = await supabase
        .from('transmissions')
        .select(`
          *,
          invoices:invoice_id (
            invoice_number,
            supplier_name,
            total_amount_including_vat
          )
        `)
        .eq('id', transmissionId)
        .eq('invoices.user_id', user.id)
        .not('invoices', 'is', null)
        .single()

      if (dbError || !transmission) {
        return NextResponse.json({ error: 'Transmission non trouvée' }, { status: 404 })
      }

      // Refresh status from Chorus Pro if requested
      if (refresh && transmission.chorus_pro_id) {
        try {
          const chorusIntegration = createChorusProIntegration({
            environment: 'sandbox',
            clientId: process.env.CHORUS_PRO_CLIENT_ID || '',
            clientSecret: process.env.CHORUS_PRO_CLIENT_SECRET || '',
            login: process.env.CHORUS_PRO_LOGIN || '',
            password: process.env.CHORUS_PRO_PASSWORD || ''
          })
          
          const chorusStatus = await chorusIntegration.consulterStatutFacture(transmission.chorus_pro_id)
          if (chorusStatus && chorusStatus.statut !== transmission.status) {
            // Update status
            await supabase
              .from('transmissions')
              .update({
                status: chorusStatus.statut,
                status_updated_at: new Date().toISOString(),
                chorus_pro_response: chorusStatus
              })
              .eq('id', transmissionId)

            transmission.status = chorusStatus.statut
            transmission.chorus_pro_response = chorusStatus
          }
        } catch (chorusError) {
          console.error('Chorus Pro status refresh error:', chorusError)
        }
      }

      return NextResponse.json({
        success: true,
        transmission
      })
    }

    // Get all transmissions for user
    let query = supabase
      .from('transmissions')
      .select(`
        *,
        invoices:invoice_id (
          invoice_number,
          supplier_name,
          total_amount_including_vat
        )
      `)
      .eq('invoices.user_id', user.id)
      .not('invoices', 'is', null)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId)
    }

    if (pdpProvider) {
      query = query.eq('pdp_provider', pdpProvider)
    }

    const { data: transmissions, error: dbError } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Erreur de base de données' }, { status: 500 })
    }

    // Get statistics
    const { data: stats, error: statsError } = await supabase
      .from('transmissions')
      .select('status, invoices!inner(user_id)')
      .eq('invoices.user_id', user.id)

    const statistics = {
      total: stats?.length || 0,
      pending: stats?.filter(t => t.status === 'pending').length || 0,
      sent: stats?.filter(t => ['sent', 'delivered'].includes(t.status)).length || 0,
      errors: stats?.filter(t => t.status === 'error').length || 0
    }

    return NextResponse.json({
      success: true,
      transmissions,
      statistics,
      pagination: {
        page,
        limit,
        total: transmissions.length
      }
    })

  } catch (error) {
    console.error('Transmission status fetch error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statuts' },
      { status: 500 }
    )
  }
}

// Webhook endpoint for PDP status updates
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify webhook signature (in production, add proper webhook validation)
    const signature = request.headers.get('x-webhook-signature')
    const body = await request.json()

    // Basic validation
    if (!body.transmissionId || !body.status) {
      return NextResponse.json({ error: 'Données webhook invalides' }, { status: 400 })
    }

    const { transmissionId, status, chorusProId, errorMessage, deliveredAt } = body

    // Update transmission status
    const updateData: any = {
      status,
      status_updated_at: new Date().toISOString(),
      webhook_received_at: new Date().toISOString()
    }

    if (chorusProId) {
      updateData.chorus_pro_id = chorusProId
    }

    if (errorMessage) {
      updateData.error_message = errorMessage
    }

    if (deliveredAt) {
      updateData.delivered_at = deliveredAt
    }

    const { data: transmission, error: updateError } = await supabase
      .from('transmissions')
      .update(updateData)
      .eq('id', transmissionId)
      .select('user_id, invoice_id')
      .single()

    if (updateError) {
      console.error('Webhook update error:', updateError)
      return NextResponse.json({ error: 'Erreur mise à jour webhook' }, { status: 500 })
    }

    // Update related invoice status
    if (transmission.invoice_id) {
      let invoiceStatus = 'transmitted'
      if (status === 'delivered') {
        invoiceStatus = 'delivered'
      } else if (status === 'error') {
        invoiceStatus = 'transmission_failed'
      }

      await supabase
        .from('invoices')
        .update({
          status: invoiceStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', transmission.invoice_id)
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        user_id: transmission.user_id,
        action: 'webhook_status_update',
        details: {
          transmissionId,
          status,
          chorusProId,
          source: 'webhook'
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Statut mis à jour via webhook'
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Erreur traitement webhook' },
      { status: 500 }
    )
  }
}