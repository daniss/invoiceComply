/**
 * Invoice Transmission Tracking System
 * Unified tracking for all PDP providers and transmission methods
 */

import type { 
  TransmissionResult, 
  TransmissionStatus, 
  TrackingInfo, 
  PdpProvider 
} from '@/lib/pdp/integration'

export interface TransmissionRecord {
  id: string
  invoiceId: string
  invoiceNumber: string
  provider: PdpProvider
  senderSiret: string
  recipientSiret: string
  recipientName?: string
  status: TransmissionStatus
  submittedAt: Date
  lastUpdatedAt: Date
  deliveredAt?: Date
  acknowledgedAt?: Date
  metadata: {
    totalAmount: number
    currency: string
    fileName: string
    fileSize: number
    transmissionId: string
    referenceNumber?: string
  }
  tracking: TrackingInfo
  retryCount: number
  nextRetryAt?: Date
  errors: Array<{
    timestamp: Date
    code: string
    message: string
    severity: 'error' | 'warning'
  }>
  deliveryAttempts: Array<{
    timestamp: Date
    status: TransmissionStatus
    provider: PdpProvider
    response?: any
  }>
}

export interface TransmissionFilter {
  status?: TransmissionStatus[]
  provider?: PdpProvider[]
  senderSiret?: string
  recipientSiret?: string
  dateFrom?: Date
  dateTo?: Date
  invoiceNumber?: string
  hasErrors?: boolean
}

export interface TransmissionSummary {
  totalTransmissions: number
  byStatus: Record<TransmissionStatus, number>
  byProvider: Record<PdpProvider, number>
  successRate: number
  averageDeliveryTime: number // in hours
  failureReasons: Array<{
    code: string
    count: number
    message: string
  }>
  lastUpdated: Date
}

export interface RetryStrategy {
  maxAttempts: number
  initialDelayMs: number
  backoffMultiplier: number
  maxDelayMs: number
  retryableStatuses: TransmissionStatus[]
  retryableErrorCodes: string[]
}

/**
 * Transmission Tracking Manager
 */
export class TransmissionTracker {
  private records: Map<string, TransmissionRecord> = new Map()
  private retryStrategy: RetryStrategy

  constructor(retryStrategy?: Partial<RetryStrategy>) {
    this.retryStrategy = {
      maxAttempts: 3,
      initialDelayMs: 5 * 60 * 1000, // 5 minutes
      backoffMultiplier: 2,
      maxDelayMs: 2 * 60 * 60 * 1000, // 2 hours
      retryableStatuses: ['failed'],
      retryableErrorCodes: ['NETWORK_ERROR', 'TIMEOUT', 'TEMPORARY_ERROR'],
      ...retryStrategy
    }
  }

  /**
   * Record a new transmission
   */
  recordTransmission(
    invoiceId: string,
    invoiceNumber: string,
    result: TransmissionResult,
    provider: PdpProvider,
    metadata: {
      totalAmount: number
      currency: string
      fileName: string
      fileSize: number
      senderSiret: string
    }
  ): string {
    const recordId = this.generateRecordId()
    
    const record: TransmissionRecord = {
      id: recordId,
      invoiceId,
      invoiceNumber,
      provider,
      senderSiret: metadata.senderSiret,
      recipientSiret: result.recipient.siret,
      recipientName: result.recipient.name,
      status: result.status,
      submittedAt: result.timestamp,
      lastUpdatedAt: result.timestamp,
      deliveredAt: result.status === 'delivered' ? result.timestamp : undefined,
      acknowledgedAt: result.status === 'acknowledged' ? result.timestamp : undefined,
      metadata: {
        totalAmount: metadata.totalAmount,
        currency: metadata.currency,
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        transmissionId: result.transmissionId,
        referenceNumber: result.tracking.referenceNumber
      },
      tracking: {
        transmissionId: result.transmissionId,
        currentStatus: result.status,
        statusHistory: [{
          status: result.status,
          timestamp: result.timestamp,
          message: 'Transmission initiated'
        }],
        errors: result.errors || [],
        retryCount: 0
      },
      retryCount: 0,
      errors: (result.errors || []).map(err => ({
        timestamp: result.timestamp,
        code: err.code,
        message: err.message,
        severity: err.severity
      })),
      deliveryAttempts: [{
        timestamp: result.timestamp,
        status: result.status,
        provider,
        response: result
      }]
    }

    // Schedule retry if needed
    if (this.shouldScheduleRetry(record)) {
      this.scheduleRetry(record)
    }

    this.records.set(recordId, record)
    return recordId
  }

