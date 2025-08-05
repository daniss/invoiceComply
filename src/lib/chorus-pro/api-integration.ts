/**
 * Chorus Pro API Integration
 * Official French government platform for B2G electronic invoicing
 */

import { PdpIntegration, type TransmissionRequest, type TransmissionResult, type TrackingInfo } from '@/lib/pdp/integration'

export interface ChorusProConfig {
  environment: 'sandbox' | 'production'
  clientId: string
  clientSecret: string
  login: string
  password: string
  certificatePath?: string
  timeout?: number
}

export interface ChorusProCredentials {
  login: string
  password: string
  appId: string
}

export interface ChorusProInvoice {
  numeroFacture: string
  dateFacture: string
  montantHT: number
  montantTTC: number
  devise: string
  // Émetteur
  emetteurSiret: string
  emetteurNom: string
  emetteurAdresse: string
  // Destinataire
  destinataireSiret: string
  destinataireNom?: string
  destinataireService?: string
  destinataireAdresse?: string
  // Engagement juridique
  numeroMarche?: string
  numeroEngagement?: string
  numeroCommande?: string
  // Pièces jointes
  fichierFacture: Buffer
  fichierXML?: Buffer
}

export interface ChorusProResponse {
  success: boolean
  numeroFluxDepot: string
  numeroFactureChorusPro?: string
  statut: ChorusProStatus
  erreurs?: ChorusProError[]
  avertissements?: string[]
}

export type ChorusProStatus = 
  | 'DEPOSE'
  | 'EN_COURS_DE_TRAITEMENT'
  | 'VALIDE'
  | 'REJETE'
  | 'COMPTABILISE'
  | 'SOLDE'

export interface ChorusProError {
  code: string
  libelle: string
  champ?: string
  gravite: 'ERREUR' | 'AVERTISSEMENT'
}

export interface ChorusProValidationRules {
  montantMaximum: number
  deviseAcceptees: string[]
  formatsAcceptes: string[]
  tailleMaxFichier: number
  champsObligatoires: string[]
}

/**
 * Chorus Pro API Integration
 */
export class ChorusProIntegration extends PdpIntegration {
  private credentials: ChorusProCredentials
  private baseUrl: string
  private sessionToken?: string
  private tokenExpiry?: Date

  constructor(config: ChorusProConfig) {
    const pdpConfig = {
      provider: 'chorus_pro' as const,
      endpoint: config.environment === 'production' 
        ? 'https://chorus-pro.gouv.fr/api'
        : 'https://chorus-pro-sandbox.gouv.fr/api',
      credentials: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        certificatePath: config.certificatePath
      },
      environment: config.environment,
      timeout: config.timeout || 30000,
      retryAttempts: 3
    }

    super(pdpConfig)

    this.credentials = {
      login: config.login,
      password: config.password,
      appId: config.clientId
    }

