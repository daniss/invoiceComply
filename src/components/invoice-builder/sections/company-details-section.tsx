'use client'

import { useEffect, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Building, 
  MapPin, 
  Hash, 
  CreditCard, 
  Banknote,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings
} from 'lucide-react'
import { InvoiceFormData } from '../invoice-builder-form'
import { validateSiretForManualInvoice, validateFrenchVatForManualInvoice } from '@/lib/validations/manual-invoice'
import { settingsApi } from '@/lib/api/client'

interface CompanyDetailsSectionProps {
  form: UseFormReturn<InvoiceFormData>
}

export function CompanyDetailsSection({ form }: CompanyDetailsSectionProps) {
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

  const [loadingSettings, setLoadingSettings] = useState(false)

  const { 
    register, 
    watch, 
    setValue, 
    formState: { errors },
    getValues
  } = form

  const watchedSiret = watch('issuer.siret')
  const watchedVat = watch('issuer.vatNumber')

  // Auto-generate invoice number
  useEffect(() => {
    const currentNumber = getValues('invoiceNumber')
    if (!currentNumber) {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const sequence = '001' // TODO: Get next sequence from database
      setValue('invoiceNumber', `${year}${month}${day}-${sequence}`)
    }
  }, [setValue, getValues])

  // Load company settings
  const loadCompanySettings = async () => {
    setLoadingSettings(true)
    try {
      const response = await settingsApi.getCompany()
      if (response.success && response.settings) {
        const settings = response.settings
        setValue('issuer.companyName', settings.companyName || '')
        setValue('issuer.address', settings.address || '')
        setValue('issuer.siret', settings.siret || '')
        setValue('issuer.vatNumber', settings.vatNumber || '')
        setValue('issuer.iban', settings.iban || '')
      }
    } catch (error) {
      console.error('Error loading company settings:', error)
    } finally {
      setLoadingSettings(false)
    }
  }

  // SIRET validation
  useEffect(() => {
    if (watchedSiret && watchedSiret.length === 14) {
      setSiretValidation({ isValidating: true, isValid: null, message: 'Validation en cours...' })
      
      const timer = setTimeout(() => {
        const isValid = validateSiretForManualInvoice(watchedSiret, true)
        setSiretValidation({
          isValidating: false,
          isValid,
          message: isValid ? 'SIRET valide' : 'SIRET invalide (vérifiez la clé de contrôle)'
        })
      }, 500)
      
      return () => clearTimeout(timer)
    } else {
      setSiretValidation({ isValidating: false, isValid: null, message: '' })
    }
  }, [watchedSiret])

  // VAT validation
  useEffect(() => {
    if (watchedVat && watchedVat.length >= 11) {
      setVatValidation({ isValidating: true, isValid: null, message: 'Validation en cours...' })
      
      const timer = setTimeout(() => {
        const isValid = validateFrenchVatForManualInvoice(watchedVat, true)
        setVatValidation({
          isValidating: false,
          isValid,
          message: isValid ? 'Numéro de TVA valide' : 'Numéro de TVA invalide (format: FR + 11 chiffres)'
        })
      }, 500)
      
      return () => clearTimeout(timer)
    } else {
      setVatValidation({ isValidating: false, isValid: null, message: '' })
    }
  }, [watchedVat])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 flex items-center">
            <Building className="h-6 w-6 mr-2 text-blue-600" />
            Informations de l'émetteur
          </h3>
          <p className="text-slate-600 mt-1">
            Détails de votre entreprise (émetteur de la facture)
          </p>
        </div>
        
        <Button
          type="button"
          onClick={loadCompanySettings}
          variant="outline"
          disabled={loadingSettings}
        >
          {loadingSettings ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Settings className="h-4 w-4 mr-2" />
          )}
          Charger mes paramètres
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Building className="h-5 w-5 mr-2 text-blue-600" />
              Informations générales
            </CardTitle>
            <CardDescription>
              Informations de base de votre entreprise
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Invoice Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceNumber" className="flex items-center">
                  <Hash className="h-4 w-4 mr-1" />
                  Numéro de facture *
                </Label>
                <Input
                  id="invoiceNumber"
                  {...register('invoiceNumber')}
                  placeholder="2024010-001"
                  className={errors.invoiceNumber ? 'border-red-300' : ''}
                />
                {errors.invoiceNumber && (
                  <p className="text-sm text-red-600 mt-1">{errors.invoiceNumber.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="invoiceDate">
                  Date de facture *
                </Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  {...register('invoiceDate')}
                  className={errors.invoiceDate ? 'border-red-300' : ''}
                />
                {errors.invoiceDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.invoiceDate.message}</p>
                )}
              </div>
            </div>

            {/* Company Name */}
            <div>
              <Label htmlFor="companyName" className="flex items-center">
                <Building className="h-4 w-4 mr-1" />
                Nom de l'entreprise *
              </Label>
              <Input
                id="companyName"
                {...register('issuer.companyName')}
                placeholder="Ma Société SARL"
                className={errors.issuer?.companyName ? 'border-red-300' : ''}
              />
              {errors.issuer?.companyName && (
                <p className="text-sm text-red-600 mt-1">{errors.issuer.companyName.message}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address" className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                Adresse complète *
              </Label>
              <textarea
                id="address"
                {...register('issuer.address')}
                placeholder="123 Rue de la Paix&#10;75001 Paris, France"
                rows={3}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.issuer?.address ? 'border-red-300' : 'border-slate-300'
                }`}
              />
              {errors.issuer?.address && (
                <p className="text-sm text-red-600 mt-1">{errors.issuer.address.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legal & Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <CreditCard className="h-5 w-5 mr-2 text-green-600" />
              Informations légales
            </CardTitle>
            <CardDescription>
              SIRET, TVA et informations bancaires
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SIRET */}
            <div>
              <Label htmlFor="siret" className="flex items-center">
                <Hash className="h-4 w-4 mr-1" />
                SIRET *
              </Label>
              <div className="relative">
                <Input
                  id="siret"
                  {...register('issuer.siret')}
                  placeholder="12345678901234"
                  maxLength={14}
                  className={
                    errors.issuer?.siret ? 'border-red-300' : 
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
              {errors.issuer?.siret && (
                <p className="text-sm text-red-600 mt-1">{errors.issuer.siret.message}</p>
              )}
            </div>

            {/* VAT Number */}
            <div>
              <Label htmlFor="vatNumber" className="flex items-center">
                <CreditCard className="h-4 w-4 mr-1" />
                Numéro de TVA *
              </Label>
              <div className="relative">
                <Input
                  id="vatNumber"
                  {...register('issuer.vatNumber')}
                  placeholder="FR12345678901"
                  className={
                    errors.issuer?.vatNumber ? 'border-red-300' : 
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
              {errors.issuer?.vatNumber && (
                <p className="text-sm text-red-600 mt-1">{errors.issuer.vatNumber.message}</p>
              )}
            </div>

            {/* IBAN */}
            <div>
              <Label htmlFor="iban" className="flex items-center">
                <Banknote className="h-4 w-4 mr-1" />
                IBAN (optionnel)
              </Label>
              <Input
                id="iban"
                {...register('issuer.iban')}
                placeholder="FR14 2004 1010 0505 0001 3M02 606"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Conformité française:</strong> Le SIRET et le numéro de TVA sont obligatoires pour toutes les factures françaises. 
          Ces informations sont automatiquement validées en temps réel.
        </AlertDescription>
      </Alert>
    </div>
  )
}