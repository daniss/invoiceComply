/**
 * Compliance Reporting and Analytics System
 * Provides detailed insights into French e-invoicing compliance
 */

import type { ExtractedInvoiceData } from '@/lib/pdf/parser'
import type { ComplianceReport } from '@/lib/compliance/validation-engine'
import type { TransmissionRecord, TransmissionSummary } from '@/lib/transmission/tracking-system'

export interface ComplianceMetrics {
  period: {
    from: Date
    to: Date
  }
  overview: {
    totalInvoices: number
    compliantInvoices: number
    complianceRate: number
    averageComplianceScore: number
  }
  categories: {
    legal: CategoryMetrics
    format: CategoryMetrics
    business: CategoryMetrics
    technical: CategoryMetrics
  }
  trends: {
    daily: DailyMetric[]
    weekly: WeeklyMetric[]
    monthly: MonthlyMetric[]
  }
  topIssues: Array<{
    ruleId: string
    description: string
    frequency: number
    severity: 'critical' | 'high' | 'medium' | 'low'
    trend: 'increasing' | 'stable' | 'decreasing'
  }>
  recommendations: ComplianceRecommendation[]
}

export interface CategoryMetrics {
  score: number
  totalRules: number
  passedRules: number
  criticalIssues: number
  improvement: number // percentage change from previous period
}

export interface DailyMetric {
  date: Date
  totalInvoices: number
  compliantInvoices: number
  averageScore: number
  criticalIssues: number
}

export interface WeeklyMetric {
  weekStart: Date
  totalInvoices: number
  complianceRate: number
  averageScore: number
  topIssues: string[]
}

export interface MonthlyMetric {
  month: Date
  totalInvoices: number
  complianceRate: number
  averageScore: number
  transmissionSuccess: number
  costSavings: number
}

export interface ComplianceRecommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  category: 'legal' | 'format' | 'business' | 'technical'
  title: string
  description: string
  impact: string
  effort: 'low' | 'medium' | 'high'
  expectedImprovement: number // percentage points
  actionItems: string[]
}

export interface TransmissionAnalytics {
  period: {
    from: Date
    to: Date
  }
  overview: TransmissionSummary
  providers: {
    chorusPro: ProviderMetrics
    peppol: ProviderMetrics
    customPartner: ProviderMetrics
  }
  performance: {
    averageTransmissionTime: number
    peakHours: Array<{ hour: number; volume: number }>
    reliability: number
    costPerTransmission: number
  }
  geography: Array<{
    country: string
    transmissions: number
    successRate: number
    averageTime: number
  }>
  trends: {
    volumeTrend: Array<{ date: Date; volume: number }>
    successTrend: Array<{ date: Date; successRate: number }>
    costTrend: Array<{ date: Date; cost: number }>
  }
}

export interface ProviderMetrics {
  totalTransmissions: number
  successRate: number
  averageTime: number
  reliability: number
  cost: number
  lastIncident?: Date
}

export interface CostAnalysis {
  period: {
    from: Date
    to: Date
  }
  breakdown: {
    processing: number
    transmission: number
    storage: number
    compliance: number
    support: number
  }
  savings: {
    paperElimination: number
    timeReduction: number
    errorReduction: number
    automationBenefits: number
  }
  roi: {
    totalInvestment: number
    totalSavings: number
    roiPercentage: number
    paybackPeriod: number // months
  }
  projections: Array<{
    month: Date
    projectedCost: number
    projectedSavings: number
    cumulativeRoi: number
  }>
}

/**
 * Compliance Analytics Engine
 */
export class ComplianceAnalytics {
  private invoiceData: Map<string, { invoice: ExtractedInvoiceData; report: ComplianceReport; timestamp: Date }> = new Map()
  private transmissionData: Map<string, TransmissionRecord> = new Map()

  /**
   * Record invoice compliance data
   */
  recordInvoiceCompliance(
    invoiceId: string,
    invoice: ExtractedInvoiceData,
    report: ComplianceReport
  ): void {
    this.invoiceData.set(invoiceId, {
      invoice,
      report,
      timestamp: new Date()
    })
  }

  /**
   * Record transmission data
   */
  recordTransmission(transmissionRecord: TransmissionRecord): void {
    this.transmissionData.set(transmissionRecord.id, transmissionRecord)
  }

