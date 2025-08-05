'use client'

import { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  CreditCard, 
  Calendar,
  MessageSquare,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { InvoiceFormData } from '../invoice-builder-form'

interface NotesSectionProps {
  form: UseFormReturn<InvoiceFormData>
}

// Payment methods common in France
const PAYMENT_METHODS = [
  { value: 'Virement bancaire', label: 'Virement bancaire' },
  { value: 'Chèque', label: 'Chèque' },
  { value: 'Prélèvement SEPA', label: 'Prélèvement SEPA' },
  { value: 'Carte bancaire', label: 'Carte bancaire' },
  { value: 'Espèces', label: 'Espèces (max 1000€)' },
  { value: 'Autre', label: 'Autre' }
]

export function NotesSection({ form }: NotesSectionProps) {
  const { 
    register, 
    watch, 
    setValue,
    formState: { errors }
  } = form

  const paymentTerms = watch('paymentTerms')
  const paymentMethod = watch('paymentMethod')
  const invoiceDate = watch('invoiceDate')

  // Calculate due date based on payment terms
  const calculateDueDate = (invoiceDate: string, paymentTerms: number) => {
    if (!invoiceDate || !paymentTerms) return ''
    
    const date = new Date(invoiceDate)
    date.setDate(date.getDate() + paymentTerms)
    return date.toISOString().split('T')[0]
  }

  // Auto-update due date when payment terms change
  const handlePaymentTermsChange = (value: string) => {
    const terms = parseInt(value)
    setValue('paymentTerms', terms)
    
    if (invoiceDate) {
      const dueDate = calculateDueDate(invoiceDate, terms)
      setValue('dueDate', dueDate)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900 flex items-center">
          <FileText className="h-6 w-6 mr-2 text-indigo-600" />
          Informations complémentaires
        </h3>
        <p className="text-slate-600 mt-1">
          Conditions de paiement, notes et informations additionnelles
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <CreditCard className="h-5 w-5 mr-2 text-indigo-600" />
              Conditions de paiement
            </CardTitle>
            <CardDescription>
              Modalités et délais de règlement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Terms */}
            <div>
              <Label htmlFor="paymentTerms" className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Délai de paiement (jours)
              </Label>
              <Select
                value={paymentTerms?.toString() || '30'}
                onValueChange={handlePaymentTermsChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un délai" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 jours</SelectItem>
                  <SelectItem value="30">30 jours (standard)</SelectItem>
                  <SelectItem value="45">45 jours</SelectItem>
                  <SelectItem value="60">60 jours (maximum B2B)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Maximum légal: 60 jours B2B, 30 jours B2G
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <Label htmlFor="paymentMethod" className="flex items-center">
                <CreditCard className="h-4 w-4 mr-1" />
                Moyen de paiement
              </Label>
              <Select
                value={paymentMethod || 'Virement bancaire'}
                onValueChange={(value) => setValue('paymentMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un moyen" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date Display */}
            {invoiceDate && paymentTerms && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="font-medium text-blue-900">Date d'échéance calculée</span>
                </div>
                <div className="text-lg font-bold text-blue-700">
                  {new Date(calculateDueDate(invoiceDate, paymentTerms)).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Facture du {new Date(invoiceDate).toLocaleDateString('fr-FR')} + {paymentTerms} jours
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
              Notes et commentaires
            </CardTitle>
            <CardDescription>
              Informations additionnelles pour le client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Notes Textarea */}
            <div>
              <Label htmlFor="notes" className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-1" />
                Notes (optionnel)
              </Label>
              <textarea
                id="notes"
                {...register('notes')}
                placeholder="Conditions particulières, mentions obligatoires, remerciements..."
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Ces notes apparaîtront en bas de la facture
              </p>
            </div>

            {/* Quick Note Templates */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Modèles de notes courantes:
              </Label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setValue('notes', 'TVA non applicable, art. 293 B du CGI.')}
                  className="w-full text-left p-2 text-xs bg-slate-50 hover:bg-slate-100 rounded border"
                >
                  TVA non applicable (micro-entreprise)
                </button>
                <button
                  type="button"
                  onClick={() => setValue('notes', 'Pénalités de retard : 3 fois le taux d\'intérêt légal.\nIndemnité forfaitaire pour frais de recouvrement : 40 euros (art. L.441-10 du Code de commerce).')}
                  className="w-full text-left p-2 text-xs bg-slate-50 hover:bg-slate-100 rounded border"
                >
                  Pénalités de retard standard
                </button>
                <button
                  type="button"
                  onClick={() => setValue('notes', 'Merci de votre confiance. N\'hésitez pas à nous contacter pour toute question.')}
                  className="w-full text-left p-2 text-xs bg-slate-50 hover:bg-slate-100 rounded border"
                >
                  Remerciements standards
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legal Information Alerts */}
      <div className="space-y-4">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Conformité:</strong> Les délais de paiement sont automatiquement validés selon la réglementation française 
            (60 jours maximum B2B, 30 jours B2G).
          </AlertDescription>
        </Alert>

        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Date d'échéance:</strong> La date d'échéance est calculée automatiquement à partir de la date 
            de facture et du délai de paiement sélectionné.
          </AlertDescription>
        </Alert>

        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Mentions légales:</strong> Certaines mentions peuvent être obligatoires selon votre statut 
            (micro-entreprise, TVA, etc.). Vérifiez les modèles de notes proposés.
          </AlertDescription>
        </Alert>

        {paymentMethod === 'Espèces' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>Attention:</strong> Le paiement en espèces est limité à 1 000€ entre professionnels 
              selon la réglementation française.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}