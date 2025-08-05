/**
 * French-specific formatting utilities
 */

/**
 * Format amount in French currency format
 */
export function formatFrenchCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

/**
 * Format number in French format (space as thousands separator, comma as decimal)
 */
export function formatFrenchNumber(number: number): string {
  return new Intl.NumberFormat('fr-FR').format(number)
}

/**
 * Format date in French format (DD/MM/YYYY)
 */
export function formatFrenchDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR').format(dateObj)
}

/**
 * Format SIRET with spaces for readability (123 456 789 01234)
 */
export function formatSiret(siret: string): string {
  if (!siret) return ''
  
  const clean = siret.replace(/\s/g, '')
  if (clean.length !== 14) return siret
  
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`
}

/**
 * Format French VAT number with spaces (FR 12 345678901)
 */
export function formatFrenchVat(vat: string): string {
  if (!vat) return ''
  
  const clean = vat.replace(/\s/g, '').toUpperCase()
  if (!clean.startsWith('FR') || clean.length !== 13) return vat
  
  return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4)}`
}

/**
 * Parse French date (DD/MM/YYYY) to Date object
 */
export function parseFrenchDate(dateStr: string): Date | null {
  if (!dateStr) return null
  
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  
  const day = parseInt(parts[0])
  const month = parseInt(parts[1]) - 1 // Month is 0-indexed
  const year = parseInt(parts[2])
  
  const date = new Date(year, month, day)
  
  // Check if the date is valid
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null
  }
  
  return date
}

/**
 * Format file size in French
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['octets', 'Ko', 'Mo', 'Go']
  if (bytes === 0) return '0 octet'
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Generate French-style invoice number
 */
export function generateInvoiceNumber(year: number, sequence: number, prefix: string = 'FAC'): string {
  return `${prefix}-${year}-${sequence.toString().padStart(6, '0')}`
}

/**
 * Capitalize French text properly (handling accents)
 */
export function capitalizeFrench(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Format percentage for French display
 */
export function formatFrenchPercentage(value: number): string {
  return `${formatFrenchNumber(value)} %`
}