  /**
   * Generate compliance metrics for a period
   */
  generateComplianceMetrics(fromDate: Date, toDate: Date): ComplianceMetrics {
    const periodData = this.getDataForPeriod(fromDate, toDate)
    
    if (periodData.length === 0) {
      return this.getEmptyMetrics(fromDate, toDate)
    }

    const totalInvoices = periodData.length
    const compliantInvoices = periodData.filter(d => d.report.overall.level === 'compliant').length
    const complianceRate = (compliantInvoices / totalInvoices) * 100
    const averageScore = periodData.reduce((sum, d) => sum + d.report.overall.score, 0) / totalInvoices

    // Calculate category metrics
    const categories = this.calculateCategoryMetrics(periodData)

    // Generate trends
    const trends = this.generateTrends(periodData, fromDate, toDate)

    // Identify top issues
    const topIssues = this.identifyTopIssues(periodData)

    // Generate recommendations
    const recommendations = this.generateRecommendations(periodData, categories)

    return {
      period: { from: fromDate, to: toDate },
      overview: {
        totalInvoices,
        compliantInvoices,
        complianceRate: Math.round(complianceRate * 100) / 100,
        averageComplianceScore: Math.round(averageScore * 100) / 100
      },
      categories,
      trends,
      topIssues,
      recommendations
    }
  }

  /**
   * Generate transmission analytics
   */
  generateTransmissionAnalytics(fromDate: Date, toDate: Date): TransmissionAnalytics {
    const transmissions = Array.from(this.transmissionData.values())
      .filter(t => t.submittedAt >= fromDate && t.submittedAt <= toDate)

    if (transmissions.length === 0) {
      return this.getEmptyTransmissionAnalytics(fromDate, toDate)
    }

    // Calculate overview
    const overview = this.calculateTransmissionSummary(transmissions)

    // Provider metrics
    const providers = this.calculateProviderMetrics(transmissions)

    // Performance metrics
    const performance = this.calculatePerformanceMetrics(transmissions)

    // Geography analysis
    const geography = this.calculateGeographyMetrics(transmissions)

    // Trends
    const trends = this.calculateTransmissionTrends(transmissions, fromDate, toDate)

    return {
      period: { from: fromDate, to: toDate },
      overview,
      providers,
      performance,
      geography,
      trends
    }
  }

  /**
   * Generate cost analysis
   */
  generateCostAnalysis(fromDate: Date, toDate: Date): CostAnalysis {
    const transmissions = Array.from(this.transmissionData.values())
      .filter(t => t.submittedAt >= fromDate && t.submittedAt <= toDate)

    const invoices = Array.from(this.invoiceData.values())
      .filter(d => d.timestamp >= fromDate && d.timestamp <= toDate)

    // Calculate costs
    const breakdown = this.calculateCostBreakdown(transmissions, invoices)
    
    // Calculate savings
    const savings = this.calculateSavings(transmissions, invoices)
    
    // Calculate ROI
    const roi = this.calculateROI(breakdown, savings)
    
    // Generate projections
    const projections = this.generateCostProjections(breakdown, savings, fromDate)

    return {
      period: { from: fromDate, to: toDate },
      breakdown,
      savings,
      roi,
      projections
    }
  }

