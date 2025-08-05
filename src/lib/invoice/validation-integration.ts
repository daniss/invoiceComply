/**
 * Integration layer between PDF parsing and French business validation
 */

import { 
  validateSiret, 
  validateFrenchVat, 
  validateFrenchDate, 
  validateAmount, 
  validateInvoiceNumber,
  validatePaymentTerms 
} from '@/lib/validations/french-business'
import { formatSiret, formatFrenchVat, formatFrenchCurrency } from '@/lib/utils/french-formatting'
import type { ExtractedInvoiceData } from '@/lib/pdf/parser'

export interface ValidationResult {
  field: string
  isValid: boolean
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestedValue?: string
}

export interface ComplianceValidation {
  isCompliant: boolean
  validationResults: ValidationResult[]
  missingFields: string[]
  score: number // 0-100 compliance score
}

/**
 * Validate all fields in extracted invoice data
 */
export function validateInvoiceData(data: ExtractedInvoiceData): ComplianceValidation {
  const validationResults: ValidationResult[] = []
  const missingFields: string[] = []

  // Required fields validation
  const requiredFields = [
    { key: 'invoiceNumber', label: 'Numéro de facture' },
    { key: 'invoiceDate', label: 'Date de facture' },
    { key: 'supplierName', label: 'Nom du fournisseur' },
    { key: 'totalAmountIncludingVat', label: 'Montant total TTC' }
  ]

  requiredFields.forEach(({ key, label }) => {
    const value = data[key as keyof ExtractedInvoiceData]
    if (!value) {
      missingFields.push(label)
      validationResults.push({
        field: key,
        isValid: false,
        severity: 'error',
        message: `${label} requis pour la conformité`
      })
    }
  })

  // Invoice number validation
  if (data.invoiceNumber) {
    const isValidNumber = validateInvoiceNumber(data.invoiceNumber)
    validationResults.push({
      field: 'invoiceNumber',
      isValid: isValidNumber,
      severity: isValidNumber ? 'info' : 'error',
      message: isValidNumber 
        ? 'Format de numéro valide'
        : 'Format de numéro de facture invalide (doit être alphanumérique)'
    })
  }

  // Date validation
  if (data.invoiceDate) {
    const isValidDate = validateFrenchDate(data.invoiceDate)
    validationResults.push({
      field: 'invoiceDate',
      isValid: isValidDate,
      severity: isValidDate ? 'info' : 'error',
      message: isValidDate 
        ? 'Format de date valide (DD/MM/YYYY)'
        : 'Format de date invalide - utilisez DD/MM/YYYY',
      suggestedValue: isValidDate ? undefined : 'Format: DD/MM/YYYY'
    })
  }

  if (data.dueDate) {
    const isValidDueDate = validateFrenchDate(data.dueDate)
    validationResults.push({
      field: 'dueDate',
      isValid: isValidDueDate,
      severity: isValidDueDate ? 'info' : 'warning',
      message: isValidDueDate 
        ? 'Format de date d\'échéance valide'
        : 'Format de date d\'échéance invalide'
    })
  }

  // SIRET validation
  if (data.supplierSiret) {
    const isValidSiret = validateSiret(data.supplierSiret)
    validationResults.push({
      field: 'supplierSiret',
      isValid: isValidSiret,
      severity: isValidSiret ? 'info' : 'error',
      message: isValidSiret 
        ? 'SIRET valide'
        : 'SIRET invalide - vérifiez les 14 chiffres',
      suggestedValue: isValidSiret ? formatSiret(data.supplierSiret) : undefined
    })
  } else {
    validationResults.push({
      field: 'supplierSiret',
      isValid: false,
      severity: 'warning',
      message: 'SIRET du fournisseur manquant - recommandé pour la conformité'
    })
  }

  if (data.buyerSiret) {
    const isValidBuyerSiret = validateSiret(data.buyerSiret)
    validationResults.push({
      field: 'buyerSiret',
      isValid: isValidBuyerSiret,
      severity: isValidBuyerSiret ? 'info' : 'warning',
      message: isValidBuyerSiret 
        ? 'SIRET acheteur valide'
        : 'SIRET acheteur invalide',
      suggestedValue: isValidBuyerSiret ? formatSiret(data.buyerSiret) : undefined
    })
  }

  // VAT number validation
  if (data.supplierVatNumber) {
    const isValidVat = validateFrenchVat(data.supplierVatNumber)
    validationResults.push({
      field: 'supplierVatNumber',
      isValid: isValidVat,
      severity: isValidVat ? 'info' : 'error',
      message: isValidVat 
        ? 'Numéro de TVA valide'
        : 'Numéro de TVA invalide - format FR + 11 chiffres',
      suggestedValue: isValidVat ? formatFrenchVat(data.supplierVatNumber) : undefined
    })
  }

  if (data.buyerVatNumber) {
    const isValidBuyerVat = validateFrenchVat(data.buyerVatNumber)
    validationResults.push({
      field: 'buyerVatNumber',
      isValid: isValidBuyerVat,
      severity: isValidBuyerVat ? 'info' : 'warning',
      message: isValidBuyerVat 
        ? 'Numéro de TVA acheteur valide'
        : 'Numéro de TVA acheteur invalide'
    })
  }

  // Amount validation
  if (data.totalAmountIncludingVat !== undefined) {
    const isValidAmount = validateAmount(data.totalAmountIncludingVat)
    validationResults.push({
      field: 'totalAmountIncludingVat',
      isValid: isValidAmount,
      severity: isValidAmount ? 'info' : 'error',
      message: isValidAmount 
        ? `Montant valide: ${formatFrenchCurrency(data.totalAmountIncludingVat)}`
        : 'Montant invalide - doit être positif avec max 2 décimales'
    })
  }

  if (data.totalAmountExcludingVat !== undefined) {
    const isValidAmountHT = validateAmount(data.totalAmountExcludingVat)
    validationResults.push({
      field: 'totalAmountExcludingVat',
      isValid: isValidAmountHT,
      severity: isValidAmountHT ? 'info' : 'error',
      message: isValidAmountHT 
        ? `Montant HT valide: ${formatFrenchCurrency(data.totalAmountExcludingVat)}`
        : 'Montant HT invalide'
    })
  }

  if (data.totalVatAmount !== undefined) {
    const isValidVatAmount = validateAmount(data.totalVatAmount)
    validationResults.push({
      field: 'totalVatAmount',
      isValid: isValidVatAmount,
      severity: isValidVatAmount ? 'info' : 'error',
      message: isValidVatAmount 
        ? `Montant TVA valide: ${formatFrenchCurrency(data.totalVatAmount)}`
        : 'Montant TVA invalide'
    })
  }

  // Payment terms validation
  if (data.paymentTerms !== undefined) {
    const isValidTerms = validatePaymentTerms(data.paymentTerms)
    validationResults.push({
      field: 'paymentTerms',
      isValid: isValidTerms,
      severity: isValidTerms ? 'info' : 'warning',
      message: isValidTerms 
        ? `Délai de paiement conforme: ${data.paymentTerms} jours`
        : 'Délai de paiement non conforme - max 60 jours B2B, 30 jours B2G'
    })
  }

  // Amount consistency check
  if (data.totalAmountExcludingVat && data.totalVatAmount && data.totalAmountIncludingVat) {
    const calculatedTotal = data.totalAmountExcludingVat + data.totalVatAmount
    const isConsistent = Math.abs(calculatedTotal - data.totalAmountIncludingVat) < 0.01
    
    validationResults.push({
      field: 'amountConsistency',
      isValid: isConsistent,
      severity: isConsistent ? 'info' : 'error',
      message: isConsistent 
        ? 'Cohérence des montants vérifiée'
        : `Incohérence: HT (${formatFrenchCurrency(data.totalAmountExcludingVat)}) + TVA (${formatFrenchCurrency(data.totalVatAmount)}) ≠ TTC (${formatFrenchCurrency(data.totalAmountIncludingVat)})`
    })
  }

  // Calculate compliance score
  const totalChecks = validationResults.length
  const validChecks = validationResults.filter(r => r.isValid).length
  const errorCount = validationResults.filter(r => r.severity === 'error' && !r.isValid).length
  
  let score = totalChecks > 0 ? Math.round((validChecks / totalChecks) * 100) : 0
  
  // Penalize missing required fields heavily
  score -= missingFields.length * 15
  
  // Penalize errors
  score -= errorCount * 10
  
  score = Math.max(0, Math.min(100, score))

  const isCompliant = errorCount === 0 && missingFields.length === 0

  return {
    isCompliant,
    validationResults,
    missingFields,
    score
  }
}

