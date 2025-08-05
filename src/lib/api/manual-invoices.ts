import { InvoiceFormData } from '@/components/invoice-builder/invoice-builder-form'

// API client for manual invoice operations
export const manualInvoicesApi = {
  // Draft operations
  async getDraft() {
    const response = await fetch('/api/manual-invoices/drafts')
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error)
    }
    
    return data.draft
  },

  async saveDraft(formData: InvoiceFormData) {
    const response = await fetch('/api/manual-invoices/drafts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ formData })
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error)
    }
    
    return data.draft
  },

  async deleteDraft() {
    const response = await fetch('/api/manual-invoices/drafts', {
      method: 'DELETE'
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error)
    }
    
    return data
  },

  // Template operations
  async getTemplates(category?: string) {
    const params = new URLSearchParams()
    if (category) {
      params.append('category', category)
    }
    
    const response = await fetch(`/api/manual-invoices/templates?${params}`)
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error)
    }
    
    return data.templates
  },

  async createTemplate(templateData: {
    name: string
    description?: string
    category: 'service' | 'product' | 'consulting' | 'other'
    templateData: any
  }) {
    const response = await fetch('/api/manual-invoices/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData)
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error)
    }
    
    return data.template
  },

  async useTemplate(templateId: string) {
    const response = await fetch(`/api/manual-invoices/templates/${templateId}`, {
      method: 'POST'
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error)
    }
    
    return data.template
  },

  async deleteTemplate(templateId: string) {
    const response = await fetch(`/api/manual-invoices/templates/${templateId}`, {
      method: 'DELETE'
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error)
    }
    
    return data
  },

  // Manual invoice operations
  async getInvoices(filters?: {
    status?: 'draft' | 'finalized' | 'transmitted'
    limit?: number
    offset?: number
  }) {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())
    
    const response = await fetch(`/api/manual-invoices?${params}`)
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error)
    }
    
    return {
      invoices: data.invoices,
      total: data.total,
      pagination: data.pagination
    }
  },

  async createInvoice(invoiceData: InvoiceFormData) {
    const response = await fetch('/api/manual-invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData)
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error)
    }
    
    return data.invoice
  },

  async generateFacturX(invoiceId: string) {
    const response = await fetch(`/api/manual-invoices/${invoiceId}/factur-x`, {
      method: 'POST'
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error)
    }
    
    return {
      facturXUrl: data.facturXUrl,
      fileName: data.fileName,
      xmlContent: data.xmlContent
    }
  },

  // Validation helpers
  async validateInvoiceNumber(invoiceNumber: string) {
    // Simple client-side validation - server will do the real check
    if (!invoiceNumber || invoiceNumber.length < 1) {
      return { isValid: false, error: 'Numéro de facture requis' }
    }
    
    return { isValid: true }
  },

  async validateSiret(siret: string) {
    if (!siret) return { isValid: true } // Optional for customer
    
    if (siret.length !== 14) {
      return { isValid: false, error: 'SIRET doit contenir 14 chiffres' }
    }
    
    // Luhn algorithm validation
    const digits = siret.split('').map(Number)
    let sum = 0
    
    for (let i = 0; i < 13; i++) {
      let digit = digits[i]
      if (i % 2 === 1) {
        digit *= 2
        if (digit > 9) {
          digit = digit.toString().split('').map(Number).reduce((a, b) => a + b, 0)
        }
      }
      sum += digit
    }
    
    const checkDigit = (10 - (sum % 10)) % 10
    const isValid = checkDigit === digits[13]
    
    return {
      isValid,
      error: isValid ? null : 'SIRET invalide (vérifiez la clé de contrôle)'
    }
  },

  async validateFrenchVat(vatNumber: string) {
    if (!vatNumber) return { isValid: true } // Optional for customer
    
    // Remove spaces and convert to uppercase
    const cleanVat = vatNumber.replace(/\s/g, '').toUpperCase()
    
    if (!cleanVat.startsWith('FR') || cleanVat.length !== 13) {
      return { isValid: false, error: 'Format: FR + 11 chiffres' }
    }
    
    const numericPart = cleanVat.substring(2)
    if (!/^\d{11}$/.test(numericPart)) {
      return { isValid: false, error: 'Les 11 caractères après FR doivent être des chiffres' }
    }
    
    return { isValid: true }
  }
}