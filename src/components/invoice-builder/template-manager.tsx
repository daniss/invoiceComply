'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  X, 
  Save, 
  Download, 
  Trash2,
  Plus,
  FileText as FileTemplate,
  Building,
  Users,
  ShoppingCart,
  Calendar,
  Lightbulb,
  Star,
  Clock,
  CheckCircle
} from 'lucide-react'
import { InvoiceFormData } from './invoice-builder-form'
import { manualInvoicesApi } from '@/lib/api/manual-invoices'

interface Template {
  id: string
  name: string
  description: string
  category: 'service' | 'product' | 'consulting' | 'other'
  is_default: boolean
  created_at: string
  template_data: Partial<InvoiceFormData>
  usage_count: number
}

interface TemplateManagerProps {
  onClose: () => void
  onApplyTemplate: (template: Template) => void
}

// Mock templates data
const MOCK_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Prestation de conseil',
    description: 'Template pour les missions de conseil et consulting',
    category: 'consulting',
    is_default: true,
    created_at: '2024-01-15',
    usage_count: 12,
    template_data: {
      lineItems: [
        {
          id: '1',
          description: 'Prestation de conseil en stratégie digitale',
          quantity: 1,
          unitPrice: 800,
          vatRate: 20
        }
      ],
      paymentTerms: 30,
      paymentMethod: 'Virement bancaire',
      notes: 'Merci de votre confiance. Paiement à 30 jours.'
    }
  },
  {
    id: '2',
    name: 'Développement web',
    description: 'Template pour les projets de développement',
    category: 'service',
    is_default: false,
    created_at: '2024-01-20',
    usage_count: 8,
    template_data: {
      lineItems: [
        {
          id: '1',
          description: 'Développement site web responsive',
          quantity: 1,
          unitPrice: 2500,
          vatRate: 20
        },
        {
          id: '2',
          description: 'Formation utilisation CMS',
          quantity: 2,
          unitPrice: 200,
          vatRate: 20
        }
      ],
      paymentTerms: 45,
      paymentMethod: 'Virement bancaire',
      notes: 'Paiement en 2 fois : 50% à la commande, 50% à la livraison.'
    }
  },
  {
    id: '3',
    name: 'Vente produits',
    description: 'Template pour la vente de produits physiques',
    category: 'product',
    is_default: false,
    created_at: '2024-02-01',
    usage_count: 5,
    template_data: {
      lineItems: [
        {
          id: '1',
          description: 'Produit A - Référence PA001',
          quantity: 10,
          unitPrice: 25.50,
          vatRate: 20
        }
      ],
      paymentTerms: 15,
      paymentMethod: 'Carte bancaire',
      notes: 'Livraison sous 48h. Garantie 2 ans.'
    }
  }
]

const CATEGORY_LABELS = {
  service: 'Services',
  product: 'Produits',
  consulting: 'Conseil',
  other: 'Autre'
}

const CATEGORY_COLORS = {
  service: 'bg-blue-100 text-blue-700',
  product: 'bg-green-100 text-green-700',
  consulting: 'bg-purple-100 text-purple-700',
  other: 'bg-slate-100 text-slate-700'
}

