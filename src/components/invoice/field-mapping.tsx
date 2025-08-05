'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, AlertCircle, Edit, Save, X } from 'lucide-react'
import { fr } from '@/locales/fr'
import { validateSiret, validateFrenchVat, validateFrenchDate, validateAmount } from '@/lib/validations/french-business'
import { formatFrenchCurrency, formatSiret, formatFrenchVat } from '@/lib/utils/french-formatting'
import type { ExtractedInvoiceData } from '@/lib/pdf/parser'

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Numéro de facture requis'),
  invoiceDate: z.string().refine(validateFrenchDate, 'Format de date invalide (DD/MM/YYYY)'),
  dueDate: z.string().optional(),
  
  supplierName: z.string().min(1, 'Nom du fournisseur requis'),
  supplierSiret: z.string().refine(validateSiret, 'SIRET invalide').optional(),
  supplierVatNumber: z.string().refine(validateFrenchVat, 'Numéro de TVA invalide').optional(),
  supplierAddress: z.string().optional(),
  
  buyerName: z.string().optional(),
  buyerSiret: z.string().refine(validateSiret, 'SIRET invalide').optional(),
  buyerVatNumber: z.string().refine(validateFrenchVat, 'Numéro de TVA invalide').optional(),
  buyerAddress: z.string().optional(),
  
  totalAmountExcludingVat: z.number().min(0, 'Montant invalide'),
  totalVatAmount: z.number().min(0, 'Montant TVA invalide'),
  totalAmountIncludingVat: z.number().min(0, 'Montant total invalide'),
  
  paymentTerms: z.number().min(0).max(60, 'Délai de paiement maximum 60 jours').optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

interface FieldMappingProps {
  extractedData: ExtractedInvoiceData
  onDataUpdate: (updatedData: ExtractedInvoiceData) => void
  onValidationComplete: (isValid: boolean, data: ExtractedInvoiceData) => void
}

interface FieldStatus {
  hasValue: boolean
  isValid: boolean
  confidence: 'high' | 'medium' | 'low'
  isEdited: boolean
}

