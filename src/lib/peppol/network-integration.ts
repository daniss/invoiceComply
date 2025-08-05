/**
 * PEPPOL Network Integration
 * Handles international B2B invoice transmission through PEPPOL network
 */

import { PdpIntegration, type TransmissionRequest, type TransmissionResult, type PdpConfig } from '@/lib/pdp/integration'

export interface PeppolConfig extends Omit<PdpConfig, 'provider'> {
  accessPointUrl: string
  senderParticipantId: string
  certificatePath: string
  privateKeyPath: string
  smp?: {
    url: string
    timeout: number
  }
}

export interface PeppolParticipant {
  participantId: string
  businessIdentifier: {
    scheme: string // e.g., 'iso6523-actorid-upis'
    value: string // e.g., '9956:123456789'
  }
  name?: string
  country: string
  capabilities: PeppolCapability[]
  endpoints: PeppolEndpoint[]
  certificateInfo: {
    issuer: string
    validFrom: Date
    validTo: Date
    fingerprint: string
  }
}

export interface PeppolCapability {
  documentTypeId: string
  processId: string
  transportProfile: string
  endpoint: string
}

export interface PeppolEndpoint {
  transportProfile: string
  endpointUrl: string
  certificate: string
  description?: string
}

export interface PeppolDocumentType {
  id: string
  name: string
  version: string
  namespace: string
  description: string
  isSupported: boolean
}

export interface PeppolMessage {
  messageId: string
  senderId: string
  receiverId: string
  documentType: string
  processId: string
  payload: string
  attachments?: Array<{
    name: string
    mimeType: string
    content: Buffer
  }>
  metadata: {
    creationDate: Date
    businessScope?: string
    testMessage?: boolean
  }
}

export interface PeppolTransmissionReport {
  messageId: string
  status: 'sent' | 'delivered' | 'failed' | 'acknowledged'
  timestamp: Date
  accessPoint: string
  deliveryReceipt?: {
    timestamp: Date
    messageDigest: string
    signature: string
  }
  errorDetails?: {
    code: string
    description: string
    severity: 'warning' | 'error'
  }[]
}

/**
 * PEPPOL Network Integration
 */
export class PeppolIntegration extends PdpIntegration {
  private peppolConfig: PeppolConfig
  private participantId: string

  constructor(config: PeppolConfig) {
    const pdpConfig = {
      ...config,
      provider: 'peppol' as const
    }
    
    super(pdpConfig)
    this.peppolConfig = config
    this.participantId = config.senderParticipantId
  }

  /**
   * Look up participant in PEPPOL Directory
   */
  async lookupParticipant(participantId: string): Promise<PeppolParticipant | null> {
    try {
      const smpUrl = this.peppolConfig.smp?.url || 'https://directory.peppol.eu'
      const response = await fetch(`${smpUrl}/participant/${encodeURIComponent(participantId)}`, {
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(this.peppolConfig.smp?.timeout || 10000)
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null // Participant not found
        }
        throw new Error(`SMP lookup failed: ${response.status}`)
      }

      const data = await response.json()
      return this.mapSmpResponse(data)
    } catch (error) {
      console.error('PEPPOL participant lookup error:', error)
      return null
    }
  }

  /**
   * Get supported document types for participant
   */
  async getParticipantCapabilities(participantId: string): Promise<PeppolCapability[]> {
    const participant = await this.lookupParticipant(participantId)
    return participant?.capabilities || []
  }

  /**
   * Check if participant can receive Factur-X invoices
   */
  async canReceiveFacturX(participantId: string): Promise<boolean> {
    const capabilities = await this.getParticipantCapabilities(participantId)
    
    // Check for Factur-X or UBL invoice support
    const supportedDocTypes = [
      'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1',
      'urn:factur-x.eu:1p0:invoice'
    ]

    return capabilities.some(cap => 
      supportedDocTypes.some(docType => cap.documentTypeId.includes(docType))
    )
  }

