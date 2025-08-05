import { PDFDocument, PDFName, PDFString, PDFDict, PDFArray } from 'pdf-lib'
import { generateInvoicePDF } from './manual-pdf-generator'
import { generateFacturXXML } from './xml-generator'

interface ManualInvoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string | null
  
  // Issuer fields (flat structure matching database)
  issuer_company_name: string
  issuer_address: string
  issuer_siret: string
  issuer_vat_number: string
  issuer_iban?: string
  
  // Customer fields (flat structure matching database)
  customer_company_name: string
  customer_address: string
  customer_siret?: string
  customer_vat_number?: string
  
  // Line items (JSONB in database)
  line_items: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    vatRate: number
  }>
  
  // Totals (database column names)
  total_amount_excluding_vat: number
  total_vat_amount: number
  total_amount_including_vat: number
  
  // Additional fields
  payment_terms?: number | null
  payment_method?: string | null
  notes?: string | null
}

export async function generateFacturXFromManualInvoice(invoice: ManualInvoice) {
  try {
    // Transform manual invoice to the format expected by XML generator
    const standardInvoice = {
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      
      // Supplier/Issuer fields (direct mapping for XML generator)
      supplierName: invoice.issuer_company_name,
      supplierAddress: invoice.issuer_address,
      supplierSiret: invoice.issuer_siret,
      supplierVatNumber: invoice.issuer_vat_number,
      
      // Customer/Buyer fields (direct mapping for XML generator)
      buyerName: invoice.customer_company_name,
      buyerAddress: invoice.customer_address,
      buyerSiret: invoice.customer_siret,
      buyerVatNumber: invoice.customer_vat_number,
      
      // Line items
      lineItems: invoice.line_items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        totalHT: item.quantity * item.unitPrice,
        totalVAT: (item.quantity * item.unitPrice) * (item.vatRate / 100),
        totalTTC: (item.quantity * item.unitPrice) * (1 + item.vatRate / 100)
      })),
      
      // Totals
      totalAmountExcludingVat: invoice.total_amount_excluding_vat,
      totalVatAmount: invoice.total_vat_amount,
      totalAmountIncludingVat: invoice.total_amount_including_vat,
      
      // Additional info
      paymentTerms: invoice.payment_terms,
      paymentMethod: invoice.payment_method,
      notes: invoice.notes,
      
      // Currency (default to EUR for French invoices)
      currency: 'EUR'
    }

    // Generate PDF
    const pdfResult = await generateInvoicePDF(standardInvoice)
    if (!pdfResult.success) {
      return { success: false, error: pdfResult.error }
    }

    // Generate XML
    const xmlResult = await generateFacturXXML(standardInvoice)
    if (!xmlResult.success) {
      return { success: false, error: xmlResult.error }
    }

    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfResult.pdfBuffer)

    // Create embedded file specification for the XML
    const xmlBytes = Buffer.from(xmlResult.xmlContent, 'utf-8')
    
    // Create file specification dictionary
    const fileSpec = pdfDoc.context.obj({
      Type: 'Filespec',
      F: PDFString.of('factur-x.xml'),
      UF: PDFString.of('factur-x.xml'),
      Desc: PDFString.of('Factur-X XML Invoice'),
      AFRelationship: PDFName.of('Data'),
      EF: {
        F: pdfDoc.context.flateStream(xmlBytes, {
          Type: 'EmbeddedFile',
          Subtype: 'text#2Fxml',
          Params: {
            ModDate: PDFString.of(`D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z`),
            Size: xmlBytes.length,
            CheckSum: PDFString.of(generateMD5Hash(xmlBytes))
          }
        })
      }
    })

    // Get or create Names dictionary
    let names = pdfDoc.catalog.get(PDFName.of('Names'))
    if (!names) {
      names = pdfDoc.context.obj({})
      pdfDoc.catalog.set(PDFName.of('Names'), names)
    }

    // Get or create EmbeddedFiles dictionary
    let embeddedFiles = names.get(PDFName.of('EmbeddedFiles'))
    if (!embeddedFiles) {
      embeddedFiles = pdfDoc.context.obj({
        Names: []
      })
      names.set(PDFName.of('EmbeddedFiles'), embeddedFiles)
    }

    // Add file to EmbeddedFiles Names array
    const namesArray = embeddedFiles.get(PDFName.of('Names')) as PDFArray
    namesArray.push(PDFString.of('factur-x.xml'))
    namesArray.push(fileSpec)

    // Set PDF/A-3 compliance metadata
    const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <fx:ConformanceLevel>BASIC</fx:ConformanceLevel>
      <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:Version>1.0</fx:Version>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="fr">Facture ${standardInvoice.invoiceNumber}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>${standardInvoice.supplierName}</rdf:li>
        </rdf:Seq>
      </dc:creator>
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="fr">Facture électronique conforme Factur-X</rdf:li>
        </rdf:Alt>
      </dc:description>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`

    // Set metadata
    pdfDoc.catalog.set(
      PDFName.of('Metadata'),
      pdfDoc.context.flateStream(Buffer.from(metadata, 'utf-8'), {
        Type: 'Metadata',
        Subtype: 'XML'
      })
    )

    // Set PDF version to 1.7 for PDF/A-3 compliance
    pdfDoc.context.trailerInfo.Root = pdfDoc.catalog
    pdfDoc.context.trailerInfo.ID = [
      PDFString.of(generateMD5Hash(Buffer.from(invoice.id))),
      PDFString.of(generateMD5Hash(Buffer.from(new Date().toISOString())))
    ]

    // Save the PDF with embedded XML
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false
    })

    return {
      success: true,
      pdfBuffer: Buffer.from(pdfBytes),
      xmlContent: xmlResult.xmlContent,
      fileName: `facture_${standardInvoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    }

  } catch (error) {
    console.error('Error generating Factur-X from manual invoice:', error)
    return {
      success: false,
      error: 'Erreur lors de la génération du Factur-X'
    }
  }
}

// Simple MD5 hash function (for demo purposes - use crypto in production)
function generateMD5Hash(buffer: Buffer): string {
  const crypto = require('crypto')
  return crypto.createHash('md5').update(buffer).digest('hex')
}