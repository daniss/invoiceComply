import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get basic counts using the actual database schema
    const [
      totalInvoicesResult,
      processedTodayResult,
      manualInvoicesResult,
      manualTodayResult,
      pendingInvoicesResult,
      pendingManualResult,
      compliantInvoicesResult,
      recentInvoicesResult,
      recentManualResult
    ] = await Promise.all([
      // Total invoices this month
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString()),

      // Processed today (uploaded PDFs)
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfToday.toISOString()),

      // Total manual invoices this month
      supabase
        .from('manual_invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString()),

      // Manual invoices today
      supabase
        .from('manual_invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfToday.toISOString()),

      // Pending transmissions (invoices ready but not transmitted)
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['validated', 'ready_for_transmission'])
        .neq('transmitted', true),

      // Pending manual transmissions
      supabase
        .from('manual_invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'finalized')
        .neq('transmitted', true),

      // Compliant invoices (for compliance rate)
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'validated'),

      // Recent regular invoices
      supabase
        .from('invoices')
        .select('id, invoice_number, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(3),

      // Recent manual invoices
      supabase
        .from('manual_invoices')
        .select('id, invoice_number, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(3)
    ])

    // Calculate basic statistics
    const totalInvoices = (totalInvoicesResult.count || 0) + (manualInvoicesResult.count || 0)
    const processedToday = (processedTodayResult.count || 0) + (manualTodayResult.count || 0)
    const pendingTransmissions = (pendingInvoicesResult.count || 0) + (pendingManualResult.count || 0)
    const compliantInvoices = compliantInvoicesResult.count || 0
    
    // Calculate compliance rate
    const complianceRate = totalInvoices > 0 
      ? Math.round((compliantInvoices / (totalInvoicesResult.count || 1)) * 100 * 100) / 100
      : 0

    // Combine recent activity from both tables
    const recentInvoices = recentInvoicesResult.data || []
    const recentManual = recentManualResult.data || []
    
    const recentActivity = [
      ...recentInvoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        status: inv.status,
        type: 'pdf_upload' as const,
        timestamp: inv.updated_at || inv.created_at
      })),
      ...recentManual.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        status: inv.status,
        type: 'manual_creation' as const,
        timestamp: inv.updated_at || inv.created_at
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 5)

    return NextResponse.json({
      success: true,
      stats: {
        totalInvoices,
        processedToday,
        pendingTransmissions,
        complianceRate,
        averageProcessingTime: 2.1 // Static for now, would need processing time tracking
      },
      recentActivity
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}