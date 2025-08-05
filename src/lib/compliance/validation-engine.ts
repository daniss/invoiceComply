/**
 * Comprehensive compliance validation engine for French e-invoicing
 */

import { validateInvoiceData, type ComplianceValidation } from '@/lib/invoice/validation-integration'
import { validateFacturXXML } from '@/lib/factur-x/xml-generator'
import { validateSiret, validateFrenchVat } from '@/lib/validations/french-business'
import type { ExtractedInvoiceData } from '@/lib/pdf/parser'

export interface ComplianceRule {
  id: string
  name: string
  category: 'legal' | 'format' | 'business' | 'technical'
  level: 'mandatory' | 'recommended' | 'optional'
  description: string
  validator: (data: ExtractedInvoiceData) => RuleResult
}

export interface RuleResult {
  passed: boolean
  message: string
  details?: string
  suggestedFix?: string
  impact: 'critical' | 'high' | 'medium' | 'low'
}

export interface ComplianceReport {
  overall: {
    score: number // 0-100
    level: 'compliant' | 'warnings' | 'non-compliant'
    summary: string
  }
  categories: {
    legal: CategoryResult
    format: CategoryResult
    business: CategoryResult
    technical: CategoryResult
  }
  rules: Array<{
    rule: ComplianceRule
    result: RuleResult
  }>
  recommendations: string[]
  blockers: string[]
}

export interface CategoryResult {
  score: number
  passed: number
  total: number
  critical: number
  issues: string[]
}

/**
 * Compliance rules for French e-invoicing
 */
