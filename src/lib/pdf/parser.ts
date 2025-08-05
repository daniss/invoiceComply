/**
 * PDF parsing utilities for extracting invoice data
 */

import { PDFDocument } from 'pdf-lib'
import { validateSiret, validateFrenchVat, validateFrenchDate } from '@/lib/validations/french-business'
import { parseFrenchDate } from '@/lib/utils/french-formatting'

// Direct import for Node.js runtime
let pdfParse: any = null

if (typeof window === 'undefined') {
  try {
    pdfParse = require('pdf-parse')
    console.log('pdf-parse loaded successfully')
  } catch (error) {
    console.error('pdf-parse not available:', error)
  }
}

export interface ExtractedInvoiceData {
  // Basic information
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  
  // Supplier information
  supplierName?: string
  supplierAddress?: string
  supplierSiret?: string
  supplierVatNumber?: string
  
  // Buyer information
  buyerName?: string
  buyerAddress?: string
  buyerSiret?: string
  buyerVatNumber?: string
  
  // Financial information
  totalAmountExcludingVat?: number
  totalVatAmount?: number
  totalAmountIncludingVat?: number
  vatBreakdown?: VatBreakdownItem[]
  currency?: string
  
  // Payment information
  paymentTerms?: number
  paymentMethod?: string
  bankDetails?: string
  
  // Additional data
  description?: string
  lineItems?: InvoiceLineItem[]
  notes?: string
  
  // Metadata
  confidence: number // 0-1 score for extraction accuracy
  extractedText: string
  issues: string[]
}

export interface VatBreakdownItem {
  rate: number
  baseAmount: number
  vatAmount: number
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  vatRate: number
}

export interface PdfParsingOptions {
  extractText: boolean
  extractMetadata: boolean
  validateFields: boolean
  language: 'fr' | 'en'
}

/**
 * Extract text content from PDF file
 */
export async function extractTextFromPdf(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    if (pdfParse) {
      console.log('Using pdf-parse to extract text from buffer of size:', pdfBuffer.byteLength)
      const data = await pdfParse(Buffer.from(pdfBuffer))
      console.log('pdf-parse extraction successful, text length:', data.text?.length || 0)
      return data.text || ''
    } else {
      console.error('pdf-parse not available')
      throw new Error('PDF parsing library not available')
    }
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    
    // Check if it's a corrupted PDF issue
    if (error instanceof Error && (
      error.message.includes('bad XRef') || 
      error.message.includes('FormatError') ||
      error.message.includes('UnknownErrorException') ||
      error.message.includes('Command token too long') ||
      error.toString().includes('FormatError') ||
      error.toString().includes('UnknownErrorException')
    )) {
      console.warn('PDF appears to be corrupted or has formatting issues. Returning basic extracted data.')
      // Return a basic structure that indicates the PDF was processed but text extraction failed
      return 'PDF_PARSING_FAILED: Corrupted or unsupported PDF format'
    }
    
    throw new Error('Failed to extract text from PDF')
  }
}

/**
 * Parse invoice data from extracted text using regex patterns
 */
