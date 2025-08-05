import { Metadata } from 'next'
import { InvoiceBuilderContent } from '@/components/invoice-builder/invoice-builder-content'

export const metadata: Metadata = {
  title: 'Créer Facture - InvoiceComply',
  description: 'Créez des factures conformes Factur-X manuellement avec validation en temps réel',
}

// Force dynamic rendering to prevent build-time authentication issues
export const dynamic = 'force-dynamic'

export default function CreateInvoicePage() {
  return <InvoiceBuilderContent />
}