export function TemplateManager({ onClose, onApplyTemplate }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')

  // Load templates on mount
  useEffect(() => {
    loadTemplates()
  }, [selectedCategory])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const data = await manualInvoicesApi.getTemplates(
        selectedCategory === 'all' ? undefined : selectedCategory
      )
      setTemplates(data)
    } catch (error) {
      console.error('Error loading templates:', error)
      // Fallback to mock data
      setTemplates(MOCK_TEMPLATES)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory)

  const handleApplyTemplate = async (template: Template) => {
    try {
      await manualInvoicesApi.useTemplate(template.id)
      // Update usage count locally
      setTemplates(prev => prev.map(t => 
        t.id === template.id ? { ...t, usage_count: t.usage_count + 1 } : t
      ))
      onApplyTemplate(template)
    } catch (error) {
      console.error('Error applying template:', error)
      // Still apply template locally
      onApplyTemplate(template)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await manualInvoicesApi.deleteTemplate(templateId)
      setTemplates(prev => prev.filter(t => t.id !== templateId))
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return
    
    try {
      const templateData = {
        name: newTemplateName,
        description: newTemplateDescription,
        category: 'other' as const,
        templateData: {} // TODO: Get from current form data
      }
      
      const newTemplate = await manualInvoicesApi.createTemplate(templateData)
      
      setTemplates(prev => [...prev, {
        id: newTemplate.id,
        name: newTemplate.name,
        description: newTemplate.description,
        category: newTemplate.category,
        isDefault: newTemplate.is_default,
        createdAt: newTemplate.created_at,
        usage: newTemplate.usage_count,
        data: newTemplate.template_data
      }])
      
      setShowCreateForm(false)
      setNewTemplateName('')
      setNewTemplateDescription('')
    } catch (error) {
      console.error('Error creating template:', error)
    }
  }

  const getTemplateIcon = (category: string) => {
    switch (category) {
      case 'service': return Users
      case 'product': return ShoppingCart
      case 'consulting': return Building
      default: return FileTemplate
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center">
              <Lightbulb className="h-6 w-6 mr-2 text-amber-600" />
              Gestionnaire de templates
            </h2>
            <p className="text-slate-600 mt-1">
              Modèles prédéfinis pour accélérer la création de factures
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer un template
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
          {/* Create Template Form */}
          {showCreateForm && (
            <Card className="mb-6 border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Plus className="h-5 w-5 mr-2 text-amber-600" />
                  Créer un nouveau template
                </CardTitle>
                <CardDescription>
                  Sauvegardez vos paramètres actuels comme template réutilisable
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="templateName">Nom du template *</Label>
                  <Input
                    id="templateName"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Mon template personnalisé"
                  />
                </div>
                
                <div>
                  <Label htmlFor="templateDescription">Description</Label>
                  <Input
                    id="templateDescription"
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    placeholder="Description de l'utilisation de ce template"
                  />
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={handleCreateTemplate}
                    disabled={!newTemplateName}
                    className="bg-amber-600 text-white hover:bg-amber-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                  
                  <Button
                    onClick={() => setShowCreateForm(false)}
                    variant="outline"
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Filter */}
          <div className="flex items-center space-x-3 mb-6">
            <span className="text-sm font-medium text-slate-700">Catégorie:</span>
            <Button
              onClick={() => setSelectedCategory('all')}
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
            >
              Tous ({templates.length})
            </Button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const count = templates.filter(t => t.category === key).length
              return (
                <Button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  variant={selectedCategory === key ? 'default' : 'outline'}
                  size="sm"
                >
                  {label} ({count})
                </Button>
              )
            })}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((template) => {
              const IconComponent = getTemplateIcon(template.category)
              
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <IconComponent className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center">
                            {template.name}
                            {template.isDefault && (
                              <Star className="h-4 w-4 ml-2 text-amber-500 fill-current" />
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        </div>
                      </div>
                      
                      {!template.isDefault && (
                        <Button
                          onClick={() => handleDeleteTemplate(template.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Template Info */}
                    <div className="flex items-center justify-between text-sm">
                      <Badge className={CATEGORY_COLORS[template.category]}>
                        {CATEGORY_LABELS[template.category]}
                      </Badge>
                      
                      <div className="flex items-center text-slate-600">
                        <Clock className="h-4 w-4 mr-1" />
                        Utilisé {template.usage_count} fois
                      </div>
                    </div>

                    {/* Template Preview */}
                    <div className="bg-slate-50 p-3 rounded-lg text-sm">
                      <div className="font-medium text-slate-900 mb-2">Aperçu:</div>
                      <div className="space-y-1 text-slate-700">
                        {template.template_data?.lineItems && (
                          <div>• {template.template_data.lineItems.length} ligne(s) de facturation</div>
                        )}
                        {template.template_data?.paymentTerms && (
                          <div>• Paiement à {template.template_data.paymentTerms} jours</div>
                        )}
                        {template.template_data?.paymentMethod && (
                          <div>• Mode: {template.template_data.paymentMethod}</div>
                        )}
                        {!template.template_data && (
                          <div className="text-slate-500 italic">Données du template non disponibles</div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={() => handleApplyTemplate(template)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 text-white hover:opacity-90"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Appliquer
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Empty State */}
          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileTemplate className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Aucun template trouvé
              </h3>
              <p className="text-slate-600 mb-4">
                {selectedCategory === 'all' 
                  ? 'Commencez par créer votre premier template'
                  : `Aucun template dans la catégorie "${CATEGORY_LABELS[selectedCategory as keyof typeof CATEGORY_LABELS]}"`
                }
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un template
              </Button>
            </div>
          )}

          {/* Tips */}
          <Alert className="mt-6 border-amber-200 bg-amber-50">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong>Astuce:</strong> Les templates sauvegardent vos lignes de facturation, conditions de paiement 
              et notes. Ils ne sauvegardent pas les informations client spécifiques.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}