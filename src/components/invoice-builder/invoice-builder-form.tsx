'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CompanyDetailsSection } from './sections/company-details-section'
import { CustomerDetailsSection } from './sections/customer-details-section'
import { LineItemsSection } from './sections/line-items-section'
import { NotesSection } from './sections/notes-section'
import { validateSiretForManualInvoice, validateFrenchVatForManualInvoice } from '@/lib/validations/manual-invoice'
import { manualInvoicesApi } from '@/lib/api/manual-invoices'

// Form validation schema
const invoiceFormSchema = z.object({
  // Basic info
  invoiceNumber: z.string().min(1, 'Numéro de facture requis'),
  invoiceDate: z.string().min(1, 'Date de facture requise'),
  dueDate: z.string().optional(),
  
  // Issuer (from user settings with override)
  issuer: z.object({
    companyName: z.string().min(1, 'Nom de l\'entreprise requis'),
    address: z.string().min(1, 'Adresse requise'),
    siret: z.string().refine((val) => validateSiretForManualInvoice(val, true), 'SIRET invalide'),
    vatNumber: z.string().refine((val) => validateFrenchVatForManualInvoice(val, true), 'Numéro de TVA invalide'),
    iban: z.string().optional(),
  }),
  
  // Customer
  customer: z.object({
    companyName: z.string().min(1, 'Nom du client requis'),
    address: z.string().min(1, 'Adresse du client requise'),
    vatNumber: z.string().optional().refine(
      (val) => !val || validateFrenchVatForManualInvoice(val, false), 
      'Format invalide (FR + 11 chiffres)'
    ),
    siret: z.string().optional().refine(
      (val) => !val || validateSiretForManualInvoice(val, false), 
      'SIRET invalide'
    ),
  }),
  
  // Line items
  lineItems: z.array(z.object({
    id: z.string(),
    description: z.string().min(1, 'Description requise'),
    quantity: z.number().min(0.01, 'Quantité doit être positive'),
    unitPrice: z.number().min(0, 'Prix unitaire doit être positif'),
    vatRate: z.number().min(0).max(100, 'Taux de TVA invalide'),
  })).min(1, 'Au moins une ligne de facturation requise'),
  
  // Additional
  notes: z.string().optional(),
  paymentTerms: z.number().min(1).max(60, 'Délai de paiement entre 1 et 60 jours').optional(),
  paymentMethod: z.string().optional(),
})

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>

interface InvoiceBuilderFormProps {
  currentStep: number
  onDataChange: (data: InvoiceFormData | null) => void
  onValidationChange: (validation: any) => void
  onStepComplete: (step: number) => void
  templateData?: Partial<InvoiceFormData>
}

export function InvoiceBuilderForm({
  currentStep,
  onDataChange,
  onValidationChange,
  onStepComplete,
  templateData
}: InvoiceBuilderFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: '',
      invoiceDate: new Date().toLocaleDateString('fr-FR'),
      dueDate: '',
      issuer: {
        companyName: '',
        address: '',
        siret: '',
        vatNumber: '',
        iban: '',
      },
      customer: {
        companyName: '',
        address: '',
        vatNumber: '',
        siret: '',
      },
      lineItems: [{
        id: '1',
        description: '',
        quantity: 1,
        unitPrice: 0,
        vatRate: 20,
      }],
      notes: '',
      paymentTerms: 30,
      paymentMethod: 'Virement bancaire',
    },
    mode: 'onChange'
  })

  const { watch, getValues, reset, formState: { errors, isValid } } = form

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await manualInvoicesApi.getDraft()
        if (draft?.form_data) {
          reset(draft.form_data)
        }
      } catch (error) {
        console.error('Error loading draft:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDraft()
  }, [reset])

  // Apply template data when provided
  useEffect(() => {
    if (templateData && !isLoading) {
      const currentData = getValues()
      // Merge template data with current form data, prioritizing template data
      const mergedData = {
        ...currentData,
        ...templateData,
        // Merge line items if both exist
        lineItems: templateData.lineItems || currentData.lineItems
      }
      reset(mergedData)
    }
  }, [templateData, isLoading, getValues, reset])

  // Debounced auto-save function
  const debouncedAutoSave = useCallback(async (data: InvoiceFormData) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await manualInvoicesApi.saveDraft(data)
        console.log('Draft auto-saved successfully')
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, 2000)
  }, [])

  // Use subscribe instead of watch to avoid constant re-renders
  useEffect(() => {
    if (isLoading) return

    const subscription = watch((data) => {
      // Pass form data to parent
      onDataChange(data as InvoiceFormData)

      // Trigger validation
      const validation = {
        isValid,
        errors,
        fieldErrors: Object.keys(errors).length,
        completedSteps: getCompletedSteps(data as InvoiceFormData, errors)
      }
      onValidationChange(validation)

      // Auto-save
      debouncedAutoSave(data as InvoiceFormData)
    })

    return () => subscription.unsubscribe()
  }, [isLoading, isValid, errors, onDataChange, onValidationChange, debouncedAutoSave, watch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  const getCompletedSteps = (data: InvoiceFormData, errors: any) => {
    const completedSteps = []
    
    // Step 0: Company details
    if (data.issuer.companyName && data.issuer.address && data.issuer.siret && 
        !errors.issuer?.companyName && !errors.issuer?.address && !errors.issuer?.siret) {
      completedSteps.push(0)
    }
    
    // Step 1: Customer details
    if (data.customer.companyName && data.customer.address &&
        !errors.customer?.companyName && !errors.customer?.address) {
      completedSteps.push(1)
    }
    
    // Step 2: Line items
    if (data.lineItems.length > 0 && data.lineItems.every(item => 
        item.description && item.quantity > 0 && item.unitPrice >= 0) &&
        !errors.lineItems) {
      completedSteps.push(2)
    }
    
    return completedSteps
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <CompanyDetailsSection form={form} />
      case 1:
        return <CustomerDetailsSection form={form} />
      case 2:
        return <LineItemsSection form={form} />
      case 3:
        return <NotesSection form={form} />
      default:
        return <CompanyDetailsSection form={form} />
    }
  }

  return (
    <form className="space-y-6">
      {renderCurrentStep()}
    </form>
  )
}