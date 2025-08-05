import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const auditExportSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']).default('csv'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  actions: z.array(z.string()).optional(),
  includeDetails: z.boolean().default(true)
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
    const validation = auditExportSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Paramètres invalides',
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { format, dateFrom, dateTo, actions, includeDetails } = validation.data

    // Build query
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        details,
        created_at,
        ip_address,
        user_agent
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    if (actions && actions.length > 0) {
      query = query.in('action', actions)
    }

    // Fetch audit logs
    const { data: auditLogs, error: dbError } = await query.limit(10000) // Reasonable limit

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Erreur de base de données' }, { status: 500 })
    }

    // Get company settings for report header
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('company_name, siret')
      .eq('user_id', user.id)
      .single()

    // Generate export content based on format
    let content: string
    let mimeType: string
    let filename: string

    const exportDate = new Date().toISOString().split('T')[0]

    switch (format) {
      case 'csv':
        content = generateCSVExport(auditLogs, companySettings, includeDetails)
        mimeType = 'text/csv'
        filename = `audit-trail-${exportDate}.csv`
        break

      case 'json':
        content = generateJSONExport(auditLogs, companySettings, includeDetails)
        mimeType = 'application/json'
        filename = `audit-trail-${exportDate}.json`
        break

      case 'pdf':
        content = await generatePDFExport(auditLogs, companySettings, includeDetails)
        mimeType = 'application/pdf'
        filename = `audit-trail-${exportDate}.pdf`
        break

      default:
        return NextResponse.json({ error: 'Format non supporté' }, { status: 400 })
    }

    // Log audit trail for export action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'audit_trail_exported',
        details: {
          format,
          recordCount: auditLogs.length,
          dateFrom,
          dateTo,
          actions
        }
      })

    // Return file content
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': content.length.toString()
      }
    })

  } catch (error) {
    console.error('Audit export error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export du journal d\'audit' },
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build query
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (action) {
      query = query.eq('action', action)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data: auditLogs, error: dbError, count } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Erreur de base de données' }, { status: 500 })
    }

    // Get available actions for filtering
    const { data: availableActions } = await supabase
      .from('audit_logs')
      .select('action')
      .eq('user_id', user.id)
      .order('action')

    const uniqueActions = [...new Set(availableActions?.map(log => log.action) || [])]

    return NextResponse.json({
      success: true,
      auditLogs: auditLogs?.map(log => ({
        ...log,
        actionLabel: getActionLabel(log.action),
        formattedDate: new Date(log.created_at).toLocaleString('fr-FR')
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      filters: {
        availableActions: uniqueActions.map(action => ({
          value: action,
          label: getActionLabel(action)
        }))
      }
    })

  } catch (error) {
    console.error('Audit logs fetch error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du journal d\'audit' },
      { status: 500 }
    )
  }
}

function generateCSVExport(auditLogs: any[], companySettings: any, includeDetails: boolean): string {
  const headers = [
    'Date/Heure',
    'Action',
    'Description'
  ]

  if (includeDetails) {
    headers.push('Détails', 'Adresse IP')
  }

  const csvLines = [
    `# Journal d'audit - ${companySettings?.company_name || 'InvoiceComply'}`,
    `# SIRET: ${companySettings?.siret || 'N/A'}`,
    `# Généré le: ${new Date().toLocaleString('fr-FR')}`,
    `# Nombre d'entrées: ${auditLogs.length}`,
    '',
    headers.join(',')
  ]

  auditLogs.forEach(log => {
    const row = [
      `"${new Date(log.created_at).toLocaleString('fr-FR')}"`,
      `"${log.action}"`,
      `"${getActionLabel(log.action)}"`
    ]

    if (includeDetails) {
      row.push(
        `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
        `"${log.ip_address || 'N/A'}"`
      )
    }

    csvLines.push(row.join(','))
  })

  return csvLines.join('\n')
}

function generateJSONExport(auditLogs: any[], companySettings: any, includeDetails: boolean): string {
  const exportData = {
    metadata: {
      company: companySettings?.company_name || 'InvoiceComply',
      siret: companySettings?.siret || 'N/A',
      exportDate: new Date().toISOString(),
      recordCount: auditLogs.length,
      includeDetails
    },
    auditLogs: auditLogs.map(log => {
      const entry: any = {
        id: log.id,
        action: log.action,
        actionLabel: getActionLabel(log.action),
        timestamp: log.created_at,
        formattedDate: new Date(log.created_at).toLocaleString('fr-FR')
      }

      if (includeDetails) {
        entry.details = log.details
        entry.ipAddress = log.ip_address
        entry.userAgent = log.user_agent
      }

      return entry
    })
  }

  return JSON.stringify(exportData, null, 2)
}

async function generatePDFExport(auditLogs: any[], companySettings: any, includeDetails: boolean): Promise<string> {
  // For now, return a base64 encoded placeholder
  // In production, use a PDF library like jsPDF or puppeteer
  const content = `
    RAPPORT D'AUDIT - ${companySettings?.company_name || 'InvoiceComply'}
    SIRET: ${companySettings?.siret || 'N/A'}
    Généré le: ${new Date().toLocaleString('fr-FR')}
    
    Nombre d'entrées: ${auditLogs.length}
    
    ${auditLogs.map(log => 
      `${new Date(log.created_at).toLocaleString('fr-FR')} - ${getActionLabel(log.action)}`
    ).join('\n')}
  `
  
  // Return base64 encoded content (placeholder)
  return Buffer.from(content).toString('base64')
}

function getActionLabel(action: string): string {
  const actionLabels: {[key: string]: string} = {
    'invoice_uploaded': 'Facture téléchargée',
    'facturx_generated': 'Factur-X généré',
    'transmission_sent': 'Transmission envoyée',
    'compliance_check': 'Vérification conformité',
    'company_settings_updated': 'Paramètres entreprise mis à jour',
    'user_login': 'Connexion utilisateur',
    'user_logout': 'Déconnexion utilisateur',
    'audit_trail_exported': 'Journal d\'audit exporté',
    'transmission_status_updated': 'Statut transmission mis à jour',
    'webhook_status_update': 'Mise à jour via webhook'
  }

  return actionLabels[action] || action
}