  /**
   * Send invoice through PEPPOL network
   */
  async sendPeppolInvoice(
    recipientId: string,
    invoice: {
      documentType: string
      processId: string
      content: string
      attachments?: Array<{
        name: string
        mimeType: string
        content: Buffer
      }>
    },
    options?: {
      testMessage?: boolean
      businessScope?: string
    }
  ): Promise<PeppolTransmissionReport> {
    try {
      // Validate recipient exists and supports document type
      const recipient = await this.lookupParticipant(recipientId)
      if (!recipient) {
        throw new Error(`Recipient ${recipientId} not found in PEPPOL Directory`)
      }

      const supportsDocType = recipient.capabilities.some(cap => 
        cap.documentTypeId === invoice.documentType
      )
      if (!supportsDocType) {
        throw new Error(`Recipient does not support document type ${invoice.documentType}`)
      }

      // Create PEPPOL message
      const message: PeppolMessage = {
        messageId: this.generateMessageId(),
        senderId: this.participantId,
        receiverId: recipientId,
        documentType: invoice.documentType,
        processId: invoice.processId,
        payload: invoice.content,
        attachments: invoice.attachments,
        metadata: {
          creationDate: new Date(),
          businessScope: options?.businessScope,
          testMessage: options?.testMessage || false
        }
      }

      // Send through access point
      const result = await this.sendThroughAccessPoint(message, recipient)
      return result
    } catch (error) {
      console.error('PEPPOL transmission error:', error)
      
      return {
        messageId: this.generateMessageId(),
        status: 'failed',
        timestamp: new Date(),
        accessPoint: this.peppolConfig.accessPointUrl,
        errorDetails: [{
          code: 'TRANSMISSION_ERROR',
          description: (error as Error).message,
          severity: 'error'
        }]
      }
    }
  }

  /**
   * Override transmit invoice for PEPPOL
   */
  async transmitInvoice(request: TransmissionRequest): Promise<TransmissionResult> {
    try {
      // Convert recipient SIRET to PEPPOL participant ID
      const peppolParticipantId = this.convertSiretToPeppolId(request.recipientSiret)
      
      // Determine document type based on content
      const documentType = request.xmlContent.includes('rsm:CrossIndustryInvoice') 
        ? 'urn:factur-x.eu:1p0:invoice'
        : 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1'

      const peppolResult = await this.sendPeppolInvoice(peppolParticipantId, {
        documentType,
        processId: 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
        content: request.xmlContent,
        attachments: [{
          name: `${request.metadata.invoiceNumber}.pdf`,
          mimeType: 'application/pdf',
          content: Buffer.from(request.factorXPdfBytes)
        }]
      }, {
        testMessage: request.options?.testMode,
        businessScope: 'Invoice'
      })

      return {
        success: peppolResult.status !== 'failed',
        transmissionId: peppolResult.messageId,
        status: this.mapPeppolStatusToTransmissionStatus(peppolResult.status),
        timestamp: peppolResult.timestamp,
        recipient: {
          siret: request.recipientSiret,
          platform: 'PEPPOL'
        },
        tracking: {
          submissionId: peppolResult.messageId,
          referenceNumber: peppolResult.messageId
        },
        errors: peppolResult.errorDetails?.map(err => ({
          code: err.code,
          message: err.description,
          severity: err.severity
        }))
      }
    } catch (error) {
      console.error('PEPPOL transmission error:', error)
      throw error
    }
  }

  /**
   * Get PEPPOL network status
   */
  async getNetworkStatus(): Promise<{
    accessPointStatus: 'online' | 'offline' | 'degraded'
    smpStatus: 'online' | 'offline' | 'degraded'
    certificateStatus: 'valid' | 'expiring' | 'expired'
    lastCheck: Date
  }> {
    try {
      // Check access point health
      const apResponse = await fetch(`${this.peppolConfig.accessPointUrl}/health`, {
        signal: AbortSignal.timeout(5000)
      })
      const accessPointStatus = apResponse.ok ? 'online' : 'degraded'

      // Check SMP
      const smpUrl = this.peppolConfig.smp?.url || 'https://directory.peppol.eu'
      const smpResponse = await fetch(`${smpUrl}/health`, {
        signal: AbortSignal.timeout(5000)
      })
      const smpStatus = smpResponse.ok ? 'online' : 'degraded'

      // Check certificate (simplified - would need actual certificate validation)
      const certificateStatus = 'valid' // Placeholder

      return {
        accessPointStatus,
        smpStatus,
        certificateStatus,
        lastCheck: new Date()
      }
    } catch (error) {
      console.error('PEPPOL network status check error:', error)
      return {
        accessPointStatus: 'offline',
        smpStatus: 'offline',
        certificateStatus: 'valid',
        lastCheck: new Date()
      }
    }
  }

