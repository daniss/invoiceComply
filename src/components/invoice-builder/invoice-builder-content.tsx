'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Plus,
  Save,
  Eye,
  Send,
  FileOutput,
  CheckCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  Receipt
} from 'lucide-react'
import { InvoiceBuilderForm } from './invoice-builder-form'
import { InvoicePreview } from './preview/invoice-preview'
import { TemplateManager } from './template-manager'
import { ValidationPanel } from './validation-panel'
import { useToast } from '@/components/ui/toast'
import { manualInvoicesApi } from '@/lib/api/manual-invoices'

interface InvoiceBuilderStep {
  id: string
  name: string
  description: string
  completed: boolean
  current: boolean
}

export function InvoiceBuilderContent() {
  const [currentStep, setCurrentStep] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [invoiceData, setInvoiceData] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [appliedTemplate, setAppliedTemplate] = useState(null)

  // Stable callback functions to prevent infinite re-renders
  const handleDataChange = useCallback((data: any) => {
    setInvoiceData(data)
  }, [])

  const handleValidationChange = useCallback((validation: any) => {
    setValidationResult(validation)
  }, [])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  
  const toast = useToast()

  const steps: InvoiceBuilderStep[] = [
    {
      id: 'company',
      name: 'Émetteur',
      description: 'Informations de votre entreprise',
      completed: false,
      current: currentStep === 0
    },
    {
      id: 'customer',
      name: 'Client',
      description: 'Informations du destinataire',
      completed: false,
      current: currentStep === 1
    },
    {
      id: 'items',
      name: 'Prestations',
      description: 'Lignes de facturation',
      completed: false,
      current: currentStep === 2
    },
    {
      id: 'review',
      name: 'Validation',
      description: 'Vérification et génération',
      completed: false,
      current: currentStep === 3
    }
  ]

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep + 1) {
      setCurrentStep(stepIndex)
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveDraft = async () => {
    if (!invoiceData) return
    
    setIsProcessing(true)
    try {
      await manualInvoicesApi.saveDraft(invoiceData)
      setIsDraft(true)
      toast.success('Brouillon sauvegardé', 'La facture a été sauvegardée en brouillon')
    } catch (error) {
      toast.error('Erreur de sauvegarde', 'Impossible de sauvegarder le brouillon')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateFacturX = async () => {
    if (!invoiceData || !validationResult?.isValid) {
      toast.error('Validation requise', 'Veuillez corriger les erreurs avant de générer le Factur-X')
      return
    }
    
    setIsProcessing(true)
    try {
      // First create the manual invoice
      const invoice = await manualInvoicesApi.createInvoice(invoiceData)
      
      // Then generate Factur-X
      const result = await manualInvoicesApi.generateFacturX(invoice.id)
      
      toast.success('Factur-X généré', 'Le fichier PDF conforme a été généré avec succès')
      
      // Download the file or redirect to view
      if (result.facturXUrl) {
        window.open(result.facturXUrl, '_blank')
      }
    } catch (error) {
      toast.error('Erreur de génération', 'Impossible de générer le Factur-X')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTransmit = async () => {
    if (!invoiceData || !validationResult?.isValid) {
      toast.error('Validation requise', 'Veuillez corriger les erreurs avant de transmettre')
      return
    }
    
    setIsProcessing(true)
    try {
      // First create the manual invoice if not already created
      const invoice = await manualInvoicesApi.createInvoice(invoiceData)
      
      // Generate Factur-X if not already generated
      if (!invoice.factur_x_generated) {
        await manualInvoicesApi.generateFacturX(invoice.id)
      }
      
      // Then transmit (using existing transmission API)
      const response = await fetch('/api/transmissions/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          provider: 'chorus_pro' // Default provider
        })
      })
      
      if (!response.ok) {
        throw new Error('Transmission failed')
      }
      
      toast.success('Transmission démarrée', 'La facture est en cours de transmission')
    } catch (error) {
      toast.error('Erreur de transmission', 'Impossible de transmettre la facture')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStepIcon = (step: InvoiceBuilderStep, index: number) => {
    if (step.completed) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    }
    if (step.current) {
      return <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" />
    }
    return <div className="w-4 h-4 bg-slate-300 rounded-full" />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center">
            <Receipt className="h-8 w-8 mr-3 text-green-600" />
            Créer une facture
          </h1>
          <p className="text-slate-600 mt-2">
            Éditeur manuel avec validation en temps réel et génération Factur-X
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isDraft && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
              BROUILLON
            </Badge>
          )}
          
          <Button
            onClick={() => setShowTemplates(true)}
            variant="outline"
            disabled={isProcessing}
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Templates
          </Button>

          <Button
            onClick={handleSaveDraft}
            variant="outline"
            disabled={isProcessing}
          >
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>

          <Button
            onClick={() => setShowPreview(!showPreview)}
            variant="outline"
            disabled={isProcessing}
          >
            <Eye className="h-4 w-4 mr-2" />
            Aperçu
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"></div>
        
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Progression</h3>
          <Progress value={(currentStep / (steps.length - 1)) * 100} className="h-3 mb-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              onClick={() => handleStepClick(index)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                step.completed
                  ? 'bg-green-50 border-green-200 hover:bg-green-100'
                  : step.current
                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.completed
                    ? 'bg-green-500 text-white'
                    : step.current
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-300 text-slate-600'
                }`}>
                  {getStepIcon(step, index)}
                </div>
                <div className="font-semibold text-slate-900">{step.name}</div>
              </div>
              <p className="text-sm text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-green-500"></div>
            
            <InvoiceBuilderForm
              currentStep={currentStep}
              onDataChange={handleDataChange}
              onValidationChange={handleValidationChange}
              onStepComplete={(step) => {
                // Mark step as completed
                const newSteps = [...steps]
                if (newSteps[step]) {
                  newSteps[step].completed = true
                }
              }}
              templateData={appliedTemplate}
            />

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
              <Button
                onClick={handlePrevious}
                variant="outline"
                disabled={currentStep === 0 || isProcessing}
              >
                Précédent
              </Button>

              <div className="text-sm text-slate-600">
                Étape {currentStep + 1} sur {steps.length}
              </div>

              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-blue-600 to-green-600 text-white hover:opacity-90"
                  disabled={isProcessing}
                >
                  Suivant
                </Button>
              ) : (
                <div className="space-x-3">
                  <Button
                    onClick={handleGenerateFacturX}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:opacity-90"
                    disabled={isProcessing}
                  >
                    <FileOutput className="h-4 w-4 mr-2" />
                    Générer Factur-X
                  </Button>
                  <Button
                    onClick={handleTransmit}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90"
                    disabled={isProcessing}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Transmettre
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Validation Panel */}
          <ValidationPanel
            validationResult={validationResult}
            invoiceData={invoiceData}
          />

          {/* Quick Tips */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Conseil:</strong> Tous les champs marqués d'un * sont obligatoires pour la conformité française.
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Auto-validation:</strong> La conformité est vérifiée en temps réel à chaque modification.
            </AlertDescription>
          </Alert>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong>SIRET:</strong> Les numéros SIRET sont automatiquement validés avec l'algorithme de Luhn.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <InvoicePreview
          invoiceData={invoiceData}
          onClose={() => setShowPreview(false)}
          onGenerate={handleGenerateFacturX}
        />
      )}

      {/* Template Manager Modal */}
      {showTemplates && (
        <TemplateManager
          onClose={() => setShowTemplates(false)}
          onApplyTemplate={(template) => {
            // Apply template data to form
            setAppliedTemplate(template.template_data)
            setShowTemplates(false)
            toast.success('Template appliqué', `Le template "${template.name}" a été appliqué avec succès`)
            
            // Clear applied template after a moment to prevent re-applying
            setTimeout(() => setAppliedTemplate(null), 1000)
          }}
        />
      )}
    </div>
  )
}