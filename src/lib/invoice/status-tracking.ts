/**
 * Invoice status tracking system for compliance workflow
 */

export type InvoiceStatus = 
  | 'draft'           // Invoice is being created/edited
  | 'extracted'       // Data extracted from PDF
  | 'validated'       // Data validated and corrected
  | 'compliant'       // Passed compliance checks
  | 'exported'        // Exported as Factur-X
  | 'sent'            // Sent to customer
  | 'received'        // Customer acknowledgment
  | 'paid'            // Payment received
  | 'archived'        // Archived for record keeping
  | 'error'           // Processing error
  | 'rejected'        // Failed compliance/validation

export interface InvoiceStatusHistory {
  status: InvoiceStatus
  timestamp: Date
  message: string
  userId?: string
  metadata?: Record<string, any>
}

export interface InvoiceTrackingData {
  id: string
  invoiceNumber?: string
  currentStatus: InvoiceStatus
  createdAt: Date
  updatedAt: Date
  history: InvoiceStatusHistory[]
  complianceScore?: number
  lastValidation?: Date
  errorCount: number
  warningCount: number
  tags: string[]
}

/**
 * Status workflow definitions
 */
export const STATUS_WORKFLOW: Record<InvoiceStatus, {
  label: string
  description: string
  allowedTransitions: InvoiceStatus[]
  color: string
  icon: string
  isTerminal: boolean
}> = {
  draft: {
    label: 'Brouillon',
    description: 'Facture en cours de création',
    allowedTransitions: ['extracted', 'error'],
    color: 'gray',
    icon: 'edit',
    isTerminal: false
  },
  extracted: {
    label: 'Extraite',
    description: 'Données extraites du PDF',
    allowedTransitions: ['validated', 'error', 'rejected'],
    color: 'blue',
    icon: 'download',
    isTerminal: false
  },
  validated: {
    label: 'Validée',
    description: 'Données vérifiées et corrigées',
    allowedTransitions: ['compliant', 'rejected', 'error'],
    color: 'yellow',
    icon: 'check',
    isTerminal: false
  },
  compliant: {
    label: 'Conforme',
    description: 'Conforme aux exigences légales',
    allowedTransitions: ['exported', 'validated', 'rejected'],
    color: 'green',
    icon: 'shield-check',
    isTerminal: false
  },
  exported: {
    label: 'Exportée',
    description: 'Exportée au format Factur-X',
    allowedTransitions: ['sent', 'validated'],
    color: 'purple',
    icon: 'file-export',
    isTerminal: false
  },
  sent: {
    label: 'Envoyée',
    description: 'Envoyée au client',
    allowedTransitions: ['received', 'error'],
    color: 'blue',
    icon: 'send',
    isTerminal: false
  },
  received: {
    label: 'Reçue',
    description: 'Accusé de réception client',
    allowedTransitions: ['paid', 'error'],
    color: 'cyan',
    icon: 'mail-check',
    isTerminal: false
  },
  paid: {
    label: 'Payée',
    description: 'Paiement reçu',
    allowedTransitions: ['archived'],
    color: 'green',
    icon: 'credit-card',
    isTerminal: false
  },
  archived: {
    label: 'Archivée',
    description: 'Archivée pour conservation',
    allowedTransitions: [],
    color: 'gray',
    icon: 'archive',
    isTerminal: true
  },
  error: {
    label: 'Erreur',
    description: 'Erreur de traitement',
    allowedTransitions: ['draft', 'extracted', 'validated'],
    color: 'red',
    icon: 'alert-circle',
    isTerminal: false
  },
  rejected: {
    label: 'Rejetée',
    description: 'Non conforme aux exigences',
    allowedTransitions: ['draft', 'extracted', 'validated'],
    color: 'red',
    icon: 'x-circle',
    isTerminal: false
  }
}

/**
 * Invoice status tracker class
 */
export class InvoiceStatusTracker {
  private data: InvoiceTrackingData