  /**
   * Get supported document types
   */
  getSupportedDocumentTypes(): PeppolDocumentType[] {
    return [
      {
        id: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1',
        name: 'PEPPOL BIS Billing 3.0',
        version: '3.0',
        namespace: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        description: 'Standard PEPPOL invoice format',
        isSupported: true
      },
      {
        id: 'urn:factur-x.eu:1p0:invoice',
        name: 'Factur-X',
        version: '1.0',
        namespace: 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
        description: 'French Factur-X format',
        isSupported: true
      }
    ]
  }

  /**
   * Send message through PEPPOL Access Point
   */
  private async sendThroughAccessPoint(
    message: PeppolMessage,
    recipient: PeppolParticipant
  ): Promise<PeppolTransmissionReport> {
    try {
      // Find appropriate endpoint for recipient
      const endpoint = this.findBestEndpoint(recipient, message.documentType)
      if (!endpoint) {
        throw new Error('No suitable endpoint found for recipient')
      }

      // Prepare AS4 message (simplified)
      const as4Message = await this.createAS4Message(message, endpoint)

      // Send to access point
      const response = await fetch(`${this.peppolConfig.accessPointUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml',
          'Authorization': `Bearer ${await this.getAccessPointToken()}`
        },
        body: as4Message,
        signal: AbortSignal.timeout(this.peppolConfig.timeout)
      })

      if (!response.ok) {
        throw new Error(`Access Point error: ${response.status} ${response.statusText}`)
      }

      const result = await response.text()
      
      return {
        messageId: message.messageId,
        status: 'sent',
        timestamp: new Date(),
        accessPoint: this.peppolConfig.accessPointUrl,
        deliveryReceipt: {
          timestamp: new Date(),
          messageDigest: this.calculateMessageDigest(message.payload),
          signature: 'signature-placeholder'
        }
      }
    } catch (error) {
      console.error('Access Point transmission error:', error)
      
      return {
        messageId: message.messageId,
        status: 'failed',
        timestamp: new Date(),
        accessPoint: this.peppolConfig.accessPointUrl,
        errorDetails: [{
          code: 'AP_ERROR',
          description: (error as Error).message,
          severity: 'error'
        }]
      }
    }
  }

  /**
   * Map SMP response to participant object
   */
  private mapSmpResponse(data: any): PeppolParticipant {
    return {
      participantId: data.participantId,
      businessIdentifier: {
        scheme: data.businessIdentifier?.scheme || 'iso6523-actorid-upis',
        value: data.businessIdentifier?.value || data.participantId
      },
      name: data.name,
      country: data.country || 'FR',
      capabilities: (data.capabilities || []).map((cap: any) => ({
        documentTypeId: cap.documentTypeId,
        processId: cap.processId,
        transportProfile: cap.transportProfile || 'bdxr-transport-ebms3-as4-v1_0',
        endpoint: cap.endpoint
      })),
      endpoints: (data.endpoints || []).map((ep: any) => ({
        transportProfile: ep.transportProfile,
        endpointUrl: ep.endpointUrl,
        certificate: ep.certificate,
        description: ep.description
      })),
      certificateInfo: {
        issuer: data.certificateInfo?.issuer || 'Unknown',
        validFrom: data.certificateInfo?.validFrom ? new Date(data.certificateInfo.validFrom) : new Date(),
        validTo: data.certificateInfo?.validTo ? new Date(data.certificateInfo.validTo) : new Date(),
        fingerprint: data.certificateInfo?.fingerprint || ''
      }
    }
  }

  /**
   * Find best endpoint for transmission
   */
  private findBestEndpoint(recipient: PeppolParticipant, documentType: string): PeppolEndpoint | null {
    // Find capability that matches document type
    const capability = recipient.capabilities.find(cap => 
      cap.documentTypeId === documentType
    )
    
    if (!capability) return null

    // Find endpoint that matches transport profile
    return recipient.endpoints.find(ep => 
      ep.transportProfile === capability.transportProfile
    ) || recipient.endpoints[0] || null
  }

  /**
   * Create AS4 message (simplified implementation)
   */
  private async createAS4Message(message: PeppolMessage, endpoint: PeppolEndpoint): Promise<string> {
    // This is a simplified implementation
    // Real implementation would need proper AS4/ebMS3 message creation
    
    const soapEnvelope = `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
        <soap:Header>
          <eb:Messaging xmlns:eb="http://docs.oasis-open.org/ebxml-msg/ebms/v3.0/ns/core/200704/">
            <eb:UserMessage>
              <eb:MessageInfo>
                <eb:Timestamp>${message.metadata.creationDate.toISOString()}</eb:Timestamp>
                <eb:MessageId>${message.messageId}</eb:MessageId>
              </eb:MessageInfo>
              <eb:PartyInfo>
                <eb:From>
                  <eb:PartyId type="urn:oasis:names:tc:ebcore:partyid-type:unregistered">${message.senderId}</eb:PartyId>
                </eb:From>
                <eb:To>
                  <eb:PartyId type="urn:oasis:names:tc:ebcore:partyid-type:unregistered">${message.receiverId}</eb:PartyId>
                </eb:To>
              </eb:PartyInfo>
              <eb:CollaborationInfo>
                <eb:Service>${message.processId}</eb:Service>
                <eb:Action>submitMessage</eb:Action>
              </eb:CollaborationInfo>
            </eb:UserMessage>
          </eb:Messaging>
        </soap:Header>
        <soap:Body>
          ${this.escapeXml(message.payload)}
        </soap:Body>
      </soap:Envelope>
    `
    
    return soapEnvelope.trim()
  }

  /**
   * Get access point authentication token
   */
  private async getAccessPointToken(): Promise<string> {
    // Simplified token retrieval
    // Real implementation would handle certificate-based authentication
    return 'access-point-token'
  }

  /**
   * Convert SIRET to PEPPOL participant ID
   */
  private convertSiretToPeppolId(siret: string): string {
    // French SIRET to PEPPOL participant ID conversion
    // Standard format: 9956:SIRET (9956 is the French scheme identifier)
    return `9956:${siret}`
  }

  /**
   * Map PEPPOL status to transmission status
   */
  private mapPeppolStatusToTransmissionStatus(status: PeppolTransmissionReport['status']) {
    const statusMap = {
      'sent': 'submitted',
      'delivered': 'delivered',
      'failed': 'failed',
      'acknowledged': 'acknowledged'
    } as const

    return statusMap[status] || 'pending'
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  /**
   * Calculate message digest for integrity check
   */
  private calculateMessageDigest(payload: string): string {
    // Simplified digest calculation
    // Real implementation would use proper cryptographic hash
    return Buffer.from(payload).toString('base64').substring(0, 20)
  }

  /**
   * Escape XML content
   */
  private escapeXml(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}

/**
 * Create PEPPOL integration instance
 */
export function createPeppolIntegration(config: PeppolConfig): PeppolIntegration {
  return new PeppolIntegration(config)
}

/**
 * Utility functions for PEPPOL
 */

/**
 * Validate PEPPOL participant ID format
 */
export function validatePeppolParticipantId(participantId: string): boolean {
  // Format: scheme::identifier (e.g., 9956::123456789)
  const pattern = /^\d{4}::.+$/
  return pattern.test(participantId)
}

/**
 * Check if country supports PEPPOL
 */
export function isPeppolCountry(countryCode: string): boolean {
  const peppolCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'NO', 'IS', 'AU',
    'NZ', 'SG', 'US', 'CA', 'MX', 'JP'
  ]
  
  return peppolCountries.includes(countryCode.toUpperCase())
}