const COMPLIANCE_RULES: ComplianceRule[] = [
  // Legal mandatory requirements
  {
    id: 'FR_INV_001',
    name: 'Numéro de facture obligatoire',
    category: 'legal',
    level: 'mandatory',
    description: 'La facture doit contenir un numéro unique et séquentiel',
    validator: (data) => ({
      passed: !!data.invoiceNumber && data.invoiceNumber.trim().length > 0,
      message: data.invoiceNumber ? 'Numéro de facture présent' : 'Numéro de facture manquant',
      impact: 'critical',
      suggestedFix: !data.invoiceNumber ? 'Ajoutez un numéro de facture unique' : undefined
    })
  },
  
  {
    id: 'FR_INV_002',
    name: 'Date de facture obligatoire',
    category: 'legal',
    level: 'mandatory',
    description: 'La facture doit contenir une date d\'émission',
    validator: (data) => ({
      passed: !!data.invoiceDate,
      message: data.invoiceDate ? 'Date de facture présente' : 'Date de facture manquante',
      impact: 'critical',
      suggestedFix: !data.invoiceDate ? 'Ajoutez la date d\'émission (DD/MM/YYYY)' : undefined
    })
  },

  {
    id: 'FR_INV_003',
    name: 'Identification du fournisseur',
    category: 'legal',
    level: 'mandatory',
    description: 'Le fournisseur doit être identifié avec nom et SIRET',
    validator: (data) => {
      const hasName = !!data.supplierName
      const hasSiret = !!data.supplierSiret && validateSiret(data.supplierSiret)
      const passed = hasName && hasSiret
      
      return {
        passed,
        message: passed 
          ? 'Fournisseur correctement identifié' 
          : 'Identification du fournisseur incomplète',
        details: `Nom: ${hasName ? '✓' : '✗'}, SIRET: ${hasSiret ? '✓' : '✗'}`,
        impact: 'critical',
        suggestedFix: !passed ? 'Ajoutez le nom et SIRET valide du fournisseur' : undefined
      }
    }
  },

  {
    id: 'FR_INV_004',
    name: 'Montant total TTC',
    category: 'legal',
    level: 'mandatory',
    description: 'Le montant total TTC doit être présent et valide',
    validator: (data) => {
      const hasAmount = data.totalAmountIncludingVat !== undefined && data.totalAmountIncludingVat > 0
      return {
        passed: hasAmount,
        message: hasAmount ? 'Montant total valide' : 'Montant total manquant ou invalide',
        impact: 'critical',
        suggestedFix: !hasAmount ? 'Ajoutez le montant total TTC' : undefined
      }
    }
  },

  // Business rules
  {
    id: 'FR_BUS_001',
    name: 'Délai de paiement conforme',
    category: 'business',
    level: 'mandatory',
    description: 'Délai de paiement max 60 jours B2B, 30 jours B2G',
    validator: (data) => {
      if (!data.paymentTerms) {
        return {
          passed: false,
          message: 'Délai de paiement non spécifié',
          impact: 'medium',
          suggestedFix: 'Spécifiez le délai de paiement (max 60 jours)'
        }
      }
      
      const isValid = data.paymentTerms <= 60
      return {
        passed: isValid,
        message: isValid 
          ? `Délai conforme: ${data.paymentTerms} jours` 
          : `Délai non conforme: ${data.paymentTerms} jours (max 60)`,
        impact: isValid ? 'low' : 'high',
        suggestedFix: !isValid ? 'Réduisez le délai de paiement à 60 jours maximum' : undefined
      }
    }
  },

  {
    id: 'FR_BUS_002',
    name: 'TVA française valide',
    category: 'business',
    level: 'recommended',
    description: 'Numéro de TVA français valide si spécifié',
    validator: (data) => {
      if (!data.supplierVatNumber) {
        return {
          passed: false,
          message: 'Numéro de TVA fournisseur non spécifié',
          impact: 'medium',
          suggestedFix: 'Ajoutez le numéro de TVA français (FR + 11 chiffres)'
        }
      }
      
      const isValid = validateFrenchVat(data.supplierVatNumber)
      return {
        passed: isValid,
        message: isValid ? 'Numéro de TVA valide' : 'Numéro de TVA invalide',
        impact: isValid ? 'low' : 'high',
        suggestedFix: !isValid ? 'Corrigez le format du numéro de TVA' : undefined
      }
    }
  },

  // Format rules
  {
    id: 'FR_FMT_001',
    name: 'Format date française',
    category: 'format',
    level: 'recommended',
    description: 'Date au format DD/MM/YYYY',
    validator: (data) => {
      if (!data.invoiceDate) return { passed: false, message: 'Date manquante', impact: 'critical' }
      
      const frenchDatePattern = /^\d{2}\/\d{2}\/\d{4}$/
      const isValid = frenchDatePattern.test(data.invoiceDate)
      
      return {
        passed: isValid,
        message: isValid ? 'Format de date conforme' : 'Format de date non conforme',
        details: isValid ? 'DD/MM/YYYY' : `Reçu: ${data.invoiceDate}, attendu: DD/MM/YYYY`,
        impact: 'medium',
        suggestedFix: !isValid ? 'Utilisez le format DD/MM/YYYY' : undefined
      }
    }
  },

  {
    id: 'FR_FMT_002',
    name: 'Cohérence des montants',
    category: 'format',
    level: 'mandatory',
    description: 'HT + TVA = TTC avec précision centimes',
    validator: (data) => {
      const { totalAmountExcludingVat: ht, totalVatAmount: tva, totalAmountIncludingVat: ttc } = data
      
      if (ht === undefined || tva === undefined || ttc === undefined) {
        return {
          passed: false,
          message: 'Montants incomplets pour vérification',
          impact: 'high',
          suggestedFix: 'Complétez tous les montants (HT, TVA, TTC)'
        }
      }
      
      const calculatedTTC = Math.round((ht + tva) * 100) / 100
      const actualTTC = Math.round(ttc * 100) / 100
      const isCoherent = Math.abs(calculatedTTC - actualTTC) < 0.01
      
      return {
        passed: isCoherent,
        message: isCoherent ? 'Cohérence des montants vérifiée' : 'Incohérence dans les montants',
        details: `${ht}€ + ${tva}€ = ${calculatedTTC}€, déclaré: ${actualTTC}€`,
        impact: 'high',
        suggestedFix: !isCoherent ? 'Vérifiez le calcul HT + TVA = TTC' : undefined
      }
    }
  },

  // Technical rules for Factur-X
  {
    id: 'FR_TECH_001',
    name: 'Devise européenne',
    category: 'technical',
    level: 'recommended',
    description: 'Devise en EUR pour faciliter les échanges',
    validator: (data) => {
      const currency = data.currency || 'EUR'
      const isEUR = currency === 'EUR'
      
      return {
        passed: isEUR,
        message: isEUR ? 'Devise en EUR' : `Devise: ${currency}`,
        impact: 'low',
        suggestedFix: !isEUR ? 'Considérez l\'utilisation de l\'EUR' : undefined
      }
    }
  }
]