  /**
   * Update transmission status
   */
  updateTransmissionStatus(
    recordId: string,
    trackingInfo: TrackingInfo,
    provider?: PdpProvider
  ): boolean {
    const record = this.records.get(recordId)
    if (!record) return false

    const previousStatus = record.status
    record.status = trackingInfo.currentStatus
    record.lastUpdatedAt = new Date()
    record.tracking = trackingInfo

    // Update delivery timestamps
    if (trackingInfo.currentStatus === 'delivered' && !record.deliveredAt) {
      record.deliveredAt = new Date()
    }
    if (trackingInfo.currentStatus === 'acknowledged' && !record.acknowledgedAt) {
      record.acknowledgedAt = new Date()
    }

    // Add to delivery attempts if status changed
    if (previousStatus !== trackingInfo.currentStatus) {
      record.deliveryAttempts.push({
        timestamp: new Date(),
        status: trackingInfo.currentStatus,
        provider: provider || record.provider
      })
    }

    // Add new errors
    if (trackingInfo.errors.length > 0) {
      const newErrors = trackingInfo.errors.map(err => ({
        timestamp: new Date(),
        code: err.code,
        message: err.message,
        severity: err.severity
      }))
      record.errors.push(...newErrors)
    }

    // Handle retry logic
    if (this.shouldScheduleRetry(record)) {
      this.scheduleRetry(record)
    } else if (trackingInfo.currentStatus === 'delivered' || trackingInfo.currentStatus === 'acknowledged') {
      // Clear retry if successfully delivered
      record.nextRetryAt = undefined
    }

    this.records.set(recordId, record)
    return true
  }

  /**
   * Get transmission record
   */
  getTransmission(recordId: string): TransmissionRecord | undefined {
    return this.records.get(recordId)
  }

  /**
   * Find transmission by criteria
   */
  findTransmissions(filter: TransmissionFilter = {}): TransmissionRecord[] {
    const results: TransmissionRecord[] = []

    for (const record of this.records.values()) {
      if (this.matchesFilter(record, filter)) {
        results.push(record)
      }
    }

    // Sort by submission date (newest first)
    return results.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
  }

  /**
   * Get transmissions that need retry
   */
  getTransmissionsNeedingRetry(): TransmissionRecord[] {
    const now = new Date()
    return Array.from(this.records.values()).filter(record => 
      record.nextRetryAt && 
      record.nextRetryAt <= now &&
      record.retryCount < this.retryStrategy.maxAttempts
    )
  }

  /**
   * Mark transmission as retried
   */
  markAsRetried(recordId: string): boolean {
    const record = this.records.get(recordId)
    if (!record) return false

    record.retryCount++
    record.lastUpdatedAt = new Date()
    
    if (record.retryCount >= this.retryStrategy.maxAttempts) {
      record.nextRetryAt = undefined
      record.status = 'failed'
    } else {
      this.scheduleRetry(record)
    }

    this.records.set(recordId, record)
    return true
  }

