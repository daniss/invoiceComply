import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string | null
  
  // Supplier/Issuer fields (flat structure)
  supplierName: string
  supplierAddress: string
  supplierSiret: string
  supplierVatNumber: string
  
  // Customer/Buyer fields (flat structure)
  buyerName: string
  buyerAddress: string
  buyerSiret?: string
  buyerVatNumber?: string
  
  lineItems: Array<{
    description: string
    quantity: number
    unitPrice: number
    vatRate: number
    totalHT: number
    totalVAT: number
    totalTTC: number
  }>
  
  // Totals (flat structure)
  totalAmountExcludingVat: number
  totalVatAmount: number
  totalAmountIncludingVat: number
  
  paymentTerms?: number | null
  paymentMethod?: string | null
  notes?: string | null
  currency?: string
}

export async function generateInvoicePDF(invoiceData: InvoiceData) {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4 size in points
    
    // Load fonts
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    
    const { width, height } = page.getSize()
    const margin = 50
    let yPosition = height - margin

    // Helper function to draw text
    const drawText = (text: string, x: number, y: number, options: any = {}) => {
      page.drawText(text, {
        x,
        y,
        font: options.font || fontRegular,
        size: options.size || 10,
        color: options.color || rgb(0, 0, 0),
        ...options
      })
    }

    // Helper function to draw line
    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8)
      })
    }

    // Title
    drawText('FACTURE', margin, yPosition, { 
      font: fontBold, 
      size: 24, 
      color: rgb(0.2, 0.4, 0.8) 
    })
    yPosition -= 40

    // Invoice info box
    drawText(`Numéro: ${invoiceData.invoiceNumber}`, width - 200, yPosition, { font: fontBold })
    yPosition -= 15
    drawText(`Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString('fr-FR')}`, width - 200, yPosition)
    if (invoiceData.dueDate) {
      yPosition -= 15
      drawText(`Échéance: ${new Date(invoiceData.dueDate).toLocaleDateString('fr-FR')}`, width - 200, yPosition)
    }
    
    yPosition -= 40

    // Issuer and Customer sections
    const middleX = width / 2

    // Issuer section
    drawText('ÉMETTEUR', margin, yPosition, { font: fontBold, size: 12 })
    yPosition -= 20
    
    drawText(invoiceData.supplierName, margin, yPosition, { font: fontBold })
    yPosition -= 15
    
    // Split address into lines
    const issuerAddressLines = invoiceData.supplierAddress.split('\n')
    issuerAddressLines.forEach(line => {
      drawText(line, margin, yPosition)
      yPosition -= 12
    })
    
    drawText(`SIRET: ${invoiceData.supplierSiret}`, margin, yPosition)
    yPosition -= 12
    drawText(`TVA: ${invoiceData.supplierVatNumber}`, margin, yPosition)
    // Note: IBAN field not included in flat structure for now

    // Reset yPosition for customer section
    yPosition = height - margin - 40 - 40

    // Customer section
    drawText('DESTINATAIRE', middleX, yPosition, { font: fontBold, size: 12 })
    yPosition -= 20
    
    drawText(invoiceData.buyerName, middleX, yPosition, { font: fontBold })
    yPosition -= 15
    
    // Split customer address into lines
    const customerAddressLines = invoiceData.buyerAddress.split('\n')
    customerAddressLines.forEach(line => {
      drawText(line, middleX, yPosition)
      yPosition -= 12
    })
    
    if (invoiceData.buyerSiret) {
      drawText(`SIRET: ${invoiceData.buyerSiret}`, middleX, yPosition)
      yPosition -= 12
    }
    if (invoiceData.buyerVatNumber) {
      drawText(`TVA: ${invoiceData.buyerVatNumber}`, middleX, yPosition)
      yPosition -= 12
    }

    // Move to line items section
    yPosition = height - 300

    // Line items table
    drawText('DÉTAIL DES PRESTATIONS', margin, yPosition, { font: fontBold, size: 12 })
    yPosition -= 25

    // Table headers
    const tableY = yPosition
    const colWidths = [250, 60, 80, 60, 80]
    const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], 
                  margin + colWidths[0] + colWidths[1] + colWidths[2], 
                  margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]]

    // Header row
    drawLine(margin, tableY, width - margin, tableY)
    drawText('Description', colX[0], tableY - 15, { font: fontBold })
    drawText('Qté', colX[1], tableY - 15, { font: fontBold })
    drawText('P.U. HT', colX[2], tableY - 15, { font: fontBold })
    drawText('TVA', colX[3], tableY - 15, { font: fontBold })
    drawText('Total HT', colX[4], tableY - 15, { font: fontBold })
    
    drawLine(margin, tableY - 20, width - margin, tableY - 20)
    yPosition = tableY - 35

    // Line items
    invoiceData.lineItems.forEach((item, index) => {
      drawText(item.description.length > 35 ? item.description.substring(0, 35) + '...' : item.description, colX[0], yPosition)
      drawText(item.quantity.toString(), colX[1], yPosition)
      drawText(`${item.unitPrice.toFixed(2)}€`, colX[2], yPosition)
      drawText(`${item.vatRate}%`, colX[3], yPosition)
      drawText(`${item.totalHT.toFixed(2)}€`, colX[4], yPosition)
      yPosition -= 20
    })

    // Table bottom line
    drawLine(margin, yPosition + 5, width - margin, yPosition + 5)
    yPosition -= 20

    // Totals section
    const totalsX = width - 200
    drawText('Total HT:', totalsX, yPosition, { font: fontBold })
    drawText(`${invoiceData.totalAmountExcludingVat.toFixed(2)}€`, totalsX + 80, yPosition, { font: fontBold })
    yPosition -= 15

    drawText('Total TVA:', totalsX, yPosition, { font: fontBold })
    drawText(`${invoiceData.totalVatAmount.toFixed(2)}€`, totalsX + 80, yPosition, { font: fontBold })
    yPosition -= 15

    drawText('Total TTC:', totalsX, yPosition, { font: fontBold, size: 12, color: rgb(0.2, 0.6, 0.2) })
    drawText(`${invoiceData.totalAmountIncludingVat.toFixed(2)}€`, totalsX + 80, yPosition, { font: fontBold, size: 12, color: rgb(0.2, 0.6, 0.2) })
    yPosition -= 30

    // Payment info
    if (invoiceData.paymentMethod || invoiceData.paymentTerms) {
      drawText('CONDITIONS DE PAIEMENT', margin, yPosition, { font: fontBold, size: 10 })
      yPosition -= 15
      
      if (invoiceData.paymentMethod) {
        drawText(`Mode de paiement: ${invoiceData.paymentMethod}`, margin, yPosition)
        yPosition -= 12
      }
      
      if (invoiceData.paymentTerms) {
        drawText(`Délai de paiement: ${invoiceData.paymentTerms} jours`, margin, yPosition)
        yPosition -= 12
      }
      
      yPosition -= 10
    }

    // Notes
    if (invoiceData.notes) {
      drawText('NOTES', margin, yPosition, { font: fontBold, size: 10 })
      yPosition -= 15
      
      const noteLines = invoiceData.notes.split('\n')
      noteLines.forEach(line => {
        // Split long lines
        const words = line.split(' ')
        let currentLine = ''
        
        words.forEach(word => {
          if ((currentLine + word).length > 80) {
            if (currentLine) {
              drawText(currentLine.trim(), margin, yPosition, { size: 9 })
              yPosition -= 12
              currentLine = word + ' '
            }
          } else {
            currentLine += word + ' '
          }
        })
        
        if (currentLine.trim()) {
          drawText(currentLine.trim(), margin, yPosition, { size: 9 })
          yPosition -= 12
        }
      })
    }

    // Footer
    yPosition = 60
    drawText('Facture générée automatiquement par InvoiceComply', margin, yPosition, { 
      size: 8, 
      color: rgb(0.5, 0.5, 0.5) 
    })
    drawText(`Conforme à la réglementation française - ${new Date().toLocaleDateString('fr-FR')}`, 
             margin, yPosition - 10, { 
      size: 8, 
      color: rgb(0.5, 0.5, 0.5) 
    })

    // Save the PDF
    const pdfBytes = await pdfDoc.save()

    return {
      success: true,
      pdfBuffer: Buffer.from(pdfBytes)
    }

  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return {
      success: false,
      error: 'Erreur lors de la génération du PDF'
    }
  }
}