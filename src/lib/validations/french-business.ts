/**
 * French business validations for SIRET, VAT numbers, and other compliance requirements
 */

/**
 * Validates French SIRET number (14 digits)
 */
export function validateSiret(siret: string): boolean {
  if (!siret) return false
  
  // Remove spaces and hyphens
  const cleanSiret = siret.replace(/[\s-]/g, '')
  
  // Must be exactly 14 digits
  if (!/^\d{14}$/.test(cleanSiret)) return false
  
  // SIRET uses a modified Luhn algorithm
  const digits = cleanSiret.split('').map(Number)
  let sum = 0
  
  // For SIRET, we alternate starting from the right (excluding check digit)
  for (let i = 12; i >= 0; i--) {
    let digit = digits[i]
    if ((12 - i) % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === digits[13]
}

/**
 * Validates French VAT number (FR + 11 digits)
 */
export function validateFrenchVat(vat: string): boolean {
  if (!vat) return false
  
  // Remove spaces and convert to uppercase
  const cleanVat = vat.replace(/\s/g, '').toUpperCase()
  
  // Must start with FR followed by 11 digits
  if (!/^FR\d{11}$/.test(cleanVat)) return false
  
  const vatNumber = cleanVat.substring(2)
  const siren = vatNumber.substring(2, 11)
  const key = parseInt(vatNumber.substring(0, 2))
  
  // Validate SIREN (first 9 digits of SIRET)
  if (!validateSiren(siren)) return false
  
  // Validate VAT key
  const expectedKey = (12 + 3 * (parseInt(siren) % 97)) % 97
  return key === expectedKey
}

/**
 * Validates French SIREN number (9 digits, extracted from SIRET)
 */
export function validateSiren(siren: string): boolean {
  if (!siren) return false
  
  const cleanSiren = siren.replace(/[\s-]/g, '')
  
  if (!/^\d{9}$/.test(cleanSiren)) return false
  
  // SIREN uses a modified Luhn algorithm
  const digits = cleanSiren.split('').map(Number)
  let sum = 0
  
  // For SIREN, we alternate starting from the right (excluding check digit)
  for (let i = 7; i >= 0; i--) {
    let digit = digits[i]
    if ((7 - i) % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === digits[8]
}

/**
 * Validates French VAT rates
 */
export function validateVatRate(rate: number): boolean {
  const validRates = [0, 2.1, 5.5, 10, 20]
  return validRates.includes(rate)
}

/**
 * Validates French date format (DD/MM/YYYY)
 */
export function validateFrenchDate(date: string): boolean {
  if (!date) return false
  
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
  const match = date.match(dateRegex)
  
  if (!match) return false
  
  const day = parseInt(match[1])
  const month = parseInt(match[2])
  const year = parseInt(match[3])
  
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  if (year < 1900 || year > 2100) return false
  
  // Check valid day for month
  const daysInMonth = new Date(year, month, 0).getDate()
  return day <= daysInMonth
}

/**
 * Validates payment terms (max 60 days B2B, 30 days B2G)
 */
export function validatePaymentTerms(days: number, isGovernment: boolean = false): boolean {
  if (days < 0) return false
  
  const maxDays = isGovernment ? 30 : 60
  return days <= maxDays
}

/**
 * Validates invoice number format (must be sequential)
 * This is a basic validation - actual sequential validation requires database check
 */
export function validateInvoiceNumber(invoiceNumber: string): boolean {
  if (!invoiceNumber) return false
  
  // French invoice numbers can contain letters and numbers
  // but must be sequential within the year
  return /^[A-Z0-9-\/]{1,20}$/i.test(invoiceNumber.trim())
}

/**
 * Validates amount (positive number with max 2 decimal places)
 */
export function validateAmount(amount: number): boolean {
  if (amount < 0) return false
  
  // Check for max 2 decimal places
  const decimal = amount.toString().split('.')[1]
  return !decimal || decimal.length <= 2
}

/**
 * Validates French legal entity type
 */
export function validateLegalEntity(entity: string): boolean {
  const validEntities = [
    'SARL', 'SAS', 'SASU', 'EURL', 'SA', 'SCA', 'SNC', 'SCS',
    'EARL', 'GAEC', 'GIE', 'EI', 'MICRO', 'AUTO-ENTREPRENEUR'
  ]
  
  return validEntities.includes(entity.toUpperCase().trim())
}