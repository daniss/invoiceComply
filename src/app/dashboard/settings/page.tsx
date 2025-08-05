'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Settings, 
  Building2, 
  CreditCard, 
  Shield, 
  Bell, 
  Key,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Save,
  Download,
  Trash2
} from 'lucide-react'
import { settingsApi, handleApiError } from '@/lib/api/client'
import { useToast } from '@/components/ui/toast'

interface CompanyInfo {
  companyName: string
  siret: string
  vatNumber: string
  legalForm: string
  address: string
  postalCode: string
  city: string
  contactEmail: string
  contactPhone: string
}

interface SubscriptionInfo {
  plan: 'starter' | 'professional' | 'business'
  planName: string
  status: 'active' | 'trial' | 'expired'
  renewalDate: string | null
  invoicesUsed: number
  invoicesLimit: number
  stripeSubscriptionId?: string | null
  cancelAtPeriodEnd?: boolean
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'subscription' | 'integrations' | 'security' | 'notifications'>('company')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [companyData, setCompanyData] = useState<CompanyInfo>({
    companyName: '',
    siret: '',
    vatNumber: '',
    legalForm: 'SARL',
    address: '',
    postalCode: '',
    city: '',
    contactEmail: '',
    contactPhone: ''
  })

  const [subscriptionData, setSubscriptionData] = useState<SubscriptionInfo>({
    plan: 'starter',
    planName: 'Starter',
    status: 'trial',
    renewalDate: null,
    invoicesUsed: 0,
    invoicesLimit: 50
  })
  
  const toast = useToast()

