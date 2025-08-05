'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Eye, 
  FileText,
  Building,
  Calendar,
  Euro,
  Hash
} from 'lucide-react'
import { formatFrenchCurrency, formatSiret, formatFrenchVat } from '@/lib/utils/french-formatting'
import { validateInvoiceData, type ComplianceValidation } from '@/lib/invoice/validation-integration'
import type { ExtractedInvoiceData } from '@/lib/pdf/parser'

interface InvoicePreviewProps {
  invoiceData: ExtractedInvoiceData
  validation: ComplianceValidation
  onEdit: () => void
  onExport: (format: 'pdf' | 'xml') => void
  onValidate: () => void
}

export function InvoicePreview({ 
  invoiceData, 
  validation, 
  onEdit, 
  onExport, 
  onValidate 
}: InvoicePreviewProps) {
  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-200'
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getComplianceIcon = (isCompliant: boolean) => {
    return isCompliant ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <AlertCircle className="h-5 w-5 text-red-600" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Compliance Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-6 w-6" />
              <span>Aperçu de la facture</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {getComplianceIcon(validation.isCompliant)}
              <Badge 
                variant="outline" 
                className={`px-3 py-1 ${getComplianceColor(validation.score)}`}
              >
                {validation.score}% conforme
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!validation.isCompliant && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Problèmes de conformité détectés :</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validation.validationResults
                      .filter(r => r.severity === 'error' && !r.isValid)
                      .map((result, index) => (
                        <li key={index}>{result.message}</li>
                      ))
                    }
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Facture extraite avec {Math.round(invoiceData.confidence * 100)}% de confiance
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Eye className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button variant="outline" size="sm" onClick={onValidate}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Revalider
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Invoice Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Hash className="h-5 w-5" />
                <span>Informations de base</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Numéro</label>
                  <p className="text-lg font-mono">{invoiceData.invoiceNumber || 'Non détecté'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-lg">{invoiceData.invoiceDate || 'Non détectée'}</p>
                </div>
              </div>
              
              {invoiceData.dueDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Date d'échéance</label>
                  <p className="text-lg">{invoiceData.dueDate}</p>
                </div>
              )}
              
              {invoiceData.paymentTerms && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Délai de paiement</label>
                  <p className="text-lg">{invoiceData.paymentTerms} jours</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Fournisseur</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoiceData.supplierName && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Nom</label>
                  <p className="text-lg font-medium">{invoiceData.supplierName}</p>
                </div>
              )}
              
              {invoiceData.supplierSiret && (
                <div>
                  <label className="text-sm font-medium text-gray-500">SIRET</label>
                  <p className="text-lg font-mono">{formatSiret(invoiceData.supplierSiret)}</p>
                </div>
              )}
              
              {invoiceData.supplierVatNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Numéro de TVA</label>
                  <p className="text-lg font-mono">{formatFrenchVat(invoiceData.supplierVatNumber)}</p>
                </div>
              )}
              
              {invoiceData.supplierAddress && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Adresse</label>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{invoiceData.supplierAddress}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Euro className="h-5 w-5" />
                <span>Informations financières</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoiceData.totalAmountExcludingVat !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Montant HT</span>
                  <span className="text-lg font-mono">
                    {formatFrenchCurrency(invoiceData.totalAmountExcludingVat)}
                  </span>
                </div>
              )}
              
              {invoiceData.totalVatAmount !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">TVA</span>
                  <span className="text-lg font-mono">
                    {formatFrenchCurrency(invoiceData.totalVatAmount)}
                  </span>
                </div>
              )}
              
              <Separator />
              
              {invoiceData.totalAmountIncludingVat !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total TTC</span>
                  <span className="text-xl font-bold font-mono">
                    {formatFrenchCurrency(invoiceData.totalAmountIncludingVat)}
                  </span>
                </div>
              )}
              
              {invoiceData.currency && invoiceData.currency !== 'EUR' && (
                <div className="text-sm text-gray-500">
                  Devise : {invoiceData.currency}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Buyer Information */}
          {(invoiceData.buyerName || invoiceData.buyerSiret || invoiceData.buyerAddress) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Acheteur</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoiceData.buyerName && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nom</label>
                    <p className="text-lg font-medium">{invoiceData.buyerName}</p>
                  </div>
                )}
                
                {invoiceData.buyerSiret && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">SIRET</label>
                    <p className="text-lg font-mono">{formatSiret(invoiceData.buyerSiret)}</p>
                  </div>
                )}
                
                {invoiceData.buyerVatNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Numéro de TVA</label>
                    <p className="text-lg font-mono">{formatFrenchVat(invoiceData.buyerVatNumber)}</p>
                  </div>
                )}
                
                {invoiceData.buyerAddress && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Adresse</label>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{invoiceData.buyerAddress}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Information */}
          {(invoiceData.description || invoiceData.notes) && (
            <Card>
              <CardHeader>
                <CardTitle>Informations complémentaires</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoiceData.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-sm text-gray-700">{invoiceData.description}</p>
                  </div>
                )}
                
                {invoiceData.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <p className="text-sm text-gray-700">{invoiceData.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Validation Details */}
      {validation.validationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Détails de validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validation.validationResults.map((result, index) => (
                <div 
                  key={index}
                  className={`flex items-center space-x-2 p-2 rounded text-sm ${
                    result.isValid 
                      ? 'bg-green-50 text-green-800' 
                      : result.severity === 'error' 
                        ? 'bg-red-50 text-red-800'
                        : 'bg-yellow-50 text-yellow-800'
                  }`}
                >
                  {result.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="flex-1">{result.message}</span>
                  {result.suggestedValue && (
                    <code className="text-xs bg-white px-1 rounded">{result.suggestedValue}</code>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {validation.isCompliant ? (
                <span className="text-green-600 font-medium">✓ Facture conforme - prête pour l'export</span>
              ) : (
                <span className="text-red-600 font-medium">⚠ Corrections requises avant export</span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => onExport('pdf')}
                disabled={!validation.isCompliant}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button 
                onClick={() => onExport('xml')}
                disabled={!validation.isCompliant}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Factur-X
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}