  /**
   * Get transmission summary/statistics
   */
  getTransmissionSummary(filter: TransmissionFilter = {}): TransmissionSummary {
    const transmissions = this.findTransmissions(filter)
    
    const byStatus: Record<TransmissionStatus, number> = {
      pending: 0,
      submitted: 0,
      delivered: 0,
      acknowledged: 0,
      rejected: 0,
      failed: 0,
      cancelled: 0
    }

    const byProvider: Record<PdpProvider, number> = {
      chorus_pro: 0,
      custom_partner: 0,
      peppol: 0
    }

    const failureReasons = new Map<string, { count: number; message: string }>()
    let totalDeliveryTime = 0
    let deliveredCount = 0

    transmissions.forEach(record => {
      byStatus[record.status]++
      byProvider[record.provider]++

      // Calculate delivery time
      if (record.deliveredAt) {
        const deliveryTime = record.deliveredAt.getTime() - record.submittedAt.getTime()
        totalDeliveryTime += deliveryTime
        deliveredCount++
      }

      // Collect failure reasons
      record.errors.forEach(error => {
        const existing = failureReasons.get(error.code)
        if (existing) {
          existing.count++
        } else {
          failureReasons.set(error.code, {
            count: 1,
            message: error.message
          })
        }
      })
    })

    const successfulTransmissions = byStatus.delivered + byStatus.acknowledged
    const successRate = transmissions.length > 0 
      ? (successfulTransmissions / transmissions.length) * 100 
      : 0

    const averageDeliveryTime = deliveredCount > 0 
      ? totalDeliveryTime / deliveredCount / (1000 * 60 * 60) // Convert to hours
      : 0

    return {
      totalTransmissions: transmissions.length,
      byStatus,
      byProvider,
      successRate: Math.round(successRate * 100) / 100,
      averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100,
      failureReasons: Array.from(failureReasons.entries()).map(([code, data]) => ({
        code,
        count: data.count,
        message: data.message
      })).sort((a, b) => b.count - a.count),
      lastUpdated: new Date()
    }
  }

  /**
   * Export transmission data
   */
  exportTransmissions(filter: TransmissionFilter = {}): string {
    const transmissions = this.findTransmissions(filter)
    
    const csvHeaders = [
      'ID',
      'Invoice Number',
      'Provider',
      'Sender SIRET',
      'Recipient SIRET',
      'Status',
      'Submitted At',
      'Delivered At',
      'Amount',
      'Currency',
      'Retry Count',
      'Errors'
    ]

    const csvRows = transmissions.map(record => [
      record.id,
      record.invoiceNumber,
      record.provider,
      record.senderSiret,
      record.recipientSiret,
      record.status,
      record.submittedAt.toISOString(),
      record.deliveredAt?.toISOString() || '',
      record.metadata.totalAmount,
      record.metadata.currency,
      record.retryCount,
      record.errors.map(e => `${e.code}: ${e.message}`).join('; ')
    ])

    return [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
  }

  /**
   * Clean up old records
   */
  cleanup(olderThanDays: number = 90): number {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    
    let deletedCount = 0
    
    for (const [id, record] of this.records.entries()) {
      if (record.submittedAt < cutoffDate && 
          ['delivered', 'acknowledged', 'failed', 'cancelled'].includes(record.status)) {
        this.records.delete(id)
        deletedCount++
      }
    }
    
    return deletedCount
  }

  /**
   * Check if record matches filter
   */
  private matchesFilter(record: TransmissionRecord, filter: TransmissionFilter): boolean {
    if (filter.status && !filter.status.includes(record.status)) {
      return false
    }
    
    if (filter.provider && !filter.provider.includes(record.provider)) {
      return false
    }
    
    if (filter.senderSiret && record.senderSiret !== filter.senderSiret) {
      return false
    }
    
    if (filter.recipientSiret && record.recipientSiret !== filter.recipientSiret) {
      return false
    }
    
    if (filter.invoiceNumber && !record.invoiceNumber.toLowerCase().includes(filter.invoiceNumber.toLowerCase())) {
      return false
    }
    
    if (filter.dateFrom && record.submittedAt < filter.dateFrom) {
      return false
    }
    
    if (filter.dateTo && record.submittedAt > filter.dateTo) {
      return false
    }
    
    if (filter.hasErrors !== undefined) {
      const hasErrors = record.errors.length > 0
      if (filter.hasErrors !== hasErrors) {
        return false
      }
    }
    
    return true
  }

  /**
   * Check if transmission should be retried
   */
  private shouldScheduleRetry(record: TransmissionRecord): boolean {
    return (
      record.retryCount < this.retryStrategy.maxAttempts &&
      (this.retryStrategy.retryableStatuses.includes(record.status) ||
       record.errors.some(error => this.retryStrategy.retryableErrorCodes.includes(error.code)))
    )
  }

  /**
   * Schedule retry for transmission
   */
  private scheduleRetry(record: TransmissionRecord): void {
    const delay = Math.min(
      this.retryStrategy.initialDelayMs * Math.pow(this.retryStrategy.backoffMultiplier, record.retryCount),
      this.retryStrategy.maxDelayMs
    )
    
    record.nextRetryAt = new Date(Date.now() + delay)
  }

  /**
   * Generate unique record ID
   */
  private generateRecordId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }
}