export function parseInvoiceFromText(text: string, options: PdfParsingOptions = {
  extractText: true,
  extractMetadata: true,
  validateFields: true,
  language: 'fr'
}): ExtractedInvoiceData {
  const result: ExtractedInvoiceData = {
    confidence: 0,
    extractedText: text,
    issues: [],
    currency: 'EUR'
  }

  // Handle corrupted PDF case
  if (text.startsWith('PDF_PARSING_FAILED:')) {
    result.issues.push('PDF corrompu ou format non supporté')
    result.confidence = 0
    return result
  }

  try {
    // Invoice number patterns (French formats)
    const invoiceNumberPatterns = [
      /(?:facture|invoice|fact?\.?)\s*n[°o]?\s*:?\s*([A-Z0-9\-\/]{1,20})/i,
      /(?:numéro|number|n[°o])\s*:?\s*([A-Z0-9\-\/]{1,20})/i,
      /#\s*(\d+)/i, // Handle "# 1" format
      /([A-Z]{2,4}[-\/]?\d{4}[-\/]?\d{3,6})/i
    ]
    
    for (const pattern of invoiceNumberPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.invoiceNumber = match[1].trim()
        break
      }
    }

    // Date patterns (French DD/MM/YYYY format)
    const datePatterns = [
      /(?:date|du)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/gi,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/g
    ]
    
    const dates: string[] = []
    for (const pattern of datePatterns) {
      const matches = [...text.matchAll(pattern)]
      matches.forEach(match => {
        const dateStr = match[1].replace(/[-\.]/g, '/')
        if (validateFrenchDate(dateStr)) {
          dates.push(dateStr)
        }
      })
    }
    
    if (dates.length > 0) {
      result.invoiceDate = dates[0]
      if (dates.length > 1) {
        result.dueDate = dates[1]
      }
    }

    // SIRET patterns
    const siretPattern = /(?:siret|siren)\s*:?\s*(\d{14}|\d{9})/i
    const siretMatch = text.match(siretPattern)
    if (siretMatch) {
      const siret = siretMatch[1]
      if (siret.length === 14) {
        result.supplierSiret = siret
      }
    }

    // VAT number patterns
    const vatPattern = /(FR\s?\d{11})/i
    const vatMatch = text.match(vatPattern)
    if (vatMatch) {
      const vat = vatMatch[1].replace(/\s/g, '')
      if (validateFrenchVat(vat)) {
        result.supplierVatNumber = vat
      }
    }

    // Amount patterns (French number format)
    const amountPatterns = [
      /(?:total|montant)\s*(?:ttc|ht)?\s*:?\s*([\d\s]{1,10}[,\.]\d{2})\s*€?/gi,
      /(\d{1,3}(?:\s\d{3})*[,\.]\d{2})\s*€/g
    ]
    
    const amounts: number[] = []
    for (const pattern of amountPatterns) {
      const matches = [...text.matchAll(pattern)]
      matches.forEach(match => {
        const amountStr = match[1].replace(/\s/g, '').replace(',', '.')
        const amount = parseFloat(amountStr)
        if (!isNaN(amount) && amount > 0) {
          amounts.push(amount)
        }
      })
    }
    
    if (amounts.length > 0) {
      // Assume the largest amount is total including VAT
      amounts.sort((a, b) => b - a)
      result.totalAmountIncludingVat = amounts[0]
      
      // Estimate VAT amount (20% is standard rate)
      const estimatedVatRate = 0.20
      result.totalAmountExcludingVat = Math.round((amounts[0] / (1 + estimatedVatRate)) * 100) / 100
      result.totalVatAmount = Math.round((amounts[0] - result.totalAmountExcludingVat) * 100) / 100
    }

    // Company name patterns
    const companyPatterns = [
      /(?:société|entreprise|company)\s*:?\s*([A-Z][A-Za-z\s&]{2,50})/i,
      /^([A-Z][A-Za-z\s&]{2,50}(?:\s(?:SARL|SAS|SA|EURL))?)/m
    ]
    
    for (const pattern of companyPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.supplierName = match[1].trim()
        break
      }
    }

    // Calculate confidence score
    let confidence = 0
    if (result.invoiceNumber) confidence += 0.3
    if (result.invoiceDate) confidence += 0.2
    if (result.supplierSiret) confidence += 0.2
    if (result.totalAmountIncludingVat) confidence += 0.2
    if (result.supplierName) confidence += 0.1
    
    result.confidence = Math.min(confidence, 1.0)

    // Validation
    if (options.validateFields) {
      if (result.supplierSiret && !validateSiret(result.supplierSiret)) {
        result.issues.push('SIRET invalide détecté')
      }
      
      if (result.supplierVatNumber && !validateFrenchVat(result.supplierVatNumber)) {
        result.issues.push('Numéro de TVA invalide détecté')
      }
      
      if (result.invoiceDate && !validateFrenchDate(result.invoiceDate)) {
        result.issues.push('Format de date invalide détecté')
      }
    }

  } catch (error) {
    console.error('Error parsing invoice text:', error)
    result.issues.push('Erreur lors du parsing du texte')
  }

  return result
}

/**
 * Parse PDF file and extract invoice data
 */
export async function parsePdfInvoice(
  pdfBuffer: ArrayBuffer, 
  options?: PdfParsingOptions
): Promise<ExtractedInvoiceData> {
  try {
    // Extract text from PDF
    const extractedText = await extractTextFromPdf(pdfBuffer)
    
    // Parse invoice data from text
    const invoiceData = parseInvoiceFromText(extractedText, options)
    
    return invoiceData
  } catch (error) {
    console.error('Error parsing PDF invoice:', error)
    throw new Error('Failed to parse PDF invoice')
  }
}

/**
 * Validate extracted invoice data for compliance
 */
export function validateExtractedData(data: ExtractedInvoiceData): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check mandatory fields
  if (!data.invoiceNumber) {
    errors.push('Numéro de facture manquant')
  }
  
  if (!data.invoiceDate) {
    errors.push('Date de facture manquante')
  }
  
  if (!data.supplierSiret) {
    warnings.push('SIRET du fournisseur manquant')
  }
  
  if (!data.totalAmountIncludingVat) {
    errors.push('Montant total manquant')
  }

  // Validate formats
  if (data.supplierSiret && !validateSiret(data.supplierSiret)) {
    errors.push('Format SIRET invalide')
  }
  
  if (data.supplierVatNumber && !validateFrenchVat(data.supplierVatNumber)) {
    errors.push('Format numéro de TVA invalide')
  }
  
  if (data.invoiceDate && !validateFrenchDate(data.invoiceDate)) {
    errors.push('Format de date invalide')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Enhance extracted data with additional processing
 */
export function enhanceExtractedData(data: ExtractedInvoiceData): ExtractedInvoiceData {
  const enhanced = { ...data }

  // Standardize date format
  if (enhanced.invoiceDate) {
    try {
      const parsed = parseFrenchDate(enhanced.invoiceDate)
      if (parsed) {
        enhanced.invoiceDate = parsed.toLocaleDateString('fr-FR')
      }
    } catch (error) {
      enhanced.issues.push('Impossible de parser la date de facture')
    }
  }

  // Format SIRET
  if (enhanced.supplierSiret) {
    enhanced.supplierSiret = enhanced.supplierSiret.replace(/\s/g, '')
  }

  // Ensure amounts are properly rounded
  if (enhanced.totalAmountExcludingVat) {
    enhanced.totalAmountExcludingVat = Math.round(enhanced.totalAmountExcludingVat * 100) / 100
  }
  
  if (enhanced.totalVatAmount) {
    enhanced.totalVatAmount = Math.round(enhanced.totalVatAmount * 100) / 100
  }
  
  if (enhanced.totalAmountIncludingVat) {
    enhanced.totalAmountIncludingVat = Math.round(enhanced.totalAmountIncludingVat * 100) / 100
  }

  return enhanced
}