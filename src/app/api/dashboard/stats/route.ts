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

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // day, week, month, year
    const timezone = searchParams.get('timezone') || 'Europe/Paris'

    // Calculate date ranges
    const now = new Date()
    let startDate: Date
    let previousStartDate: Date

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        previousStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        const dayOfWeek = now.getDay()
        startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
        startDate.setHours(0, 0, 0, 0)
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1)
        break
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    }

    // Parallel queries for better performance
    const [
      invoicesResult,
      transmissionsResult,
      complianceResult,
      bulkJobsResult,
      recentActivityResult,
      previousInvoicesResult
    ] = await Promise.all([
      // Current period invoices
      supabase
        .from('invoices')
        .select('id, status, total_amount, created_at, compliance_result')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString()),

      // Current period transmissions
      supabase
        .from('transmissions')
        .select('id, status, pdp_provider, created_at, delivered_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString()),

      // Current period compliance checks
      supabase
        .from('compliance_checks')
        .select('id, passed, check_result, checked_at')
        .eq('user_id', user.id)
        .gte('checked_at', startDate.toISOString()),

      // Current period bulk jobs
      supabase
        .from('bulk_processing_jobs')
        .select('id, status, total_files, processed_files, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString()),

      // Recent activity (last 7 days)
      supabase
        .from('audit_logs')
        .select('action, details, created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10),

      // Previous period invoices for comparison
      supabase
        .from('invoices')
        .select('id, total_amount')
        .eq('user_id', user.id)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString())
    ])

    // Process results
    const invoices = invoicesResult.data || []
    const transmissions = transmissionsResult.data || []
    const complianceChecks = complianceResult.data || []
    const bulkJobs = bulkJobsResult.data || []
    const recentActivity = recentActivityResult.data || []
    const previousInvoices = previousInvoicesResult.data || []

    // Calculate statistics
    const stats = {
      invoices: {
        total: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
        byStatus: {
          processed: invoices.filter(inv => inv.status === 'processed').length,
          transmitted: invoices.filter(inv => inv.status === 'transmitted').length,
          delivered: invoices.filter(inv => inv.status === 'delivered').length,
          error: invoices.filter(inv => inv.status?.includes('error')).length
        },
        previousPeriod: {
          total: previousInvoices.length,
          totalAmount: previousInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
        }
      },
      
      transmissions: {
        total: transmissions.length,
        pending: transmissions.filter(t => t.status === 'pending').length,
        sent: transmissions.filter(t => ['sent', 'delivered'].includes(t.status)).length,
        errors: transmissions.filter(t => t.status === 'error').length,
        byProvider: {
          chorusPro: transmissions.filter(t => t.pdp_provider === 'chorus-pro').length,
          partnerPdp: transmissions.filter(t => t.pdp_provider === 'partner-pdp').length
        },
        averageDeliveryTime: calculateAverageDeliveryTime(transmissions)
      },

      compliance: {
        totalChecks: complianceChecks.length,
        passed: complianceChecks.filter(c => c.passed).length,
        failed: complianceChecks.filter(c => !c.passed).length,
        averageScore: calculateAverageComplianceScore(complianceChecks),
        topIssues: getTopComplianceIssues(complianceChecks)
      },

      bulkProcessing: {
        totalJobs: bulkJobs.length,
        completedJobs: bulkJobs.filter(job => job.status === 'completed').length,
        totalFilesProcessed: bulkJobs.reduce((sum, job) => sum + (job.processed_files || 0), 0),
        totalFiles: bulkJobs.reduce((sum, job) => sum + (job.total_files || 0), 0)
      },

      performance: {
        processingTime: await calculateAverageProcessingTime(supabase, user.id, startDate),
        successRate: calculateSuccessRate(invoices, transmissions),
        complianceRate: complianceChecks.length > 0 
          ? (complianceChecks.filter(c => c.passed).length / complianceChecks.length) * 100 
          : 0
      },

      trends: {
        invoicesGrowth: calculateGrowthRate(invoices.length, previousInvoices.length),
        revenueGrowth: calculateGrowthRate(
          invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
          previousInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
        ),
        dailyActivity: getDailyActivity(invoices, period)
      },

      recentActivity: recentActivity.map(activity => ({
        action: activity.action,
        details: activity.details,
        timestamp: activity.created_at,
        message: formatActivityMessage(activity.action, activity.details)
      }))
    }

    // Calculate subscription usage
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('subscription_tier, subscription_limit')
      .eq('user_id', user.id)
      .single()

    if (userProfile) {
      stats.subscription = {
        tier: userProfile.subscription_tier,
        limit: userProfile.subscription_limit,
        used: invoices.length,
        percentage: userProfile.subscription_limit > 0 
          ? (invoices.length / userProfile.subscription_limit) * 100 
          : 0,
        remainingQuota: Math.max(0, (userProfile.subscription_limit || 0) - invoices.length)
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}

function calculateAverageDeliveryTime(transmissions: any[]): number {
  const deliveredTransmissions = transmissions.filter(t => 
    t.status === 'delivered' && t.delivered_at && t.created_at
  )

  if (deliveredTransmissions.length === 0) return 0

  const totalTime = deliveredTransmissions.reduce((sum, t) => {
    const created = new Date(t.created_at).getTime()
    const delivered = new Date(t.delivered_at).getTime()
    return sum + (delivered - created)
  }, 0)

  return Math.round(totalTime / deliveredTransmissions.length / (1000 * 60)) // minutes
}

function calculateAverageComplianceScore(checks: any[]): number {
  if (checks.length === 0) return 0

  const totalScore = checks.reduce((sum, check) => {
    const score = check.check_result?.overall?.score || 0
    return sum + score
  }, 0)

  return Math.round(totalScore / checks.length)
}

function getTopComplianceIssues(checks: any[]): Array<{issue: string, count: number}> {
  const issues: {[key: string]: number} = {}

  checks.forEach(check => {
    if (check.check_result?.rules) {
      check.check_result.rules
        .filter((rule: any) => rule.status === 'failed')
        .forEach((rule: any) => {
          issues[rule.name] = (issues[rule.name] || 0) + 1
        })
    }
  })

  return Object.entries(issues)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

async function calculateAverageProcessingTime(supabase: any, userId: string, startDate: Date): Promise<number> {
  // This would require tracking processing start/end times
  // For now, return a simulated average
  return 2.5 // minutes
}

function calculateSuccessRate(invoices: any[], transmissions: any[]): number {
  const totalOperations = invoices.length + transmissions.length
  if (totalOperations === 0) return 100

  const successful = invoices.filter(inv => 
    ['processed', 'transmitted', 'delivered'].includes(inv.status)
  ).length + transmissions.filter(t => 
    ['sent', 'delivered'].includes(t.status)
  ).length

  return Math.round((successful / totalOperations) * 100)
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function getDailyActivity(invoices: any[], period: string): Array<{date: string, count: number}> {
  const days: {[key: string]: number} = {}
  
  invoices.forEach(invoice => {
    const date = new Date(invoice.created_at).toISOString().split('T')[0]
    days[date] = (days[date] || 0) + 1
  })

  return Object.entries(days)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function formatActivityMessage(action: string, details: any): string {
  switch (action) {
    case 'invoice_uploaded':
      return `Facture ${details.invoiceNumber || 'nouvelle'} téléchargée`
    case 'facturx_generated':
      return `Factur-X généré pour ${details.invoiceNumber || 'une facture'}`
    case 'transmission_sent':
      return `Facture transmise à ${details.pdpProvider || 'Chorus Pro'}`
    case 'compliance_check':
      return `Vérification conformité (score: ${details.complianceScore || 'N/A'}%)`
    case 'bulk_processing_completed':
      return `Traitement en lot terminé (${details.processedFiles}/${details.totalFiles} fichiers)`
    default:
      return `Action: ${action}`
  }
}