  constructor(invoiceId: string, initialData?: Partial<InvoiceTrackingData>) {
    this.data = {
      id: invoiceId,
      currentStatus: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [],
      errorCount: 0,
      warningCount: 0,
      tags: [],
      ...initialData
    }

    // Add initial status to history
    if (this.data.history.length === 0) {
      this.addToHistory(this.data.currentStatus, 'Facture créée')
    }
  }

  /**
   * Transition to a new status
   */
  transitionTo(newStatus: InvoiceStatus, message: string, metadata?: Record<string, any>): boolean {
    const currentWorkflow = STATUS_WORKFLOW[this.data.currentStatus]
    
    if (!currentWorkflow.allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Transition invalide de ${this.data.currentStatus} vers ${newStatus}. ` +
        `Transitions autorisées: ${currentWorkflow.allowedTransitions.join(', ')}`
      )
    }

    this.data.currentStatus = newStatus
    this.data.updatedAt = new Date()
    this.addToHistory(newStatus, message, metadata)

    // Update counters
    if (newStatus === 'error') {
      this.data.errorCount++
    }

    return true
  }

  /**
   * Add entry to status history
   */
  private addToHistory(status: InvoiceStatus, message: string, metadata?: Record<string, any>): void {
    this.data.history.push({
      status,
      timestamp: new Date(),
      message,
      metadata
    })
  }

  /**
   * Update compliance score
   */
  updateComplianceScore(score: number): void {
    this.data.complianceScore = score
    this.data.lastValidation = new Date()
    this.data.updatedAt = new Date()

    // Auto-transition based on compliance score
    if (this.data.currentStatus === 'validated' && score >= 90) {
      this.transitionTo('compliant', `Score de conformité: ${score}%`)
    } else if (this.data.currentStatus === 'validated' && score < 50) {
      this.transitionTo('rejected', `Score de conformité insuffisant: ${score}%`)
    }
  }

  /**
   * Add warning
   */
  addWarning(message: string): void {
    this.data.warningCount++
    this.addToHistory(this.data.currentStatus, `Avertissement: ${message}`)
  }

  /**
   * Add error
   */
  addError(message: string): void {
    this.data.errorCount++
    this.transitionTo('error', `Erreur: ${message}`)
  }

  /**
   * Add tag
   */
  addTag(tag: string): void {
    if (!this.data.tags.includes(tag)) {
      this.data.tags.push(tag)
      this.data.updatedAt = new Date()
    }
  }

  /**
   * Remove tag
   */
  removeTag(tag: string): void {
    const index = this.data.tags.indexOf(tag)
    if (index > -1) {
      this.data.tags.splice(index, 1)
      this.data.updatedAt = new Date()
    }
  }

  /**
   * Get current status info
   */
  getCurrentStatusInfo() {
    return STATUS_WORKFLOW[this.data.currentStatus]
  }

  /**
   * Get available transitions
   */
  getAvailableTransitions(): InvoiceStatus[] {
    return STATUS_WORKFLOW[this.data.currentStatus].allowedTransitions
  }

  /**
   * Check if status is terminal
   */
  isTerminal(): boolean {
    return STATUS_WORKFLOW[this.data.currentStatus].isTerminal
  }

  /**
   * Get processing time
   */
  getProcessingTime(): number {
    return this.data.updatedAt.getTime() - this.data.createdAt.getTime()
  }

  /**
   * Get time in current status
   */
  getTimeInCurrentStatus(): number {
    const lastTransition = this.data.history
      .slice()
      .reverse()
      .find(h => h.status === this.data.currentStatus)
    
    if (lastTransition) {
      return Date.now() - lastTransition.timestamp.getTime()
    }
    
    return 0
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    const statusOrder: InvoiceStatus[] = [
      'draft', 'extracted', 'validated', 'compliant', 'exported', 'sent', 'received', 'paid', 'archived'
    ]
    
    const currentIndex = statusOrder.indexOf(this.data.currentStatus)
    if (currentIndex === -1) return 0
    
    return Math.round((currentIndex / (statusOrder.length - 1)) * 100)
  }

  /**
   * Export tracking data
   */
  export(): InvoiceTrackingData {
    return { ...this.data }
  }

  /**
   * Get status statistics
   */
  getStatistics() {
    const totalTime = this.getProcessingTime()
    const timeInCurrentStatus = this.getTimeInCurrentStatus()
    const completionPercentage = this.getCompletionPercentage()
    
    return {
      totalTime,
      timeInCurrentStatus,
      completionPercentage,
      errorCount: this.data.errorCount,
      warningCount: this.data.warningCount,
      complianceScore: this.data.complianceScore,
      lastValidation: this.data.lastValidation,
      tags: this.data.tags,
      historyCount: this.data.history.length
    }
  }
}

/**
 * Batch status tracking utilities
 */
export class BatchInvoiceTracker {
  private trackers: Map<string, InvoiceStatusTracker> = new Map()

  /**
   * Add invoice to batch tracking
   */
  addInvoice(invoiceId: string, initialData?: Partial<InvoiceTrackingData>): InvoiceStatusTracker {
    const tracker = new InvoiceStatusTracker(invoiceId, initialData)
    this.trackers.set(invoiceId, tracker)
    return tracker
  }

  /**
   * Get tracker for invoice
   */
  getTracker(invoiceId: string): InvoiceStatusTracker | undefined {
    return this.trackers.get(invoiceId)
  }

  /**
   * Remove tracker
   */
  removeTracker(invoiceId: string): boolean {
    return this.trackers.delete(invoiceId)
  }

  /**
   * Get batch statistics
   */
  getBatchStatistics() {
    const trackers = Array.from(this.trackers.values())
    
    const statusCounts = trackers.reduce((acc, tracker) => {
      const status = tracker.export().currentStatus
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<InvoiceStatus, number>)

    const totalErrors = trackers.reduce((sum, tracker) => sum + tracker.export().errorCount, 0)
    const totalWarnings = trackers.reduce((sum, tracker) => sum + tracker.export().warningCount, 0)
    const averageCompletion = trackers.reduce((sum, tracker) => sum + tracker.getCompletionPercentage(), 0) / trackers.length

    return {
      totalInvoices: trackers.length,
      statusCounts,
      totalErrors,
      totalWarnings,
      averageCompletion: Math.round(averageCompletion),
      compliantInvoices: statusCounts.compliant || 0,
      archivedInvoices: statusCounts.archived || 0
    }
  }

  /**
   * Get invoices by status
   */
  getInvoicesByStatus(status: InvoiceStatus): InvoiceTrackingData[] {
    return Array.from(this.trackers.values())
      .filter(tracker => tracker.export().currentStatus === status)
      .map(tracker => tracker.export())
  }

  /**
   * Get invoices with errors
   */
  getInvoicesWithErrors(): InvoiceTrackingData[] {
    return Array.from(this.trackers.values())
      .filter(tracker => tracker.export().errorCount > 0)
      .map(tracker => tracker.export())
  }

  /**
   * Get stalled invoices (stuck in status for too long)
   */
  getStalledInvoices(maxTimeInStatus: number = 24 * 60 * 60 * 1000): InvoiceTrackingData[] {
    return Array.from(this.trackers.values())
      .filter(tracker => {
        const timeInStatus = tracker.getTimeInCurrentStatus()
        return timeInStatus > maxTimeInStatus && !tracker.isTerminal()
      })
      .map(tracker => tracker.export())
  }
}

/**
 * Utility functions
 */

/**
 * Format processing time
 */
export function formatProcessingTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}j ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Get status color class
 */
export function getStatusColorClass(status: InvoiceStatus): string {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    extracted: 'bg-blue-100 text-blue-800',
    validated: 'bg-yellow-100 text-yellow-800',
    compliant: 'bg-green-100 text-green-800',
    exported: 'bg-purple-100 text-purple-800',
    sent: 'bg-blue-100 text-blue-800',
    received: 'bg-cyan-100 text-cyan-800',
    paid: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-800',
    error: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800'
  }
  
  return colors[status] || 'bg-gray-100 text-gray-800'
}