  const tabs = [
    { id: 'company', label: 'Entreprise', icon: Building2 },
    { id: 'subscription', label: 'Abonnement', icon: CreditCard },
    { id: 'integrations', label: 'Intégrations', icon: ExternalLink },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ]

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '29€/mois',
      limit: '50 factures',
      features: ['PDF vers Factur-X', 'Transmission Chorus Pro', 'Support email']
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '79€/mois',
      limit: '500 factures',
      features: ['Tout Starter +', 'Traitement en lot', 'API access', 'Support prioritaire']
    },
    {
      id: 'business',
      name: 'Business',
      price: '149€/mois',
      limit: 'Illimité',
      features: ['Tout Professional +', 'Intégrations avancées', 'Support téléphone', 'SLA garantie']
    }
  ]

  // Load data on component mount
  useEffect(() => {
    loadCompanySettings()
    loadSubscriptionData()
  }, [])

  const loadCompanySettings = async () => {
    try {
      setIsLoading(true)
      const response = await settingsApi.getCompany()
      if (response.success && response.settings) {
        setCompanyData({
          companyName: response.settings.companyName || '',
          siret: response.settings.siret || '',
          vatNumber: response.settings.vatNumber || '',
          legalForm: response.settings.legalForm || 'SARL',
          address: response.settings.address || '',
          postalCode: response.settings.postalCode || '',
          city: response.settings.city || '',
          contactEmail: response.settings.contactEmail || '',
          contactPhone: response.settings.contactPhone || ''
        })
      }
    } catch (error) {
      setError(handleApiError(error))
    } finally {
      setIsLoading(false)
    }
  }

  const loadSubscriptionData = async () => {
    try {
      // Since we don't have a subscription API client yet, we'll use fetch directly
      const response = await fetch('/api/settings/subscription')
      const data = await response.json()
      
      if (data.success && data.subscription) {
        setSubscriptionData(data.subscription)
      }
    } catch (error) {
      console.error('Error loading subscription data:', error)
    }
  }

  const validateSIRET = (siret: string) => {
    const cleaned = siret.replace(/\s/g, '')
    return cleaned.length === 14 && /^\d{14}$/.test(cleaned)
  }

  const validateVAT = (vat: string) => {
    return /^FR\d{11}$/.test(vat)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)
      
      const response = await settingsApi.updateCompany(companyData)
      
      if (response.success) {
        setSuccess('Paramètres sauvegardés avec succès')
        toast.success('Paramètres sauvegardés', 'Vos informations d\'entreprise ont été mises à jour')
        // Update the form with the returned data
        if (response.settings) {
          setCompanyData(prev => ({ ...prev, ...response.settings }))
        }
      } else {
        throw new Error(response.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      setError(handleApiError(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportData = async () => {
    try {
      // In a real implementation, this would call the GDPR export API
      const data = {
        company: companyData,
        subscription: subscriptionData,
        exportDate: new Date().toISOString(),
        note: 'Export généré conformément au RGPD'
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mes-donnees-invoicecomply-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setSuccess('Export RGPD généré avec succès')
    } catch (error) {
      setError('Erreur lors de l\'export des données')
    }
  }

  const handleChangePlan = async (planId: string) => {
    try {
      setError(null)
      setSuccess(null)
      
      const response = await fetch('/api/settings/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_plan', planId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess(`Plan changé vers ${planId} avec succès`)
        toast.success('Abonnement modifié', `Votre plan a été changé vers ${planId}`)
        await loadSubscriptionData() // Reload subscription data
      } else {
        throw new Error(data.error || 'Erreur lors du changement de plan')
      }
    } catch (error) {
      setError(handleApiError(error))
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-600 mt-2">
          Configuration de votre compte et préférences
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Erreur:</strong> {error}
          </AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Succès:</strong> {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Company Tab */}
      {activeTab === 'company' && (
        <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
          
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Informations de l'entreprise</h3>
            <p className="text-slate-600">Données légales et coordonnées</p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <Settings className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-slate-600">Chargement des paramètres...</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <Label htmlFor="companyName">Raison sociale</Label>
                <Input
                  id="companyName"
                  value={companyData.companyName}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siret">SIRET</Label>
                  <Input
                    id="siret"
                    value={companyData.siret}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, siret: e.target.value }))}
                    className={`mt-1 ${!validateSIRET(companyData.siret) ? 'border-red-300' : 'border-green-300'}`}
                  />
                  {validateSIRET(companyData.siret) ? (
                    <div className="flex items-center space-x-1 mt-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">Valide</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 mt-1">
                      <AlertCircle className="h-3 w-3 text-red-600" />
                      <span className="text-xs text-red-600">Format incorrect</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="vatNumber">N° TVA</Label>
                  <Input
                    id="vatNumber"
                    value={companyData.vatNumber}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, vatNumber: e.target.value }))}
                    className={`mt-1 ${!validateVAT(companyData.vatNumber) ? 'border-red-300' : 'border-green-300'}`}
                  />
                  {validateVAT(companyData.vatNumber) ? (
                    <div className="flex items-center space-x-1 mt-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">Format français valide</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 mt-1">
                      <AlertCircle className="h-3 w-3 text-red-600" />
                      <span className="text-xs text-red-600">Format FRxxxxxxxxx attendu</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="legalForm">Forme juridique</Label>
                <select
                  id="legalForm"
                  value={companyData.legalForm}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, legalForm: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="SARL">SARL</option>
                  <option value="SAS">SAS</option>
                  <option value="EURL">EURL</option>
                  <option value="SA">SA</option>
                  <option value="SNC">SNC</option>
                  <option value="Auto-entrepreneur">Auto-entrepreneur</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={companyData.address}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode">Code postal</Label>
                  <Input
                    id="postalCode"
                    value={companyData.postalCode}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, postalCode: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={companyData.city}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, city: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contactEmail">Email de contact</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={companyData.contactEmail}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="contactPhone">Téléphone</Label>
                <Input
                  id="contactPhone"
                  value={companyData.contactPhone}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90"
            >
              {isSaving ? (
                <Settings className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
            </div>
          )}
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div className="space-y-8">
          {/* Current Plan */}
          <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Abonnement actuel</h3>
              <p className="text-slate-600">Gestion de votre forfait</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center space-x-4">
                  <Badge className="bg-green-100 text-green-700 text-lg px-4 py-2">
                    {subscriptionData.planName}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700">
                    {subscriptionData.status === 'active' ? 'ACTIF' : 'ESSAI'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-slate-700">Utilisation ce mois</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {subscriptionData.invoicesUsed}/{subscriptionData.invoicesLimit}
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(subscriptionData.invoicesUsed / subscriptionData.invoicesLimit) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-700">Renouvellement</div>
                    <div className="text-lg font-semibold text-slate-900 mt-1">
                      {subscriptionData.renewalDate 
                        ? new Date(subscriptionData.renewalDate).toLocaleDateString('fr-FR')
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {subscriptionData.status === 'active' ? 'Facturation automatique' : 'Période d\'essai'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Modifier l'abonnement
                </Button>
                <Button variant="outline" className="w-full">
                  Historique des factures
                </Button>
              </div>
            </div>
          </div>

          {/* Available Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative overflow-hidden rounded-3xl p-6 shadow-lg border transition-all duration-300 ${
                  plan.id === subscriptionData.plan
                    ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 ring-2 ring-blue-500 ring-opacity-20'
                    : 'bg-white/80 backdrop-blur-sm border-slate-200 hover:shadow-xl'
                }`}
              >
                {plan.id === subscriptionData.plan && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                )}
                
                <div className="mb-4">
                  <h4 className="text-lg font-bold text-slate-900">{plan.name}</h4>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{plan.price}</div>
                  <div className="text-sm text-slate-600">{plan.limit}</div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-slate-700">
                      <CheckCircle className="h-3 w-3 text-green-600 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={plan.id === subscriptionData.plan ? "outline" : "default"}
                  className="w-full"
                  disabled={plan.id === subscriptionData.plan}
                  onClick={() => plan.id !== subscriptionData.plan && handleChangePlan(plan.id)}
                >
                  {plan.id === subscriptionData.plan ? 'Plan actuel' : 'Choisir ce plan'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
          
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Intégrations</h3>
            <p className="text-slate-600">Connectez vos outils de comptabilité</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: 'Sage Comptabilité', status: 'connected', description: 'Synchronisation bidirectionnelle' },
              { name: 'Chorus Pro', status: 'connected', description: 'Transmission automatique' },
              { name: 'Cegid Expert', status: 'available', description: 'Import/export automatisé' },
              { name: 'EBP Compta', status: 'available', description: 'Synchronisation des factures' }
            ].map((integration, index) => (
              <div key={index} className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900">{integration.name}</h4>
                  <Badge className={
                    integration.status === 'connected' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-slate-100 text-slate-700'
                  }>
                    {integration.status === 'connected' ? 'CONNECTÉ' : 'DISPONIBLE'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 mb-4">{integration.description}</p>
                <Button 
                  size="sm" 
                  variant={integration.status === 'connected' ? 'outline' : 'default'}
                  className="w-full"
                >
                  {integration.status === 'connected' ? 'Configurer' : 'Connecter'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Sécurité et confidentialité</h3>
              <p className="text-slate-600">Protection de vos données</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-green-50 border border-green-200">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-semibold text-green-900">Chiffrement des données</div>
                    <div className="text-sm text-green-700">AES-256 activé</div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700">ACTIF</Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="flex items-center space-x-3">
                  <Key className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-semibold text-blue-900">Authentification à deux facteurs</div>
                    <div className="text-sm text-blue-700">Protection renforcée du compte</div>
                  </div>
                </div>
                <Button size="sm" variant="outline">Configurer</Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-3">
                  <Download className="h-5 w-5 text-slate-600" />
                  <div>
                    <div className="font-semibold text-slate-900">Export de données RGPD</div>
                    <div className="text-sm text-slate-600">Télécharger toutes vos données</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportData}>
                  Exporter
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50 border border-red-200">
                <div className="flex items-center space-x-3">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-semibold text-red-900">Suppression du compte</div>
                    <div className="text-sm text-red-700">Action irréversible</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-500"></div>
          
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Notifications</h3>
            <p className="text-slate-600">Gérez vos alertes et rappels</p>
          </div>

          <div className="space-y-6">
            {[
              { label: 'Transmission réussie', description: 'Notification lors de l\'envoi réussi', enabled: true },
              { label: 'Erreurs de traitement', description: 'Alerte en cas de problème', enabled: true },
              { label: 'Limite de facturation', description: 'Rappel à 80% du quota', enabled: true },
              { label: 'Nouvelles fonctionnalités', description: 'Information sur les mises à jour', enabled: false },
              { label: 'Rapports hebdomadaires', description: 'Résumé d\'activité par email', enabled: false }
            ].map((notification, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="font-semibold text-slate-900">{notification.label}</div>
                  <div className="text-sm text-slate-600">{notification.description}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={notification.enabled}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}