/**
 * Global transmission tracker instance
 */
export const globalTransmissionTracker = new TransmissionTracker()

/**
 * Utility functions for transmission tracking
 */

/**
 * Format transmission status for display
 */
export function formatTransmissionStatus(status: TransmissionStatus): string {
  const statusMap: Record<TransmissionStatus, string> = {
    pending: 'En attente',
    submitted: 'Envoyée',
    delivered: 'Livrée',
    acknowledged: 'Accusé de réception',
    rejected: 'Rejetée',
    failed: 'Échec',
    cancelled: 'Annulée'
  }
  
  return statusMap[status] || status
}

/**
 * Get status color for UI
 */
export function getTransmissionStatusColor(status: TransmissionStatus): string {
  const colorMap: Record<TransmissionStatus, string> = {
    pending: 'text-yellow-600 bg-yellow-50',
    submitted: 'text-blue-600 bg-blue-50',
    delivered: 'text-green-600 bg-green-50',
    acknowledged: 'text-green-700 bg-green-100',
    rejected: 'text-red-600 bg-red-50',
    failed: 'text-red-700 bg-red-100',
    cancelled: 'text-gray-600 bg-gray-50'
  }
  
  return colorMap[status] || 'text-gray-600 bg-gray-50'
}

/**
 * Calculate transmission health score
 */
export function calculateHealthScore(summary: TransmissionSummary): {
  score: number
  level: 'excellent' | 'good' | 'warning' | 'critical'
  issues: string[]
} {
  const issues: string[] = []
  let score = 100

  // Success rate impact (50% of score)
  if (summary.successRate < 95) {
    score -= (95 - summary.successRate) * 0.5
    if (summary.successRate < 90) {
      issues.push('Taux de succès faible')
    }
  }

  // Average delivery time impact (30% of score)
  if (summary.averageDeliveryTime > 24) {
    score -= Math.min((summary.averageDeliveryTime - 24) * 2, 30)
    if (summary.averageDeliveryTime > 48) {
      issues.push('Temps de livraison élevé')
    }
  }

  // Error frequency impact (20% of score)
  const errorRate = summary.failureReasons.reduce((sum, reason) => sum + reason.count, 0) / summary.totalTransmissions
  if (errorRate > 0.05) {
    score -= (errorRate - 0.05) * 400
    issues.push('Taux d\'erreur élevé')
  }

  score = Math.max(0, Math.min(100, score))

  let level: 'excellent' | 'good' | 'warning' | 'critical'
  if (score >= 90) level = 'excellent'
  else if (score >= 75) level = 'good'
  else if (score >= 50) level = 'warning'
  else level = 'critical'

  return {
    score: Math.round(score),
    level,
    issues
  }
}