/**
 * Get validation suggestions for improving compliance
 */
export function getComplianceSuggestions(validation: ComplianceValidation): string[] {
  const suggestions: string[] = []

  if (validation.missingFields.length > 0) {
    suggestions.push(`Complétez les champs obligatoires: ${validation.missingFields.join(', ')}`)
  }

  const errors = validation.validationResults.filter(r => r.severity === 'error' && !r.isValid)
  if (errors.length > 0) {
    suggestions.push('Corrigez les erreurs de format détectées')
  }

  const warnings = validation.validationResults.filter(r => r.severity === 'warning' && !r.isValid)
  if (warnings.length > 0) {
    suggestions.push('Vérifiez les avertissements pour une meilleure conformité')
  }

  if (validation.score < 80) {
    suggestions.push('Améliorez la qualité des données pour atteindre 80% de conformité minimum')
  }

  return suggestions
}

/**
 * Auto-correct common issues in extracted data
 */
export function autoCorrectData(data: ExtractedInvoiceData): ExtractedInvoiceData {
  const corrected = { ...data }

  // Format SIRET numbers
  if (corrected.supplierSiret) {
    corrected.supplierSiret = corrected.supplierSiret.replace(/\s/g, '')
  }
  if (corrected.buyerSiret) {
    corrected.buyerSiret = corrected.buyerSiret.replace(/\s/g, '')
  }

  // Format VAT numbers
  if (corrected.supplierVatNumber) {
    corrected.supplierVatNumber = corrected.supplierVatNumber.replace(/\s/g, '').toUpperCase()
  }
  if (corrected.buyerVatNumber) {
    corrected.buyerVatNumber = corrected.buyerVatNumber.replace(/\s/g, '').toUpperCase()
  }

  // Ensure currency is EUR
  if (!corrected.currency) {
    corrected.currency = 'EUR'
  }

  // Set default payment terms if missing
  if (!corrected.paymentTerms) {
    corrected.paymentTerms = 30
  }

  // Round amounts to 2 decimal places
  if (corrected.totalAmountExcludingVat) {
    corrected.totalAmountExcludingVat = Math.round(corrected.totalAmountExcludingVat * 100) / 100
  }
  if (corrected.totalVatAmount) {
    corrected.totalVatAmount = Math.round(corrected.totalVatAmount * 100) / 100
  }
  if (corrected.totalAmountIncludingVat) {
    corrected.totalAmountIncludingVat = Math.round(corrected.totalAmountIncludingVat * 100) / 100
  }

  return corrected
}