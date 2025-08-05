/**
 * PDP (Plateforme de Dématérialisation Partenaire) Integration
 * Handles transmission of Factur-X invoices through certified platforms
 */

export type PdpProvider = 'chorus_pro' | 'custom_partner' | 'peppol'

export interface PdpConfig {
  provider: PdpProvider
  endpoint: string
  credentials: {
    clientId: string
    clientSecret: string
    certificatePath?: string // For X.509 certificates
  }
  environment: 'sandbox' | 'production'
  timeout: number
  retryAttempts: number
}

export interface TransmissionRequest {
  invoiceId: string
  recipientSiret: string
  recipientEmail?: string
  factorXPdfBytes: Uint8Array
  xmlContent: string
  metadata: {
    senderSiret: string
    invoiceNumber: string
    invoiceDate: string
    totalAmount: number
    currency: string
  }
  options?: {
    priority: 'normal' | 'urgent'
    deliveryMode: 'push' | 'pull'
    requireAcknowledgment: boolean
    testMode?: boolean
  }
}

export interface TransmissionResult {
  success: boolean
  transmissionId: string
  status: TransmissionStatus
  timestamp: Date
  recipient: {
    siret: string
    name?: string
    platform?: string
  }
  tracking: {
    submissionId: string
    referenceNumber?: string
    estimatedDelivery?: Date
  }
  errors?: TransmissionError[]
  warnings?: string[]
}

export type TransmissionStatus = 
  | 'pending'
  | 'submitted'
  | 'delivered'
  | 'acknowledged'
  | 'rejected'
  | 'failed'
  | 'cancelled'

export interface TransmissionError {
  code: string
  message: string
  field?: string
  severity: 'error' | 'warning'
}

export interface TrackingInfo {
  transmissionId: string
  currentStatus: TransmissionStatus
  statusHistory: Array<{
    status: TransmissionStatus
    timestamp: Date
    message: string
    details?: Record<string, any>
  }>
  deliveryConfirmation?: {
    deliveredAt: Date
    acknowledgedAt?: Date
    recipientPlatform: string
    deliveryMethod: string
  }
  errors: TransmissionError[]
  retryCount: number
  nextRetryAt?: Date
}

/**
 * PDP Integration Manager
 */
export class PdpIntegration {
  private config: PdpConfig
  private authToken?: string
  private tokenExpiry?: Date

  constructor(config: PdpConfig) {
    this.config = config
  }

