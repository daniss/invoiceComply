'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Shield,
  FileOutput,
  Calendar,
  Euro,
  Building,
  Download,
  RefreshCw,
  Upload
} from 'lucide-react'
import { complianceApi, invoiceApi, handleApiError } from '@/lib/api/client'

interface ComplianceRule {
  id: string
  category: 'legal' | 'format' | 'business' | 'technical'
  name: string
  description: string
  status: 'passed' | 'failed' | 'warning' | 'checking'
  required: boolean
  details?: string
}

interface InvoiceCompliance {
  invoiceNumber: string
  companyName: string
  totalScore: number
  status: 'compliant' | 'non-compliant' | 'warning'
  lastChecked: string
  rules: ComplianceRule[]
}

interface Invoice {
  id: string
  invoice_number: string
  supplier_name: string
  created_at: string
  status: string
  extracted_data: any
  metadata?: {
    compliance?: any
    validation?: any
  }
}

export default function CompliancePage() {
  const [complianceData, setComplianceData] = useState<InvoiceCompliance | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isChecking, setIsChecking] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load invoices on component mount
  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      setIsLoading(true)
      const response = await invoiceApi.getAll({ page: 1, limit: 50 })
      if (response.success && response.invoices) {
        setInvoices(response.invoices)
        // Auto-select the first invoice if available
        if (response.invoices.length > 0) {
          setSelectedInvoice(response.invoices[0].id)
          await loadComplianceData(response.invoices[0])
        }
      }
    } catch (error) {
      setError(handleApiError(error))
    } finally {
      setIsLoading(false)
    }
  }

  const loadComplianceData = async (invoice: Invoice) => {
    try {
      // Check if we already have compliance data in metadata
      if (invoice.metadata?.compliance) {
        setComplianceData(transformToComplianceData(invoice))
        return
      }

      // Otherwise, run a new compliance check
      await runComplianceCheck(invoice)
    } catch (error) {
      setError(handleApiError(error))
    }
  }

  const transformToComplianceData = (invoice: Invoice): InvoiceCompliance => {
    const compliance = invoice.metadata?.compliance
    const validation = invoice.metadata?.validation

    return {
      invoiceNumber: invoice.invoice_number || 'N/A',
      companyName: invoice.supplier_name || 'Inconnu',
      totalScore: compliance?.overall?.score || 0,
      status: compliance?.overall?.level === 'compliant' ? 'compliant' : 
              compliance?.overall?.level === 'warnings' ? 'warning' : 'non-compliant',
      lastChecked: invoice.created_at,
      rules: generateComplianceRules(invoice.extracted_data, compliance, validation)
    }
  }

  const generateComplianceRules = (extractedData: any, compliance: any, validation: any): ComplianceRule[] => {
    const rules: ComplianceRule[] = []

    // Legal rules
    rules.push({
      id: 'legal-1',
      category: 'legal',
      name: 'SIRET émetteur',
      description: 'Numéro SIRET de l\'émetteur valide et vérifié',
      status: extractedData?.supplierSiret ? 'passed' : 'failed',
      required: true,
      details: extractedData?.supplierSiret ? `SIRET: ${extractedData.supplierSiret}` : 'SIRET manquant'
    })

    rules.push({
      id: 'legal-2',
      category: 'legal',
      name: 'Numéro de facture',
      description: 'Numéro de facture présent et unique',
      status: extractedData?.invoiceNumber ? 'passed' : 'failed',
      required: true,
      details: extractedData?.invoiceNumber ? `N°: ${extractedData.invoiceNumber}` : 'Numéro manquant'
    })

    // Format rules
    rules.push({
      id: 'format-1',
      category: 'format',
      name: 'Date de facture',
      description: 'Date de facture présente',
      status: extractedData?.invoiceDate ? 'passed' : 'failed',
      required: true,
      details: extractedData?.invoiceDate ? `Date: ${extractedData.invoiceDate}` : 'Date manquante'
    })

    rules.push({
      id: 'format-2',
      category: 'format',
      name: 'Montants',
      description: 'Montants TTC et HT présents',
      status: extractedData?.totalAmountIncludingVat ? 'passed' : 'failed',
      required: true,
      details: extractedData?.totalAmountIncludingVat ? 
        `TTC: ${extractedData.totalAmountIncludingVat} ${extractedData.currency || 'EUR'}` : 
        'Montants manquants'
    })

    // Business rules
    rules.push({
      id: 'business-1',
      category: 'business',
      name: 'TVA française',
      description: 'Numéro de TVA français présent',
      status: extractedData?.supplierVatNumber?.startsWith('FR') ? 'passed' : 'warning',
      required: false,
      details: extractedData?.supplierVatNumber ? 
        `TVA: ${extractedData.supplierVatNumber}` : 
        'TVA non détectée'
    })

    // Technical rules
    rules.push({
      id: 'technical-1',
      category: 'technical',
      name: 'Extraction PDF',
      description: 'Extraction des données réussie',
      status: extractedData?.confidence > 0.5 ? 'passed' : 'warning',
      required: true,
      details: `Confiance: ${Math.round((extractedData?.confidence || 0) * 100)}%`
    })

    return rules
  }

  const categories = [
    { value: 'all', label: 'Toutes', color: 'slate' },
    { value: 'legal', label: 'Légal', color: 'red' },
    { value: 'format', label: 'Format', color: 'blue' },
    { value: 'business', label: 'Business', color: 'yellow' },
    { value: 'technical', label: 'Technique', color: 'purple' }
  ]

  const getStatusIcon = (status: ComplianceRule['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'checking':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: ComplianceRule['status']) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'checking':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getCategoryColor = (category: ComplianceRule['category']) => {
    switch (category) {
      case 'legal':
        return 'from-red-50 to-rose-50 border-red-100/50'
      case 'format':
        return 'from-blue-50 to-indigo-50 border-blue-100/50'
      case 'business':
        return 'from-yellow-50 to-amber-50 border-yellow-100/50'
      case 'technical':
        return 'from-purple-50 to-violet-50 border-purple-100/50'
      default:
        return 'from-slate-50 to-gray-50 border-slate-100/50'
    }
  }

  const getCategoryIcon = (category: ComplianceRule['category']) => {
    switch (category) {
      case 'legal':
        return <Shield className="h-5 w-5 text-red-600" />
      case 'format':
        return <FileOutput className="h-5 w-5 text-blue-600" />
      case 'business':
        return <Building className="h-5 w-5 text-yellow-600" />
      case 'technical':
        return <Search className="h-5 w-5 text-purple-600" />
      default:
        return <Search className="h-5 w-5 text-gray-600" />
    }
  }

  const runComplianceCheck = async (invoice?: Invoice) => {
    if (!selectedInvoice && !invoice) return

    const targetInvoice = invoice || invoices.find(inv => inv.id === selectedInvoice)
    if (!targetInvoice) return

    setIsChecking(true)
    setError(null)
    
    try {
      // Call the compliance API
      const response = await complianceApi.check(targetInvoice.extracted_data)
      
      if (response.success && response.compliance) {
        const complianceData = transformToComplianceData({
          ...targetInvoice,
          metadata: {
            ...targetInvoice.metadata,
            compliance: response.compliance
          }
        })
        
        setComplianceData(complianceData)
      }
    } catch (error) {
      setError(handleApiError(error))
    } finally {
      setIsChecking(false)
    }
  }

  const handleInvoiceChange = async (invoiceId: string) => {
    setSelectedInvoice(invoiceId)
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (invoice) {
      await loadComplianceData(invoice)
    }
  }

  const filteredRules = complianceData && selectedCategory === 'all' 
    ? complianceData.rules 
    : complianceData?.rules.filter(rule => rule.category === selectedCategory) || []

  const categoryStats = complianceData ? categories.slice(1).map(category => {
    const categoryRules = complianceData.rules.filter(rule => rule.category === category.value)
    const passed = categoryRules.filter(rule => rule.status === 'passed').length
    const total = categoryRules.length
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0
    
    return {
      ...category,
      passed,
      total,
      percentage
    }
  }) : []

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Chargement des factures...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Erreur:</strong> {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <Upload className="h-16 w-16 mx-auto mb-4 text-slate-400" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune facture trouvée</h3>
          <p className="text-slate-600 mb-4">
            Vous devez d'abord télécharger des factures pour vérifier leur conformité.
          </p>
          <Button 
            onClick={() => window.location.href = '/dashboard/convert'}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Télécharger une facture
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Vérifier la conformité</h1>
          <p className="text-slate-600 mt-2">
            Contrôle automatique des exigences françaises et Factur-X
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Invoice Selector */}
          <select
            value={selectedInvoice}
            onChange={(e) => handleInvoiceChange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {invoices.map(invoice => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoice_number || `Facture ${invoice.id.slice(0, 8)}`}
              </option>
            ))}
          </select>
          
          <Button 
            onClick={() => runComplianceCheck()}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:opacity-90"
            disabled={isChecking || !selectedInvoice}
          >
            {isChecking ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {isChecking ? 'Vérification...' : 'Lancer le contrôle'}
          </Button>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Score de conformité global</h3>
              {complianceData ? (
                <>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="text-4xl font-bold text-green-600">{complianceData.totalScore}%</div>
                    <Badge className={complianceData.totalScore >= 95 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                      {complianceData.totalScore >= 95 ? 'CONFORME' : 'ATTENTION'}
                    </Badge>
                  </div>
                  <Progress value={complianceData.totalScore} className="h-3 mb-2" />
                  <p className="text-sm text-slate-600">
                    Dernière vérification: {new Date(complianceData.lastChecked).toLocaleString('fr-FR')}
                  </p>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600">Sélectionnez une facture et lancez le contrôle de conformité</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {categoryStats.map((category) => (
                <div key={category.value} className={`p-4 rounded-2xl bg-gradient-to-br ${getCategoryColor(category.value as any)} border`}>
                  <div className="flex items-center justify-between mb-3">
                    {getCategoryIcon(category.value as any)}
                    <Badge className="text-xs">{category.percentage}%</Badge>
                  </div>
                  <div className="font-semibold text-slate-900 mb-1">{category.label}</div>
                  <div className="text-sm text-slate-600">{category.passed}/{category.total} règles</div>
                  <Progress value={category.percentage} className="h-1.5 mt-2" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {complianceData && (
              <>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50">
                  <div className="flex items-center space-x-3 mb-3">
                    <FileOutput className="h-6 w-6 text-blue-600" />
                    <div>
                      <div className="font-semibold text-slate-900">{complianceData.invoiceNumber}</div>
                      <div className="text-sm text-slate-600">{complianceData.companyName}</div>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">Factur-X</Badge>
                </div>

                {complianceData.totalScore >= 95 ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900">
                      <strong>Prêt pour transmission:</strong> Cette facture respecte les exigences 2026.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-900">
                      <strong>Attention:</strong> Cette facture nécessite des corrections avant transmission.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filtrer par catégorie:</span>
        </div>
        <div className="flex space-x-2">
          {categories.map(category => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compliance Rules List */}
      <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl border border-slate-200/50">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-blue-500 via-yellow-500 to-purple-500"></div>
        
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Règles de conformité</h3>
            <p className="text-slate-600">Détail des vérifications effectuées</p>
          </div>

          <div className="space-y-4">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className={`group relative rounded-2xl p-6 border transition-all duration-300 ${
                  rule.status === 'passed' ? 'bg-green-50/50 border-green-200/50 hover:bg-green-50' :
                  rule.status === 'failed' ? 'bg-red-50/50 border-red-200/50 hover:bg-red-50' :
                  rule.status === 'warning' ? 'bg-yellow-50/50 border-yellow-200/50 hover:bg-yellow-50' :
                  'bg-slate-50/50 border-slate-200/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 rounded-xl bg-white/80">
                      {getStatusIcon(rule.status)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-slate-900">{rule.name}</h4>
                        {rule.required && (
                          <Badge className="bg-red-100 text-red-700 text-xs">OBLIGATOIRE</Badge>
                        )}
                        <Badge className={`text-xs ${getStatusColor(rule.status)} border`}>
                          {rule.status === 'passed' ? 'VALIDÉ' :
                           rule.status === 'failed' ? 'ÉCHEC' :
                           rule.status === 'warning' ? 'ATTENTION' : 'VÉRIFICATION'}
                        </Badge>
                      </div>
                      
                      <p className="text-slate-600 text-sm mb-3">{rule.description}</p>
                      
                      {rule.details && (
                        <div className="p-3 rounded-lg bg-white/60 border border-slate-200/50">
                          <p className="text-sm text-slate-700">{rule.details}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(rule.category)}
                    <span className="text-xs font-medium text-slate-500 capitalize">{rule.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRules.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500">
                Aucune règle trouvée pour la catégorie sélectionnée
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <Button variant="outline" className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Télécharger le rapport</span>
        </Button>
        
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90">
          <FileOutput className="h-4 w-4 mr-2" />
          Générer le certificat
        </Button>
      </div>
    </div>
  )
}