  /**
   * Export compliance report
   */
  exportComplianceReport(
    metrics: ComplianceMetrics,
    format: 'pdf' | 'excel' | 'json'
  ): Buffer | string {
    switch (format) {
      case 'json':
        return JSON.stringify(metrics, null, 2)
      case 'excel':
        return this.generateExcelReport(metrics)
      case 'pdf':
        return this.generatePdfReport(metrics)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Get real-time compliance dashboard data
   */
  getDashboardData(): {
    current: {
      complianceRate: number
      totalInvoices: number
      criticalIssues: number
      transmissionSuccess: number
    }
    alerts: Array<{
      severity: 'critical' | 'warning' | 'info'
      message: string
      timestamp: Date
    }>
    recentActivity: Array<{
      type: 'invoice_processed' | 'transmission_sent' | 'compliance_issue'
      message: string
      timestamp: Date
    }>
  } {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentData = this.getDataForPeriod(last24h, new Date())
    const recentTransmissions = Array.from(this.transmissionData.values())
      .filter(t => t.submittedAt >= last24h)

    const complianceRate = recentData.length > 0 
      ? (recentData.filter(d => d.report.overall.level === 'compliant').length / recentData.length) * 100
      : 0

    const criticalIssues = recentData.reduce((sum, d) => 
      sum + d.report.rules.filter(r => !r.result.passed && r.result.impact === 'critical').length, 0
    )

    const transmissionSuccess = recentTransmissions.length > 0
      ? (recentTransmissions.filter(t => t.status === 'delivered' || t.status === 'acknowledged').length / recentTransmissions.length) * 100
      : 0

    // Generate alerts
    const alerts = this.generateRealTimeAlerts(recentData, recentTransmissions)

    // Generate recent activity
    const recentActivity = this.generateRecentActivity(recentData, recentTransmissions)

    return {
      current: {
        complianceRate: Math.round(complianceRate * 100) / 100,
        totalInvoices: recentData.length,
        criticalIssues,
        transmissionSuccess: Math.round(transmissionSuccess * 100) / 100
      },
      alerts,
      recentActivity
    }
  }

  /**
   * Get data for specific period
   */
  private getDataForPeriod(fromDate: Date, toDate: Date) {
    return Array.from(this.invoiceData.values())
      .filter(d => d.timestamp >= fromDate && d.timestamp <= toDate)
  }

  /**
   * Calculate category metrics
   */
  private calculateCategoryMetrics(data: Array<{ report: ComplianceReport }>) {
    const categories = ['legal', 'format', 'business', 'technical'] as const
    const result = {} as ComplianceMetrics['categories']

    categories.forEach(category => {
      const categoryData = data.map(d => d.report.categories[category])
      const avgScore = categoryData.reduce((sum, cat) => sum + cat.score, 0) / categoryData.length
      const totalRules = categoryData.reduce((sum, cat) => sum + cat.total, 0)
      const passedRules = categoryData.reduce((sum, cat) => sum + cat.passed, 0)
      const criticalIssues = categoryData.reduce((sum, cat) => sum + cat.critical, 0)

      result[category] = {
        score: Math.round(avgScore),
        totalRules,
        passedRules,
        criticalIssues,
        improvement: 0 // Would need historical data to calculate
      }
    })

    return result
  }

  /**
   * Generate trend data
   */
  private generateTrends(
    data: Array<{ report: ComplianceReport; timestamp: Date }>,
    fromDate: Date,
    toDate: Date
  ) {
    // Generate daily metrics
    const dailyMetrics = this.generateDailyMetrics(data, fromDate, toDate)
    
    // Generate weekly metrics
    const weeklyMetrics = this.generateWeeklyMetrics(data, fromDate, toDate)
    
    // Generate monthly metrics
    const monthlyMetrics = this.generateMonthlyMetrics(data, fromDate, toDate)

    return {
      daily: dailyMetrics,
      weekly: weeklyMetrics,
      monthly: monthlyMetrics
    }
  }

  /**
   * Identify top compliance issues
   */
  private identifyTopIssues(data: Array<{ report: ComplianceReport }>) {
    const issueMap = new Map<string, { count: number; description: string; severity: any }>()

    data.forEach(d => {
      d.report.rules.forEach(rule => {
        if (!rule.result.passed) {
          const existing = issueMap.get(rule.rule.id)
          if (existing) {
            existing.count++
          } else {
            issueMap.set(rule.rule.id, {
              count: 1,
              description: rule.rule.description,
              severity: rule.result.impact
            })
          }
        }
      })
    })

    return Array.from(issueMap.entries())
      .map(([ruleId, data]) => ({
        ruleId,
        description: data.description,
        frequency: data.count,
        severity: data.severity,
        trend: 'stable' as const // Would need historical data
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
  }

  /**
   * Generate compliance recommendations
   */
  private generateRecommendations(
    data: Array<{ report: ComplianceReport }>,
    categories: ComplianceMetrics['categories']
  ): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = []

    // Analyze categories for recommendations
    Object.entries(categories).forEach(([category, metrics]) => {
      if (metrics.score < 80) {
        recommendations.push({
          id: `improve-${category}`,
          priority: metrics.criticalIssues > 0 ? 'high' : 'medium',
          category: category as any,
          title: `Améliorer la conformité ${category}`,
          description: `Le score de conformité ${category} est de ${metrics.score}%, en dessous du seuil recommandé de 80%`,
          impact: `Amélioration estimée de ${100 - metrics.score} points`,
          effort: metrics.criticalIssues > 5 ? 'high' : 'medium',
          expectedImprovement: Math.min(20, 100 - metrics.score),
          actionItems: this.getActionItemsForCategory(category as any, metrics)
        })
      }
    })

    return recommendations.slice(0, 5) // Top 5 recommendations
  }

  /**
   * Get action items for category improvement
   */
  private getActionItemsForCategory(category: string, metrics: CategoryMetrics): string[] {
    const actionMap = {
      legal: [
        'Vérifier que tous les champs obligatoires sont renseignés',
        'Valider les numéros SIRET et TVA',
        'Contrôler les montants et leur cohérence'
      ],
      format: [
        'Standardiser le format des dates (DD/MM/YYYY)',
        'Vérifier la cohérence des calculs HT + TVA = TTC',
        'Normaliser la structure des données'
      ],
      business: [
        'Respecter les délais de paiement légaux',
        'Valider les taux de TVA appliqués',
        'Contrôler les informations contractuelles'
      ],
      technical: [
        'Utiliser le format XML Factur-X',
        'Valider la structure technique des fichiers',
        'Optimiser les performances de traitement'
      ]
    }

    return actionMap[category as keyof typeof actionMap] || []
  }

  // Helper methods for calculations
  private generateDailyMetrics(data: any[], fromDate: Date, toDate: Date): DailyMetric[] {
    // Implementation for daily metrics
    return []
  }

  private generateWeeklyMetrics(data: any[], fromDate: Date, toDate: Date): WeeklyMetric[] {
    // Implementation for weekly metrics
    return []
  }

  private generateMonthlyMetrics(data: any[], fromDate: Date, toDate: Date): MonthlyMetric[] {
    // Implementation for monthly metrics
    return []
  }

  private calculateTransmissionSummary(transmissions: TransmissionRecord[]): TransmissionSummary {
    // Implementation for transmission summary
    return {
      total: transmissions.length,
      successful: 0,
      pending: 0,
      failed: 0,
      successRate: 0
    }
  }

  private calculateProviderMetrics(transmissions: TransmissionRecord[]) {
    // Implementation for provider metrics
    return {
      chorusPro: this.getEmptyProviderMetrics(),
      peppol: this.getEmptyProviderMetrics(),
      customPartner: this.getEmptyProviderMetrics()
    }
  }

  private calculatePerformanceMetrics(transmissions: TransmissionRecord[]) {
    // Implementation for performance metrics
    return {
      averageTransmissionTime: 0,
      peakHours: [],
      reliability: 0,
      costPerTransmission: 0
    }
  }

  private calculateGeographyMetrics(transmissions: TransmissionRecord[]) {
    // Implementation for geography metrics
    return []
  }

  private calculateTransmissionTrends(transmissions: TransmissionRecord[], fromDate: Date, toDate: Date) {
    // Implementation for transmission trends
    return {
      volumeTrend: [],
      successTrend: [],
      costTrend: []
    }
  }

  private calculateCostBreakdown(transmissions: TransmissionRecord[], invoices: any[]) {
    return {
      processing: transmissions.length * 0.05,
      transmission: transmissions.length * 0.10,
      storage: invoices.length * 0.01,
      compliance: invoices.length * 0.02,
      support: 50
    }
  }

  private calculateSavings(transmissions: TransmissionRecord[], invoices: any[]) {
    return {
      paperElimination: invoices.length * 2.50,
      timeReduction: invoices.length * 5.00,
      errorReduction: invoices.length * 1.50,
      automationBenefits: invoices.length * 3.00
    }
  }

  private calculateROI(breakdown: any, savings: any) {
    const totalCost = Object.values(breakdown).reduce((sum: number, cost: any) => sum + cost, 0)
    const totalSavings = Object.values(savings).reduce((sum: number, saving: any) => sum + saving, 0)
    
    return {
      totalInvestment: totalCost,
      totalSavings,
      roiPercentage: totalCost > 0 ? ((totalSavings - totalCost) / totalCost) * 100 : 0,
      paybackPeriod: totalSavings > 0 ? (totalCost / (totalSavings / 12)) : 0
    }
  }

  private generateCostProjections(breakdown: any, savings: any, fromDate: Date) {
    const projections = []
    const monthlyCost = Object.values(breakdown).reduce((sum: number, cost: any) => sum + cost, 0)
    const monthlySavings = Object.values(savings).reduce((sum: number, saving: any) => sum + saving, 0)
    
    for (let i = 0; i < 12; i++) {
      const month = new Date(fromDate)
      month.setMonth(month.getMonth() + i)
      
      projections.push({
        month,
        projectedCost: monthlyCost,
        projectedSavings: monthlySavings,
        cumulativeRoi: ((monthlySavings - monthlyCost) * (i + 1))
      })
    }
    
    return projections
  }

  private generateExcelReport(metrics: ComplianceMetrics): Buffer {
    // Implementation for Excel report generation
    return Buffer.from('Excel report placeholder')
  }

  private generatePdfReport(metrics: ComplianceMetrics): Buffer {
    // Implementation for PDF report generation
    return Buffer.from('PDF report placeholder')
  }

  private generateRealTimeAlerts(invoiceData: any[], transmissionData: TransmissionRecord[]) {
    const alerts = []
    
    // Check for critical compliance issues
    const criticalIssues = invoiceData.filter(d => 
      d.report.rules.some((r: any) => !r.result.passed && r.result.impact === 'critical')
    ).length
    
    if (criticalIssues > 0) {
      alerts.push({
        severity: 'critical' as const,
        message: `${criticalIssues} facture(s) avec des problèmes critiques de conformité`,
        timestamp: new Date()
      })
    }
    
    // Check for transmission failures
    const failedTransmissions = transmissionData.filter(t => t.status === 'failed').length
    if (failedTransmissions > 0) {
      alerts.push({
        severity: 'warning' as const,
        message: `${failedTransmissions} transmission(s) en échec`,
        timestamp: new Date()
      })
    }
    
    return alerts
  }

  private generateRecentActivity(invoiceData: any[], transmissionData: TransmissionRecord[]) {
    const activity = []
    
    // Recent invoices
    invoiceData.slice(0, 5).forEach(d => {
      activity.push({
        type: 'invoice_processed' as const,
        message: `Facture ${d.invoice.invoiceNumber} traitée`,
        timestamp: d.timestamp
      })
    })
    
    // Recent transmissions
    transmissionData.slice(0, 5).forEach(t => {
      activity.push({
        type: 'transmission_sent' as const,
        message: `Transmission vers ${t.recipientSiret} - ${t.status}`,
        timestamp: t.submittedAt
      })
    })
    
    return activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10)
  }

  private getEmptyMetrics(fromDate: Date, toDate: Date): ComplianceMetrics {
    return {
      period: { from: fromDate, to: toDate },
      overview: { totalInvoices: 0, compliantInvoices: 0, complianceRate: 0, averageComplianceScore: 0 },
      categories: {
        legal: { score: 0, totalRules: 0, passedRules: 0, criticalIssues: 0, improvement: 0 },
        format: { score: 0, totalRules: 0, passedRules: 0, criticalIssues: 0, improvement: 0 },
        business: { score: 0, totalRules: 0, passedRules: 0, criticalIssues: 0, improvement: 0 },
        technical: { score: 0, totalRules: 0, passedRules: 0, criticalIssues: 0, improvement: 0 }
      },
      trends: { daily: [], weekly: [], monthly: [] },
      topIssues: [],
      recommendations: []
    }
  }

  private getEmptyTransmissionAnalytics(fromDate: Date, toDate: Date): TransmissionAnalytics {
    return {
      period: { from: fromDate, to: toDate },
      overview: { total: 0, successful: 0, pending: 0, failed: 0, successRate: 0 },
      providers: {
        chorusPro: this.getEmptyProviderMetrics(),
        peppol: this.getEmptyProviderMetrics(),
        customPartner: this.getEmptyProviderMetrics()
      },
      performance: { averageTransmissionTime: 0, peakHours: [], reliability: 0, costPerTransmission: 0 },
      geography: [],
      trends: { volumeTrend: [], successTrend: [], costTrend: [] }
    }
  }

  private getEmptyProviderMetrics(): ProviderMetrics {
    return {
      totalTransmissions: 0,
      successRate: 0,
      averageTime: 0,
      reliability: 0,
      cost: 0
    }
  }
}

/**
 * Global analytics instance
 */
export const globalComplianceAnalytics = new ComplianceAnalytics()