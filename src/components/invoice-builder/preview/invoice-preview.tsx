'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  X, 
  Download, 
  Send, 
  FileOutput, 
  Eye,
  Building,
  Users,
  Calendar,
  Hash,
  Euro,
  CheckCircle,
  Info
} from 'lucide-react'
import { InvoiceFormData } from '../invoice-builder-form'

interface InvoicePreviewProps {
  invoiceData: InvoiceFormData | null
  onClose: () => void
  onGenerate: () => void
}

export function InvoicePreview({ invoiceData, onClose, onGenerate }: InvoicePreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  if (!invoiceData) {
    return null
  }

  // Calculate totals
  const calculateTotals = () => {
    let totalHT = 0
    let totalVAT = 0
    const vatBreakdown: { [key: number]: { base: number, amount: number } } = {}

    invoiceData.lineItems?.forEach((item) => {
      const htAmount = (item.quantity || 0) * (item.unitPrice || 0)
      const vatAmount = htAmount * ((item.vatRate || 0) / 100)
      
      totalHT += htAmount
      totalVAT += vatAmount

      // Group by VAT rate
      const rate = item.vatRate || 0
      if (!vatBreakdown[rate]) {
        vatBreakdown[rate] = { base: 0, amount: 0 }
      }
      vatBreakdown[rate].base += htAmount
      vatBreakdown[rate].amount += vatAmount
    })

    return {
      totalHT,
      totalVAT,
      totalTTC: totalHT + totalVAT,
      vatBreakdown
    }
  }

  const totals = calculateTotals()

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      await onGenerate()
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-green-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center">
              <Eye className="h-6 w-6 mr-2 text-blue-600" />
              Aperçu de la facture
            </h2>
            <p className="text-slate-600 mt-1">
              Prévisualisation avant génération Factur-X
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:opacity-90"
            >
              <FileOutput className="h-4 w-4 mr-2" />
              {isGenerating ? 'Génération...' : 'Générer Factur-X'}
            </Button>
            
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Invoice Preview */}
          <div className="bg-white border rounded-lg p-8 shadow-sm">
            {/* Header Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Company Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                  <Building className="h-5 w-5 mr-2 text-blue-600" />
                  Émetteur
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="font-semibold text-slate-900">
                    {invoiceData.issuer?.companyName}
                  </div>
                  <div className="text-slate-700 whitespace-pre-line">
                    {invoiceData.issuer?.address}
                  </div>
                  {invoiceData.issuer?.siret && (
                    <div className="text-slate-600">
                      SIRET: {invoiceData.issuer.siret}
                    </div>
                  )}
                  {invoiceData.issuer?.vatNumber && (
                    <div className="text-slate-600">
                      TVA: {invoiceData.issuer.vatNumber}
                    </div>
                  )}
                  {invoiceData.issuer?.iban && (
                    <div className="text-slate-600">
                      IBAN: {invoiceData.issuer.iban}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-600" />
                  Destinataire
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="font-semibold text-slate-900">
                    {invoiceData.customer?.companyName}
                  </div>
                  <div className="text-slate-700 whitespace-pre-line">
                    {invoiceData.customer?.address}
                  </div>
                  {invoiceData.customer?.siret && (
                    <div className="text-slate-600">
                      SIRET: {invoiceData.customer.siret}
                    </div>
                  )}
                  {invoiceData.customer?.vatNumber && (
                    <div className="text-slate-600">
                      TVA: {invoiceData.customer.vatNumber}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-4 bg-slate-50 rounded-lg">
              <div>
                <div className="flex items-center text-sm text-slate-600 mb-1">
                  <Hash className="h-4 w-4 mr-1" />
                  Numéro de facture
                </div>
                <div className="font-bold text-slate-900">
                  {invoiceData.invoiceNumber}
                </div>
              </div>
              
              <div>
                <div className="flex items-center text-sm text-slate-600 mb-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Date de facture
                </div>
                <div className="font-bold text-slate-900">
                  {invoiceData.invoiceDate ? 
                    new Date(invoiceData.invoiceDate).toLocaleDateString('fr-FR') : 
                    '-'
                  }
                </div>
              </div>
              
              <div>
                <div className="flex items-center text-sm text-slate-600 mb-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Date d'échéance
                </div>
                <div className="font-bold text-slate-900">
                  {invoiceData.dueDate ? 
                    new Date(invoiceData.dueDate).toLocaleDateString('fr-FR') : 
                    'Non spécifiée'
                  }
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Détail des prestations
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 rounded-lg">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 border-b font-semibold text-slate-900">Description</th>
                      <th className="text-right p-3 border-b font-semibold text-slate-900">Qté</th>
                      <th className="text-right p-3 border-b font-semibold text-slate-900">P.U. HT</th>
                      <th className="text-right p-3 border-b font-semibold text-slate-900">TVA</th>
                      <th className="text-right p-3 border-b font-semibold text-slate-900">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.lineItems?.map((item, index) => {
                      const totalHT = (item.quantity || 0) * (item.unitPrice || 0)
                      return (
                        <tr key={index} className="border-b">
                          <td className="p-3 text-slate-700">{item.description}</td>
                          <td className="p-3 text-right text-slate-700">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-700">{(item.unitPrice || 0).toFixed(2)}€</td>
                          <td className="p-3 text-right text-slate-700">{item.vatRate}%</td>
                          <td className="p-3 text-right font-medium text-slate-900">{totalHT.toFixed(2)}€</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* VAT Breakdown */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Détail TVA</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(totals.vatBreakdown).map(([rate, data]) => (
                    <div key={rate} className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>TVA {rate}%</span>
                      <span className="font-medium">{data.amount.toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Totals */}
              <div>
                <div className="space-y-3 text-right">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total HT:</span>
                    <span className="font-semibold text-slate-900">{totals.totalHT.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total TVA:</span>
                    <span className="font-semibold text-slate-900">{totals.totalVAT.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold border-t pt-3">
                    <span>Total TTC:</span>
                    <span className="text-green-600">{totals.totalTTC.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            {(invoiceData.paymentMethod || invoiceData.paymentTerms) && (
              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Conditions de paiement</h4>
                <div className="text-sm text-slate-700 space-y-1">
                  {invoiceData.paymentMethod && (
                    <div>Moyen de paiement: {invoiceData.paymentMethod}</div>
                  )}
                  {invoiceData.paymentTerms && (
                    <div>Délai de paiement: {invoiceData.paymentTerms} jours</div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {invoiceData.notes && (
              <div className="mt-8 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Notes</h4>
                <div className="text-sm text-slate-700 whitespace-pre-line">
                  {invoiceData.notes}
                </div>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-6 space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Conformité Factur-X:</strong> Cette prévisualisation correspond au format final 
                qui sera généré avec les métadonnées XML intégrées.
              </AlertDescription>
            </Alert>

            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Format de sortie:</strong> PDF/A-3 avec XML Factur-X embarqué, 
                conforme à la norme européenne EN 16931.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  )
}