  /**
   * Authenticate with PDP provider
   */
  async authenticate(): Promise<void> {
    try {
      const response = await fetch(`${this.config.endpoint}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.credentials.clientId,
          client_secret: this.config.credentials.clientSecret,
          grant_type: 'client_credentials',
          scope: 'invoice_transmission'
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      this.authToken = data.access_token
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000))
    } catch (error) {
      console.error('PDP authentication error:', error)
      throw new Error(`Failed to authenticate with PDP: ${(error as Error).message}`)
    }
  }

  /**
   * Transmit invoice to recipient
   */
  async transmitInvoice(request: TransmissionRequest): Promise<TransmissionResult> {
    await this.ensureAuthenticated()

    try {
      // Validate request
      this.validateTransmissionRequest(request)

      // Prepare transmission payload
      const payload = await this.prepareTransmissionPayload(request)

      // Send to PDP
      const response = await this.sendToPdp(payload)

      // Process response
      return this.processTransmissionResponse(response, request)
    } catch (error) {
      console.error('Invoice transmission error:', error)
      
      return {
        success: false,
        transmissionId: `error-${Date.now()}`,
        status: 'failed',
        timestamp: new Date(),
        recipient: {
          siret: request.recipientSiret
        },
        tracking: {
          submissionId: '',
        },
        errors: [{
          code: 'TRANSMISSION_ERROR',
          message: (error as Error).message,
          severity: 'error'
        }]
      }
    }
  }

  /**
   * Track transmission status
   */
  async trackTransmission(transmissionId: string): Promise<TrackingInfo> {
    await this.ensureAuthenticated()

    try {
      const response = await fetch(
        `${this.config.endpoint}/transmissions/${transmissionId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(this.config.timeout)
        }
      )

      if (!response.ok) {
        throw new Error(`Tracking failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return this.mapTrackingResponse(data)
    } catch (error) {
      console.error('Tracking error:', error)
      throw new Error(`Failed to track transmission: ${(error as Error).message}`)
    }
  }

  /**
   * Cancel pending transmission
   */
  async cancelTransmission(transmissionId: string): Promise<boolean> {
    await this.ensureAuthenticated()

    try {
      const response = await fetch(
        `${this.config.endpoint}/transmissions/${transmissionId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(this.config.timeout)
        }
      )

      return response.ok
    } catch (error) {
      console.error('Cancellation error:', error)
      return false
    }
  }

  /**
   * Get supported recipients for the sender
   */
  async getSupportedRecipients(senderSiret: string): Promise<Array<{
    siret: string
    name: string
    platform: string
    capabilities: string[]
  }>> {
    await this.ensureAuthenticated()

    try {
      const response = await fetch(
        `${this.config.endpoint}/recipients?sender_siret=${senderSiret}`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(this.config.timeout)
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get recipients: ${response.status}`)
      }

      const data = await response.json()
      return data.recipients || []
    } catch (error) {
      console.error('Error getting recipients:', error)
      return []
    }
  }

  /**
   * Ensure authentication token is valid
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.authToken || !this.tokenExpiry || this.tokenExpiry <= new Date()) {
      await this.authenticate()
    }
  }

  /**
   * Validate transmission request
   */
  private validateTransmissionRequest(request: TransmissionRequest): void {
    const errors: string[] = []

    if (!request.invoiceId) errors.push('Invoice ID is required')
    if (!request.recipientSiret) errors.push('Recipient SIRET is required')
    if (!request.factorXPdfBytes || request.factorXPdfBytes.length === 0) {
      errors.push('Factur-X PDF is required')
    }
    if (!request.xmlContent) errors.push('XML content is required')
    if (!request.metadata.senderSiret) errors.push('Sender SIRET is required')
    if (!request.metadata.invoiceNumber) errors.push('Invoice number is required')

    // Validate SIRET format
    const siretPattern = /^\d{14}$/
    if (!siretPattern.test(request.recipientSiret)) {
      errors.push('Invalid recipient SIRET format')
    }
    if (!siretPattern.test(request.metadata.senderSiret)) {
      errors.push('Invalid sender SIRET format')
    }

    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`)
    }
  }

  /**
   * Prepare transmission payload for PDP
   */
  private async prepareTransmissionPayload(request: TransmissionRequest): Promise<FormData> {
    const formData = new FormData()

    // Add metadata
    formData.append('sender_siret', request.metadata.senderSiret)
    formData.append('recipient_siret', request.recipientSiret)
    formData.append('invoice_number', request.metadata.invoiceNumber)
    formData.append('invoice_date', request.metadata.invoiceDate)
    formData.append('total_amount', request.metadata.totalAmount.toString())
    formData.append('currency', request.metadata.currency)

    if (request.recipientEmail) {
      formData.append('recipient_email', request.recipientEmail)
    }

    // Add options
    if (request.options) {
      formData.append('priority', request.options.priority || 'normal')
      formData.append('delivery_mode', request.options.deliveryMode || 'push')
      formData.append('require_acknowledgment', request.options.requireAcknowledgment.toString())
      
      if (request.options.testMode) {
        formData.append('test_mode', 'true')
      }
    }

    // Add files
    const pdfBlob = new Blob([request.factorXPdfBytes], { type: 'application/pdf' })
    formData.append('facturx_pdf', pdfBlob, `${request.metadata.invoiceNumber}.pdf`)

    const xmlBlob = new Blob([request.xmlContent], { type: 'application/xml' })
    formData.append('facturx_xml', xmlBlob, `${request.metadata.invoiceNumber}.xml`)

    return formData
  }

  /**
   * Send payload to PDP
   */
  private async sendToPdp(payload: FormData): Promise<Response> {
    const response = await fetch(`${this.config.endpoint}/transmissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: payload,
      signal: AbortSignal.timeout(this.config.timeout)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`PDP transmission failed: ${response.status} ${errorText}`)
    }

    return response
  }

  /**
   * Process transmission response
   */
  private async processTransmissionResponse(
    response: Response,
    request: TransmissionRequest
  ): Promise<TransmissionResult> {
    const data = await response.json()

    return {
      success: true,
      transmissionId: data.transmission_id,
      status: this.mapStatus(data.status),
      timestamp: new Date(),
      recipient: {
        siret: request.recipientSiret,
        name: data.recipient_name,
        platform: data.recipient_platform
      },
      tracking: {
        submissionId: data.submission_id,
        referenceNumber: data.reference_number,
        estimatedDelivery: data.estimated_delivery ? new Date(data.estimated_delivery) : undefined
      },
      warnings: data.warnings || []
    }
  }

  /**
   * Map tracking response
   */
  private mapTrackingResponse(data: any): TrackingInfo {
    return {
      transmissionId: data.transmission_id,
      currentStatus: this.mapStatus(data.current_status),
      statusHistory: (data.status_history || []).map((item: any) => ({
        status: this.mapStatus(item.status),
        timestamp: new Date(item.timestamp),
        message: item.message,
        details: item.details
      })),
      deliveryConfirmation: data.delivery_confirmation ? {
        deliveredAt: new Date(data.delivery_confirmation.delivered_at),
        acknowledgedAt: data.delivery_confirmation.acknowledged_at ? 
          new Date(data.delivery_confirmation.acknowledged_at) : undefined,
        recipientPlatform: data.delivery_confirmation.recipient_platform,
        deliveryMethod: data.delivery_confirmation.delivery_method
      } : undefined,
      errors: (data.errors || []).map((error: any) => ({
        code: error.code,
        message: error.message,
        field: error.field,
        severity: error.severity
      })),
      retryCount: data.retry_count || 0,
      nextRetryAt: data.next_retry_at ? new Date(data.next_retry_at) : undefined
    }
  }

  /**
   * Map PDP status to internal status
   */
  private mapStatus(pdpStatus: string): TransmissionStatus {
    const statusMap: Record<string, TransmissionStatus> = {
      'pending': 'pending',
      'submitted': 'submitted',
      'in_transit': 'submitted',
      'delivered': 'delivered',
      'acknowledged': 'acknowledged',
      'rejected': 'rejected',
      'failed': 'failed',
      'cancelled': 'cancelled'
    }

    return statusMap[pdpStatus] || 'pending'
  }
}

/**
 * Factory function to create PDP integration instances
 */
export function createPdpIntegration(provider: PdpProvider, config: Omit<PdpConfig, 'provider'>): PdpIntegration {
  const fullConfig: PdpConfig = {
    provider,
    ...config
  }

  return new PdpIntegration(fullConfig)
}

/**
 * Utility functions for PDP operations
 */

/**
 * Check if recipient supports electronic invoicing
 */
export async function isRecipientElectronicReady(siret: string, pdp: PdpIntegration): Promise<boolean> {
  try {
    const recipients = await pdp.getSupportedRecipients(siret)
    return recipients.some(r => r.siret === siret)
  } catch {
    return false
  }
}

/**
 * Get transmission statistics
 */
export interface TransmissionStats {
  total: number
  successful: number
  pending: number
  failed: number
  successRate: number
}

export function calculateTransmissionStats(results: TransmissionResult[]): TransmissionStats {
  const total = results.length
  const successful = results.filter(r => r.success && r.status === 'delivered').length
  const pending = results.filter(r => ['pending', 'submitted'].includes(r.status)).length
  const failed = results.filter(r => !r.success || r.status === 'failed').length
  const successRate = total > 0 ? (successful / total) * 100 : 0

  return {
    total,
    successful,
    pending,
    failed,
    successRate: Math.round(successRate * 100) / 100
  }
}