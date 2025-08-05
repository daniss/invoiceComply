/**
 * Simplified validations for manual invoice builder
 * More lenient than strict business validations to allow testing and flexibility
 */

import { validateSiret, validateFrenchVat } from './french-business'

/**
 * Simple French VAT format validation (for manual invoice builder)
 * Only checks format, not mathematical validity
 */
export function validateFrenchVatFormat(vat: string): boolean {
  if (!vat) return true // Optional for customers
  
  // Remove spaces and convert to uppercase
  const cleanVat = vat.replace(/\s/g, '').toUpperCase()
  
  // Must start with FR followed by exactly 11 digits
  return /^FR\d{11}$/.test(cleanVat)
}

/**
 * Simple SIRET format validation (for manual invoice builder)
 * Only checks format, not mathematical validity for easier testing
 */
export function validateSiretFormat(siret: string): boolean {
  if (!siret) return true // Optional for some contexts
  
  // Remove spaces and hyphens
  const cleanSiret = siret.replace(/[\s-]/g, '')
  
  // Must be exactly 14 digits
  return /^\d{14}$/.test(cleanSiret)
}

/**
 * Validates SIRET with option for lenient mode
 */
export function validateSiretForManualInvoice(siret: string, isRequired: boolean = true): boolean {
  if (!siret) return !isRequired // Return true if not required and empty
  
  // For manual invoices, we'll be more lenient
  // First try strict validation, then fall back to format validation
  const strictValidation = validateSiret(siret)
  if (strictValidation) return true
  
  // Fall back to format validation for testing/flexibility
  return validateSiretFormat(siret)
}

/**
 * Validates French VAT with option for lenient mode
 */
export function validateFrenchVatForManualInvoice(vat: string, isRequired: boolean = false): boolean {
  if (!vat) return !isRequired // Return true if not required and empty
  
  // For manual invoices, we'll be more lenient
  // First try strict validation, then fall back to format validation
  const strictValidation = validateFrenchVat(vat)
  if (strictValidation) return true
  
  // Fall back to format validation for testing/flexibility
  return validateFrenchVatFormat(vat)
}

/**
 * Validates invoice number for manual creation
 */
export function validateManualInvoiceNumber(invoiceNumber: string): boolean {
  if (!invoiceNumber) return false
  
  // Allow various formats for manual invoices
  // Must be 1-50 characters, can contain letters, numbers, hyphens, slashes
  return /^[A-Z0-9\-\/\.]{1,50}$/i.test(invoiceNumber.trim())
}

/**
 * Validates payment terms (1-60 days for manual invoices)
 */
export function validateManualPaymentTerms(days: number): boolean {
  return days >= 1 && days <= 60 && Number.isInteger(days)
}

/**
 * Validates line item quantity
 */
export function validateQuantity(quantity: number): boolean {
  return quantity > 0 && Number.isFinite(quantity)
}

/**
 * Validates line item unit price
 */
export function validateUnitPrice(price: number): boolean {
  return price >= 0 && Number.isFinite(price)
}

/**
 * Validates VAT rate (must be one of the standard French rates or 0)
 */
export function validateVatRateForManualInvoice(rate: number): boolean {
  const validRates = [0, 2.1, 5.5, 10, 20]
  return validRates.some(validRate => Math.abs(rate - validRate) < 0.01)
}