/**
 * Run comprehensive compliance validation
 */
export function validateCompliance(data: ExtractedInvoiceData): ComplianceReport {
  // Run all rules
  const ruleResults = COMPLIANCE_RULES.map(rule => ({
    rule,
    result: rule.validator(data)
  }))

  // Categorize results
  const categories = {
    legal: calculateCategoryResult(ruleResults.filter(r => r.rule.category === 'legal')),
    format: calculateCategoryResult(ruleResults.filter(r => r.rule.category === 'format')),
    business: calculateCategoryResult(ruleResults.filter(r => r.rule.category === 'business')),
    technical: calculateCategoryResult(ruleResults.filter(r => r.rule.category === 'technical'))
  }

  // Calculate overall score
  const totalRules = ruleResults.length
  const passedRules = ruleResults.filter(r => r.result.passed).length
  const mandatoryRules = ruleResults.filter(r => r.rule.level === 'mandatory')
  const passedMandatory = mandatoryRules.filter(r => r.result.passed).length
  const criticalIssues = ruleResults.filter(r => !r.result.passed && r.result.impact === 'critical').length

  // Score calculation (weighted)
  let score = 0
  if (totalRules > 0) {
    const mandatoryWeight = 0.7
    const allRulesWeight = 0.3
    
    const mandatoryScore = mandatoryRules.length > 0 ? (passedMandatory / mandatoryRules.length) : 1
    const allRulesScore = passedRules / totalRules
    
    score = Math.round((mandatoryScore * mandatoryWeight + allRulesScore * allRulesWeight) * 100)
  }

  // Determine compliance level
  let level: 'compliant' | 'warnings' | 'non-compliant'
  if (criticalIssues > 0 || passedMandatory < mandatoryRules.length) {
    level = 'non-compliant'
  } else if (score < 80) {
    level = 'warnings'
  } else {
    level = 'compliant'
  }

  // Generate summary
  const summary = generateSummary(score, level, criticalIssues, passedMandatory, mandatoryRules.length)

  // Extract recommendations and blockers
  const recommendations = ruleResults
    .filter(r => !r.result.passed && r.result.impact !== 'critical')
    .map(r => r.result.suggestedFix)
    .filter(Boolean) as string[]

  const blockers = ruleResults
    .filter(r => !r.result.passed && r.result.impact === 'critical')
    .map(r => r.result.message)

  return {
    overall: { score, level, summary },
    categories,
    rules: ruleResults,
    recommendations,
    blockers
  }
}

/**
 * Calculate category-specific results
 */
function calculateCategoryResult(ruleResults: Array<{ rule: ComplianceRule; result: RuleResult }>): CategoryResult {
  const total = ruleResults.length
  const passed = ruleResults.filter(r => r.result.passed).length
  const critical = ruleResults.filter(r => !r.result.passed && r.result.impact === 'critical').length
  const score = total > 0 ? Math.round((passed / total) * 100) : 100
  
  const issues = ruleResults
    .filter(r => !r.result.passed)
    .map(r => r.result.message)

  return { score, passed, total, critical, issues }
}

/**
 * Generate summary text
 */
