'use client'

import { useEffect, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  MapPin, 
  Hash, 
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react'
import { InvoiceFormData } from '../invoice-builder-form'
import { validateSiretForManualInvoice, validateFrenchVatForManualInvoice } from '@/lib/validations/manual-invoice'

interface CustomerDetailsSectionProps {
  form: UseFormReturn<InvoiceFormData>
}

export function CustomerDetailsSection({ form }: CustomerDetailsSectionProps) {
  const [siretValidation, setSiretValidation] = useState<{
    isValidating: boolean
    isValid: boolean | null
    message: string
  }>({ isValidating: false, isValid: null, message: '' })

  const [vatValidation, setVatValidation] = useState<{
    isValidating: boolean
    isValid: boolean | null
    message: string
  }>({ isValidating: false, isValid: null, message: '' })

  const { 
    register, 
    watch, 
    formState: { errors }
  } = form

  const watchedSiret = watch('customer.siret')
  const watchedVat = watch('customer.vatNumber')

  // SIRET validation (optional for customer)
  useEffect(() => {
    if (watchedSiret && watchedSiret.length === 14) {
      setSiretValidation({ isValidating: true, isValid: null, message: 'Validation en cours...' })
      
      const timer = setTimeout(() => {
        const isValid = validateSiretForManualInvoice(watchedSiret, false)
        setSiretValidation({
          isValidating: false,
          isValid,
          message: isValid ? 'SIRET valide' : 'SIRET invalide (vérifiez la clé de contrôle)'
        })
      }, 500)
      
      return () => clearTimeout(timer)
    } else if (watchedSiret && watchedSiret.length > 0) {
      setSiretValidation({ 
        isValidating: false, 
        isValid: false, 
        message: 'SIRET doit contenir 14 chiffres' 
      })
    } else {
      setSiretValidation({ isValidating: false, isValid: null, message: '' })
    }
  }, [watchedSiret])

  // VAT validation (optional for customer)
  useEffect(() => {
    if (watchedVat && watchedVat.length >= 11) {
      setVatValidation({ isValidating: true, isValid: null, message: 'Validation en cours...' })
      
      const timer = setTimeout(() => {
        const isValid = validateFrenchVatForManualInvoice(watchedVat, false)
        setVatValidation({
          isValidating: false,
          isValid,
          message: isValid ? 'Numéro de TVA valide' : 'Format invalide (FR + 11 chiffres)'
        })
      }, 500)
      
      return () => clearTimeout(timer)
    } else if (watchedVat && watchedVat.length > 0) {
      setVatValidation({ 
        isValidating: false, 
        isValid: false, 
        message: 'Format: FR + 11 chiffres' 
      })
    } else {
      setVatValidation({ isValidating: false, isValid: null, message: '' })
    }
  }, [watchedVat])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900 flex items-center">
          <Users className="h-6 w-6 mr-2 text-green-600" />
          Informations du client
        </h3>
        <p className="text-slate-600 mt-1">
          Détails du destinataire de la facture
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Informations générales
            </CardTitle>
            <CardDescription>
              Informations de base du client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company Name */}
            <div>
              <Label htmlFor="customerCompanyName" className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Nom de l'entreprise / Client *
              </Label>
              <Input
                id="customerCompanyName"
                {...register('customer.companyName')}
                placeholder="Client SARL"
                className={errors.customer?.companyName ? 'border-red-300' : ''}
              />
              {errors.customer?.companyName && (
                <p className="text-sm text-red-600 mt-1">{errors.customer.companyName.message}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="customerAddress" className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                Adresse complète *
              </Label>
              <textarea
                id="customerAddress"
                {...register('customer.address')}
                placeholder="456 Avenue des Clients&#10;69000 Lyon, France"
                rows={3}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.customer?.address ? 'border-red-300' : 'border-slate-300'
                }`}
              />
              {errors.customer?.address && (
                <p className="text-sm text-red-600 mt-1">{errors.customer.address.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Optional Legal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
              Informations légales
            </CardTitle>
            <CardDescription>
              SIRET et TVA (optionnels pour le client)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SIRET (Optional) */}
            <div>
              <Label htmlFor="customerSiret" className="flex items-center">
                <Hash className="h-4 w-4 mr-1" />
                SIRET (optionnel)
              </Label>
              <div className="relative">
                <Input
                  id="customerSiret"
                  {...register('customer.siret')}
                  placeholder="12345678901234"
                  maxLength={14}
                  className={
                    siretValidation.isValid === true ? 'border-green-300' :
                    siretValidation.isValid === false ? 'border-red-300' : ''
                  }
                />
                {siretValidation.isValidating && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-600" />
                )}
                {siretValidation.isValid === true && (
                  <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                )}
                {siretValidation.isValid === false && (
                  <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-red-600" />
                )}
              </div>
              {siretValidation.message && (
                <div className="flex items-center mt-1">
                  <Badge className={
                    siretValidation.isValid === true ? 'bg-green-100 text-green-700' :
                    siretValidation.isValid === false ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }>
                    {siretValidation.message}
                  </Badge>
                </div>
              )}
            </div>

            {/* VAT Number (Optional) */}
            <div>
              <Label htmlFor="customerVatNumber" className="flex items-center">
                <CreditCard className="h-4 w-4 mr-1" />
                Numéro de TVA (optionnel)
              </Label>
              <div className="relative">
                <Input
                  id="customerVatNumber"
                  {...register('customer.vatNumber')}
                  placeholder="FR12345678901"
                  className={
                    vatValidation.isValid === true ? 'border-green-300' :
                    vatValidation.isValid === false ? 'border-red-300' : ''
                  }
                />
                {vatValidation.isValidating && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-600" />
                )}
                {vatValidation.isValid === true && (
                  <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                )}
                {vatValidation.isValid === false && (
                  <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-red-600" />
                )}
              </div>
              {vatValidation.message && (
                <div className="flex items-center mt-1">
                  <Badge className={
                    vatValidation.isValid === true ? 'bg-green-100 text-green-700' :
                    vatValidation.isValid === false ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }>
                    {vatValidation.message}
                  </Badge>
                </div>
              )}
            </div>

            {/* Payment Terms */}
            <div>
              <Label htmlFor="paymentTerms" className="flex items-center">
                <CreditCard className="h-4 w-4 mr-1" />
                Délai de paiement (jours)
              </Label>
              <Input
                id="paymentTerms"
                type="number"
                min="1"
                max="60"
                {...register('paymentTerms', { valueAsNumber: true })}
                placeholder="30"
                className={errors.paymentTerms ? 'border-red-300' : ''}
              />
              {errors.paymentTerms && (
                <p className="text-sm text-red-600 mt-1">{errors.paymentTerms.message}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Maximum 60 jours B2B, 30 jours B2G selon la loi française
              </p>
            </div>

            {/* Due Date (Auto-calculated from payment terms) */}
            <div>
              <Label htmlFor="dueDate">
                Date d'échéance (optionnel)
              </Label>
              <Input
                id="dueDate"
                type="date"
                {...register('dueDate')}
              />
              <p className="text-xs text-slate-500 mt-1">
                Calculée automatiquement à partir du délai de paiement si non spécifiée
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Alerts */}
      <div className="space-y-4">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Informations optionnelles:</strong> Le SIRET et numéro de TVA du client ne sont pas obligatoires, 
            mais recommandés pour les transactions B2B.
          </AlertDescription>
        </Alert>

        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Délais de paiement:</strong> La réglementation française impose un délai maximum de 60 jours 
            pour les transactions B2B et 30 jours pour les transactions B2G (avec le secteur public).
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}