export function FieldMapping({ extractedData, onDataUpdate, onValidationComplete }: FieldMappingProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldStatuses, setFieldStatuses] = useState<Record<string, FieldStatus>>({})
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: extractedData.invoiceNumber || '',
      invoiceDate: extractedData.invoiceDate || '',
      dueDate: extractedData.dueDate || '',
      supplierName: extractedData.supplierName || '',
      supplierSiret: extractedData.supplierSiret || '',
      supplierVatNumber: extractedData.supplierVatNumber || '',
      supplierAddress: extractedData.supplierAddress || '',
      buyerName: extractedData.buyerName || '',
      buyerSiret: extractedData.buyerSiret || '',
      buyerVatNumber: extractedData.buyerVatNumber || '',
      buyerAddress: extractedData.buyerAddress || '',
      totalAmountExcludingVat: extractedData.totalAmountExcludingVat || 0,
      totalVatAmount: extractedData.totalVatAmount || 0,
      totalAmountIncludingVat: extractedData.totalAmountIncludingVat || 0,
      paymentTerms: extractedData.paymentTerms || 30,
      description: extractedData.description || '',
      notes: extractedData.notes || '',
    }
  })

  // Calculate field statuses
  useEffect(() => {
    const calculateFieldStatus = (value: any, fieldName: string): FieldStatus => {
      const hasValue = value !== undefined && value !== null && value !== ''
      let confidence: 'high' | 'medium' | 'low' = 'low'
      
      if (hasValue) {
        // Base confidence on extraction confidence and field type
        if (extractedData.confidence > 0.8) confidence = 'high'
        else if (extractedData.confidence > 0.5) confidence = 'medium'
        
        // Critical fields get higher confidence requirements
        if (['invoiceNumber', 'invoiceDate', 'totalAmountIncludingVat'].includes(fieldName)) {
          if (extractedData.confidence > 0.9) confidence = 'high'
          else confidence = 'medium'
        }
      }
      
      return {
        hasValue,
        isValid: !errors[fieldName as keyof typeof errors],
        confidence,
        isEdited: false
      }
    }

    const watchedData = watch()
    const newStatuses: Record<string, FieldStatus> = {}
    
    Object.keys(watchedData).forEach(key => {
      newStatuses[key] = calculateFieldStatus(watchedData[key as keyof typeof watchedData], key)
    })
    
    setFieldStatuses(newStatuses)
  }, [watch(), errors, extractedData.confidence])

  const getFieldIcon = (fieldName: string) => {
    const status = fieldStatuses[fieldName]
    if (!status) return null
    
    if (!status.hasValue) {
      return <AlertCircle className="h-4 w-4 text-orange-500" />
    }
    
    if (!status.isValid) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const getConfidenceBadge = (fieldName: string) => {
    const status = fieldStatuses[fieldName]
    if (!status?.hasValue) return null
    
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-red-100 text-red-800'
    }
    
    return (
      <Badge variant="secondary" className={`text-xs ${colors[status.confidence]}`}>
        {status.confidence === 'high' ? 'Haute' : status.confidence === 'medium' ? 'Moyenne' : 'Faible'} confiance
      </Badge>
    )
  }

  const handleFieldEdit = (fieldName: string) => {
    setEditingField(fieldName)
  }

  const handleFieldSave = (fieldName: string) => {
    setEditingField(null)
    setFieldStatuses(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], isEdited: true }
    }))
  }

  const onSubmit = (data: InvoiceFormData) => {
    const updatedData: ExtractedInvoiceData = {
      ...extractedData,
      ...data,
      confidence: Math.max(extractedData.confidence, 0.8) // Increase confidence after manual review
    }
    
    onDataUpdate(updatedData)
    onValidationComplete(true, updatedData)
  }

  const renderField = (
    fieldName: keyof InvoiceFormData,
    label: string,
    type: 'text' | 'number' | 'date' = 'text',
    formatter?: (value: any) => string
  ) => {
    const isEditing = editingField === fieldName
    const currentValue = watch(fieldName)
    const status = fieldStatuses[fieldName]
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={fieldName} className="flex items-center space-x-2">
            <span>{label}</span>
            {getFieldIcon(fieldName)}
          </Label>
          <div className="flex items-center space-x-2">
            {getConfidenceBadge(fieldName)}
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFieldEdit(fieldName)}
                className="h-6 w-6 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Input
                id={fieldName}
                type={type}
                {...register(fieldName, { valueAsNumber: type === 'number' })}
                className="flex-1"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFieldSave(fieldName)}
                className="h-8 w-8 p-0"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingField(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <div className="flex-1 p-2 border rounded-md bg-gray-50 min-h-[40px] flex items-center">
              {currentValue ? (
                <span className={status?.isEdited ? 'font-medium text-blue-600' : ''}>
                  {formatter ? formatter(currentValue) : currentValue}
                </span>
              ) : (
                <span className="text-gray-400 italic">Non détecté</span>
              )}
            </div>
          )}
        </div>
        
        {errors[fieldName] && (
          <p className="text-sm text-red-600">{errors[fieldName]?.message}</p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Extraction Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Résumé de l'extraction</span>
            <Badge variant={extractedData.confidence > 0.7 ? 'default' : 'secondary'}>
              {Math.round(extractedData.confidence * 100)}% confiance
            </Badge>
          </CardTitle>
          <CardDescription>
            Vérifiez et corrigez les données extraites automatiquement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {extractedData.issues.length > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Problèmes détectés :</strong>
                <ul className="list-disc list-inside mt-1">
                  {extractedData.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Invoice Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de la facture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderField('invoiceNumber', 'Numéro de facture')}
          {renderField('invoiceDate', 'Date de facture')}
          {renderField('dueDate', 'Date d\'échéance')}
          {renderField('paymentTerms', 'Délai de paiement (jours)', 'number')}
        </CardContent>
      </Card>

      {/* Supplier Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du fournisseur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderField('supplierName', 'Nom du fournisseur')}
          {renderField('supplierSiret', 'SIRET', 'text', formatSiret)}
          {renderField('supplierVatNumber', 'Numéro de TVA', 'text', formatFrenchVat)}
          {renderField('supplierAddress', 'Adresse')}
        </CardContent>
      </Card>

      {/* Buyer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de l'acheteur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderField('buyerName', 'Nom de l\'acheteur')}
          {renderField('buyerSiret', 'SIRET', 'text', formatSiret)}
          {renderField('buyerVatNumber', 'Numéro de TVA', 'text', formatFrenchVat)}
          {renderField('buyerAddress', 'Adresse')}
        </CardContent>
      </Card>

      {/* Financial Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informations financières</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderField('totalAmountExcludingVat', 'Montant HT', 'number', formatFrenchCurrency)}
          {renderField('totalVatAmount', 'Montant TVA', 'number', formatFrenchCurrency)}
          {renderField('totalAmountIncludingVat', 'Montant TTC', 'number', formatFrenchCurrency)}
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informations complémentaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderField('description', 'Description')}
          {renderField('notes', 'Notes')}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={() => reset()}>
          Réinitialiser
        </Button>
        <Button type="submit">
          Valider et continuer
        </Button>
      </div>
    </form>
  )
}