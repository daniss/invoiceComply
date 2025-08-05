import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserDataExport } from '@/lib/gdpr/data-retention'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Check rate limiting (max 1 export per day per user)
    const today = new Date().toISOString().split('T')[0]
    const { data: recentExports } = await supabase
      .from('audit_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('action', 'gdpr_data_export')
      .gte('timestamp', `${today}T00:00:00Z`)

    if (recentExports && recentExports.length > 0) {
      return NextResponse.json(
        { error: 'Vous ne pouvez demander qu\'un export par jour' },
        { status: 429 }
      )
    }

    // Log the export request
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'gdpr_data_export',
      details: { 
        ip_address: request.ip || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Export user data
    const userData = await getUserDataExport(user.id)
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `invoicecomply-export-${timestamp}.json`
    
    // Return as downloadable JSON file
    const response = new NextResponse(JSON.stringify(userData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
    
    return response
  } catch (error) {
    console.error('GDPR export error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export des données' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { requestType } = body

    if (requestType === 'export') {
      // Log the export request
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'gdpr_data_export_requested',
        details: { timestamp: new Date().toISOString() }
      })

      return NextResponse.json({
        success: true,
        message: 'Demande d\'export enregistrée. Vous recevrez un email avec le lien de téléchargement.'
      })
    }

    if (requestType === 'delete') {
      // Log the deletion request
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'gdpr_deletion_requested',
        details: { timestamp: new Date().toISOString() }
      })

      return NextResponse.json({
        success: true,
        message: 'Demande de suppression enregistrée. Elle sera traitée sous 30 jours conformément au RGPD.'
      })
    }

    return NextResponse.json(
      { error: 'Type de demande invalide' },
      { status: 400 }
    )
  } catch (error) {
    console.error('GDPR request error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la demande' },
      { status: 500 }
    )
  }
}