    this.baseUrl = pdpConfig.endpoint
  }

  /**
   * Authenticate with Chorus Pro using credentials
   */
  async authenticate(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          'grant_type': 'password',
          'username': this.credentials.login,
          'password': this.credentials.password,
          'client_id': this.credentials.appId,
          'scope': 'invoice_transmission'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Chorus Pro authentication failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      this.sessionToken = data.access_token
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000))
    } catch (error) {
      console.error('Chorus Pro authentication error:', error)
      throw new Error(`Failed to authenticate with Chorus Pro: ${(error as Error).message}`)
    }
  }

  /**
   * Deposit invoice to Chorus Pro
   */
  async deposerFacture(invoice: ChorusProInvoice): Promise<ChorusProResponse> {
    await this.ensureAuthenticated()

    try {
      // Validate invoice before submission
      await this.validateInvoice(invoice)

      // Prepare multipart form data
      const formData = new FormData()
      
      // Metadata
      formData.append('numeroFacture', invoice.numeroFacture)
      formData.append('dateFacture', invoice.dateFacture)
      formData.append('montantHT', invoice.montantHT.toString())
      formData.append('montantTTC', invoice.montantTTC.toString())
      formData.append('devise', invoice.devise)
      
      formData.append('emetteurSiret', invoice.emetteurSiret)
      formData.append('emetteurNom', invoice.emetteurNom)
      formData.append('emetteurAdresse', invoice.emetteurAdresse)
      
      formData.append('destinataireSiret', invoice.destinataireSiret)
      if (invoice.destinataireNom) {
        formData.append('destinataireNom', invoice.destinataireNom)
      }
      if (invoice.destinataireService) {
        formData.append('destinataireService', invoice.destinataireService)
      }
      
      // Engagement juridique
      if (invoice.numeroMarche) {
        formData.append('numeroMarche', invoice.numeroMarche)
      }
      if (invoice.numeroEngagement) {
        formData.append('numeroEngagement', invoice.numeroEngagement)
      }
      if (invoice.numeroCommande) {
        formData.append('numeroCommande', invoice.numeroCommande)
      }

      // Files
      const pdfBlob = new Blob([invoice.fichierFacture], { type: 'application/pdf' })
      formData.append('fichierFacture', pdfBlob, `${invoice.numeroFacture}.pdf`)

      if (invoice.fichierXML) {
        const xmlBlob = new Blob([invoice.fichierXML], { type: 'application/xml' })
        formData.append('fichierXML', xmlBlob, `${invoice.numeroFacture}.xml`)
      }

      const response = await fetch(`${this.baseUrl}/factures/deposer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sessionToken}`,
          // Don't set Content-Type for FormData
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Chorus Pro deposit failed: ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      return this.mapChorusProResponse(result)
    } catch (error) {
      console.error('Chorus Pro deposit error:', error)
      throw new Error(`Failed to deposit invoice to Chorus Pro: ${(error as Error).message}`)
    }
  }

  /**
   * Check invoice status in Chorus Pro
   */
  async consulterStatutFacture(numeroFluxDepot: string): Promise<ChorusProResponse> {
    await this.ensureAuthenticated()

    try {
      const response = await fetch(
        `${this.baseUrl}/factures/${numeroFluxDepot}/statut`,
        {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`)
      }

      const data = await response.json()
      return this.mapChorusProResponse(data)
    } catch (error) {
      console.error('Chorus Pro status check error:', error)
      throw new Error(`Failed to check invoice status: ${(error as Error).message}`)
    }
  }

  /**
   * Search for services/entities for a given SIRET
   */
  async rechercherServices(siret: string): Promise<Array<{
    siret: string
    raisonSociale: string
    codeService?: string
    nomService?: string
    adressePostale: string
  }>> {
    await this.ensureAuthenticated()

    try {
      const response = await fetch(
        `${this.baseUrl}/annuaires/services?siret=${siret}`,
        {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Service search failed: ${response.status}`)
      }

      const data = await response.json()
      return data.services || []
    } catch (error) {
      console.error('Chorus Pro service search error:', error)
      return []
    }
  }

  /**
   * Get validation rules from Chorus Pro
   */
  async obtenirReglesValidation(): Promise<ChorusProValidationRules> {
    await this.ensureAuthenticated()

    try {
      const response = await fetch(`${this.baseUrl}/referentiels/regles-validation`, {
        headers: {
          'Authorization': `Bearer ${this.sessionToken}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get validation rules: ${response.status}`)
      }

      const data = await response.json()
      return {
        montantMaximum: data.montantMaximum || 1000000,
        deviseAcceptees: data.deviseAcceptees || ['EUR'],
        formatsAcceptes: data.formatsAcceptes || ['PDF', 'XML'],
        tailleMaxFichier: data.tailleMaxFichier || 10485760, // 10MB
        champsObligatoires: data.champsObligatoires || [
          'numeroFacture',
          'dateFacture',
          'montantTTC',
          'emetteurSiret',
          'destinataireSiret'
        ]
      }
    } catch (error) {
      console.error('Error getting validation rules:', error)
      // Return default rules
      return {
        montantMaximum: 1000000,
        deviseAcceptees: ['EUR'],
        formatsAcceptes: ['PDF', 'XML'],
        tailleMaxFichier: 10485760,
        champsObligatoires: [
          'numeroFacture',
          'dateFacture',
          'montantTTC',
          'emetteurSiret',
          'destinataireSiret'
        ]
      }
    }
  }

  /**
   * Download acknowledgment receipt
   */
  async telechargerAccuseReception(numeroFluxDepot: string): Promise<Buffer | null> {
    await this.ensureAuthenticated()

    try {
      const response = await fetch(
        `${this.baseUrl}/factures/${numeroFluxDepot}/accuse-reception`,
        {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`,
            'Accept': 'application/pdf'
          }
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          return null // Acknowledgment not yet available
        }
        throw new Error(`Failed to download acknowledgment: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('Error downloading acknowledgment:', error)
      return null
    }
  }

  /**
   * Override transmit invoice to use Chorus Pro specific logic
   */
  async transmitInvoice(request: TransmissionRequest): Promise<TransmissionResult> {
    try {
      const chorusInvoice: ChorusProInvoice = {
        numeroFacture: request.metadata.invoiceNumber,
        dateFacture: request.metadata.invoiceDate,
        montantHT: (request.metadata.totalAmount / 1.20), // Estimate HT from TTC
        montantTTC: request.metadata.totalAmount,
        devise: request.metadata.currency,
        emetteurSiret: request.metadata.senderSiret,
        emetteurNom: 'Nom du fournisseur', // Should be passed in metadata
        emetteurAdresse: 'Adresse du fournisseur', // Should be passed in metadata
        destinataireSiret: request.recipientSiret,
        fichierFacture: Buffer.from(request.factorXPdfBytes),
        fichierXML: Buffer.from(request.xmlContent)
      }

      const chorusResult = await this.deposerFacture(chorusInvoice)

      return {
        success: chorusResult.success,
        transmissionId: chorusResult.numeroFluxDepot,
        status: this.mapChorusStatusToTransmissionStatus(chorusResult.statut),
        timestamp: new Date(),
        recipient: {
          siret: request.recipientSiret,
          platform: 'Chorus Pro'
        },
        tracking: {
          submissionId: chorusResult.numeroFluxDepot,
          referenceNumber: chorusResult.numeroFactureChorusPro
        },
        errors: chorusResult.erreurs?.map(err => ({
          code: err.code,
          message: err.libelle,
          field: err.champ,
          severity: err.gravite === 'ERREUR' ? 'error' : 'warning'
        })),
        warnings: chorusResult.avertissements
      }
    } catch (error) {
      console.error('Chorus Pro transmission error:', error)
      throw error
    }
  }

  /**
   * Override track transmission for Chorus Pro
   */
  async trackTransmission(transmissionId: string): Promise<TrackingInfo> {
    try {
      const chorusResult = await this.consulterStatutFacture(transmissionId)

      return {
        transmissionId,
        currentStatus: this.mapChorusStatusToTransmissionStatus(chorusResult.statut),
        statusHistory: [{
          status: this.mapChorusStatusToTransmissionStatus(chorusResult.statut),
          timestamp: new Date(),
          message: `Statut Chorus Pro: ${chorusResult.statut}`
        }],
        errors: chorusResult.erreurs?.map(err => ({
          code: err.code,
          message: err.libelle,
          field: err.champ,
          severity: err.gravite === 'ERREUR' ? 'error' : 'warning'
        })) || [],
        retryCount: 0
      }
    } catch (error) {
      console.error('Chorus Pro tracking error:', error)
      throw error
    }
  }

  /**
   * Validate invoice before submission
   */
  private async validateInvoice(invoice: ChorusProInvoice): Promise<void> {
    const rules = await this.obtenirReglesValidation()
    const errors: string[] = []

    // Check required fields
    rules.champsObligatoires.forEach(field => {
      if (!invoice[field as keyof ChorusProInvoice]) {
        errors.push(`Champ obligatoire manquant: ${field}`)
      }
    })

    // Check amount limits
    if (invoice.montantTTC > rules.montantMaximum) {
      errors.push(`Montant TTC dépasse le maximum autorisé (${rules.montantMaximum}€)`)
    }

    // Check currency
    if (!rules.deviseAcceptees.includes(invoice.devise)) {
      errors.push(`Devise non acceptée: ${invoice.devise}`)
    }

    // Check file size
    if (invoice.fichierFacture.length > rules.tailleMaxFichier) {
      errors.push(`Taille du fichier PDF dépasse le maximum (${rules.tailleMaxFichier} bytes)`)
    }

    if (invoice.fichierXML && invoice.fichierXML.length > rules.tailleMaxFichier) {
      errors.push(`Taille du fichier XML dépasse le maximum (${rules.tailleMaxFichier} bytes)`)
    }

    if (errors.length > 0) {
      throw new Error(`Erreurs de validation Chorus Pro: ${errors.join(', ')}`)
    }
  }

  /**
   * Map Chorus Pro response to standard format
   */
  private mapChorusProResponse(data: any): ChorusProResponse {
    return {
      success: data.success || data.statut !== 'REJETE',
      numeroFluxDepot: data.numeroFluxDepot || data.id,
      numeroFactureChorusPro: data.numeroFactureChorusPro,
      statut: data.statut,
      erreurs: data.erreurs || [],
      avertissements: data.avertissements || []
    }
  }

  /**
   * Map Chorus Pro status to transmission status
   */
  private mapChorusStatusToTransmissionStatus(status: ChorusProStatus) {
    const statusMap = {
      'DEPOSE': 'submitted',
      'EN_COURS_DE_TRAITEMENT': 'submitted',
      'VALIDE': 'delivered',
      'REJETE': 'rejected',
      'COMPTABILISE': 'acknowledged',
      'SOLDE': 'acknowledged'
    } as const

    return statusMap[status] || 'pending'
  }

  /**
   * Ensure session token is valid
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.sessionToken || !this.tokenExpiry || this.tokenExpiry <= new Date()) {
      await this.authenticate()
    }
  }
}

/**
 * Create Chorus Pro integration instance
 */
export function createChorusProIntegration(config: ChorusProConfig): ChorusProIntegration {
  return new ChorusProIntegration(config)
}

/**
 * Utility functions for Chorus Pro
 */

/**
 * Format amount for Chorus Pro (no decimals for small amounts)
 */
export function formatAmountForChorusPro(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Validate SIRET for Chorus Pro submission
 */
export function validateSiretForChorusPro(siret: string): boolean {
  // Chorus Pro requires 14-digit SIRET
  return /^\d{14}$/.test(siret)
}

/**
 * Check if entity is public sector (eligible for Chorus Pro)
 */
export function isPublicSector(siret: string): boolean {
  // Public sector entities typically start with specific codes
  // This is a simplified check - real implementation would use official registry
  const publicSectorPrefixes = ['11', '13', '18', '19']
  return publicSectorPrefixes.some(prefix => siret.startsWith(prefix))
}