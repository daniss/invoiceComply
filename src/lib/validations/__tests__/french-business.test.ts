/**
 * Tests for French business validations
 * Using real SIRET numbers for validation (publicly available test data)
 */

import { 
  validateSiret, 
  validateFrenchVat, 
  validateSiren, 
  validateVatRate,
  validateFrenchDate,
  validatePaymentTerms,
  validateInvoiceNumber,
  validateAmount
} from '../french-business'

describe('French Business Validations', () => {
  describe('SIRET Validation', () => {
    test('should validate correct SIRET numbers', () => {
      // These are example SIRET numbers for testing (not real companies)
      expect(validateSiret('73282932000074')).toBe(true) // Sample valid SIRET
      expect(validateSiret('41222421800019')).toBe(true) // Another valid SIRET
    })

    test('should reject invalid SIRET numbers', () => {
      expect(validateSiret('73282932000075')).toBe(false) // Wrong check digit
      expect(validateSiret('1234567890123')).toBe(false) // Only 13 digits
      expect(validateSiret('123456789012345')).toBe(false) // 15 digits
      expect(validateSiret('7328293200007A')).toBe(false) // Contains letter
      expect(validateSiret('')).toBe(false) // Empty string
      expect(validateSiret('732 829 320 00074')).toBe(true) // With spaces (should work)
    })
  })

  describe('French VAT Validation', () => {
    test('should validate correct French VAT numbers', () => {
      expect(validateFrenchVat('FR07732829320')).toBe(true) // Based on SIRET above
      expect(validateFrenchVat('FR12345678901')).toBe(true) // Generic valid format
    })

    test('should reject invalid French VAT numbers', () => {
      expect(validateFrenchVat('FR07732829321')).toBe(false) // Wrong SIREN part
      expect(validateFrenchVat('DE123456789')).toBe(false) // German VAT
      expect(validateFrenchVat('FR1234567890')).toBe(false) // Only 10 digits after FR
      expect(validateFrenchVat('FR123456789012')).toBe(false) // 12 digits after FR
      expect(validateFrenchVat('')).toBe(false) // Empty string
    })
  })

  describe('VAT Rate Validation', () => {
    test('should accept valid French VAT rates', () => {
      expect(validateVatRate(0)).toBe(true) // Exempt
      expect(validateVatRate(2.1)).toBe(true) // Super reduced
      expect(validateVatRate(5.5)).toBe(true) // Reduced
      expect(validateVatRate(10)).toBe(true) // Intermediate
      expect(validateVatRate(20)).toBe(true) // Standard
    })

    test('should reject invalid VAT rates', () => {
      expect(validateVatRate(19)).toBe(false) // Not a French rate
      expect(validateVatRate(25)).toBe(false) // Too high
      expect(validateVatRate(-5)).toBe(false) // Negative
      expect(validateVatRate(3.14)).toBe(false) // Random number
    })
  })

  describe('French Date Validation', () => {
    test('should accept valid French dates', () => {
      expect(validateFrenchDate('01/01/2024')).toBe(true)
      expect(validateFrenchDate('31/12/2023')).toBe(true)
      expect(validateFrenchDate('29/02/2024')).toBe(true) // Leap year
    })

    test('should reject invalid French dates', () => {
      expect(validateFrenchDate('32/01/2024')).toBe(false) // Invalid day
      expect(validateFrenchDate('01/13/2024')).toBe(false) // Invalid month
      expect(validateFrenchDate('29/02/2023')).toBe(false) // Not a leap year
      expect(validateFrenchDate('2024-01-01')).toBe(false) // Wrong format
      expect(validateFrenchDate('')).toBe(false) // Empty string
    })
  })

  describe('Payment Terms Validation', () => {
    test('should accept valid payment terms', () => {
      expect(validatePaymentTerms(30, false)).toBe(true) // B2B within 60 days
      expect(validatePaymentTerms(60, false)).toBe(true) // B2B maximum
      expect(validatePaymentTerms(30, true)).toBe(true) // B2G maximum
      expect(validatePaymentTerms(0, false)).toBe(true) // Immediate payment
    })

    test('should reject invalid payment terms', () => {
      expect(validatePaymentTerms(61, false)).toBe(false) // B2B over 60 days
      expect(validatePaymentTerms(31, true)).toBe(false) // B2G over 30 days
      expect(validatePaymentTerms(-1, false)).toBe(false) // Negative days
    })
  })

  describe('Invoice Number Validation', () => {
    test('should accept valid invoice numbers', () => {
      expect(validateInvoiceNumber('FAC-2024-000001')).toBe(true)
      expect(validateInvoiceNumber('2024-001')).toBe(true)
      expect(validateInvoiceNumber('INV001')).toBe(true)
    })

    test('should reject invalid invoice numbers', () => {
      expect(validateInvoiceNumber('')).toBe(false) // Empty
      expect(validateInvoiceNumber('A'.repeat(21))).toBe(false) // Too long
      expect(validateInvoiceNumber('INV@001')).toBe(false) // Invalid character
    })
  })

  describe('Amount Validation', () => {
    test('should accept valid amounts', () => {
      expect(validateAmount(100)).toBe(true)
      expect(validateAmount(0)).toBe(true)
      expect(validateAmount(99.99)).toBe(true) // 2 decimal places
      expect(validateAmount(1000.5)).toBe(true) // 1 decimal place
    })

    test('should reject invalid amounts', () => {
      expect(validateAmount(-1)).toBe(false) // Negative
      expect(validateAmount(99.999)).toBe(false) // 3 decimal places
    })
  })
})

// Additional integration test
describe('Integration Tests', () => {
  test('should validate complete French business scenario', () => {
    const siret = '73282932000074'
    const vatNumber = 'FR07732829320'
    const invoiceDate = '15/03/2024'
    const vatRate = 20
    const paymentTerms = 30
    const amount = 1000.00

    expect(validateSiret(siret)).toBe(true)
    expect(validateFrenchVat(vatNumber)).toBe(true)
    expect(validateFrenchDate(invoiceDate)).toBe(true)
    expect(validateVatRate(vatRate)).toBe(true)
    expect(validatePaymentTerms(paymentTerms, false)).toBe(true)
    expect(validateAmount(amount)).toBe(true)
  })
})