function generateSummary(
  score: number, 
  level: string, 
  criticalIssues: number, 
  passedMandatory: number, 
  totalMandatory: number
): string {
  if (level === 'compliant') {
    return `Facture conforme aux exigences françaises (${score}% de conformité)`
  } else if (level === 'warnings') {
    return `Facture partiellement conforme avec quelques améliorations recommandées (${score}% de conformité)`
  } else {
    const criticalText = criticalIssues > 0 ? ` ${criticalIssues} problème(s) critique(s)` : ''
    const mandatoryText = passedMandatory < totalMandatory ? 
      ` ${totalMandatory - passedMandatory} exigence(s) obligatoire(s) non respectée(s)` : ''
    
    return `Facture non conforme:${criticalText}${mandatoryText} (${score}% de conformité)`
  }
}

/**
 * Quick compliance check (lightweight version)
 */
export function quickComplianceCheck(data: ExtractedInvoiceData): {
  isCompliant: boolean
  score: number
  criticalIssues: string[]
} {
  const mandatoryChecks = [
    { check: !!data.invoiceNumber, issue: 'Numéro de facture manquant' },
    { check: !!data.invoiceDate, issue: 'Date de facture manquante' },
    { check: !!data.supplierName, issue: 'Nom du fournisseur manquant' },
    { check: data.totalAmountIncludingVat !== undefined && data.totalAmountIncludingVat > 0, issue: 'Montant total invalide' }
  ]

  const passed = mandatoryChecks.filter(c => c.check).length
  const criticalIssues = mandatoryChecks.filter(c => !c.check).map(c => c.issue)
  const score = Math.round((passed / mandatoryChecks.length) * 100)
  const isCompliant = criticalIssues.length === 0

  return { isCompliant, score, criticalIssues }
}

/**
 * Generate compliance checklist for user
 */
export function generateComplianceChecklist(data: ExtractedInvoiceData): Array<{
  category: string
  items: Array<{
    text: string
    completed: boolean
    required: boolean
  }>
}> {
  return [
    {
      category: 'Informations obligatoires',
      items: [
        { text: 'Numéro de facture unique', completed: !!data.invoiceNumber, required: true },
        { text: 'Date d\'émission', completed: !!data.invoiceDate, required: true },
        { text: 'Nom du fournisseur', completed: !!data.supplierName, required: true },
        { text: 'SIRET du fournisseur', completed: !!data.supplierSiret && validateSiret(data.supplierSiret), required: true },
        { text: 'Montant total TTC', completed: data.totalAmountIncludingVat !== undefined, required: true }
      ]
    },
    {
      category: 'Informations recommandées',
      items: [
        { text: 'Numéro de TVA français', completed: !!data.supplierVatNumber && validateFrenchVat(data.supplierVatNumber), required: false },
        { text: 'Adresse du fournisseur', completed: !!data.supplierAddress, required: false },
        { text: 'Date d\'échéance', completed: !!data.dueDate, required: false },
        { text: 'Conditions de paiement', completed: !!data.paymentTerms, required: false }
      ]
    },
    {
      category: 'Cohérence des données',
      items: [
        { text: 'Format de date français (DD/MM/YYYY)', completed: !!data.invoiceDate && /^\d{2}\/\d{2}\/\d{4}$/.test(data.invoiceDate), required: false },
        { text: 'Cohérence HT + TVA = TTC', completed: validateAmountCoherence(data), required: true },
        { text: 'Délai de paiement ≤ 60 jours', completed: !data.paymentTerms || data.paymentTerms <= 60, required: true }
      ]
    }
  ]
}

function validateAmountCoherence(data: ExtractedInvoiceData): boolean {
  const { totalAmountExcludingVat: ht, totalVatAmount: tva, totalAmountIncludingVat: ttc } = data
  
  if (ht === undefined || tva === undefined || ttc === undefined) return false
  
  const calculated = Math.round((ht + tva) * 100) / 100
  const actual = Math.round(ttc * 100) / 100
  
  return Math.abs(calculated - actual) < 0.01
}