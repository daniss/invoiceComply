'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Eye,
  Filter,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import { transmissionApi, invoiceApi, handleApiError } from '@/lib/api/client'
import { usePolling } from '@/hooks/usePolling'
import { useToast } from '@/components/ui/toast'

interface Transmission {
  id: string
  invoice_id: string
  user_id: string
  pdp_provider: 'chorus_pro' | 'partner'
  status: 'pending' | 'sending' | 'sent' | 'delivered' | 'error'
  error_message?: string
  chorus_pro_id?: string
  delivered_at?: string
  created_at: string
  updated_at: string
  // Joined invoice data
  invoices?: {
    invoice_number: string
    supplier_name: string
    total_amount: number
    buyer_name?: string
    buyer_siret?: string
  }
}

interface TransmissionStats {
  total: number
  pending: number
  sent: number
  errors: number
}

export default function TransmitPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [transmissions, setTransmissions] = useState<Transmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTransmitting, setIsTransmitting] = useState(false)
  const [transmissionStats, setTransmissionStats] = useState<TransmissionStats>({
    total: 0,
    pending: 0,
    sent: 0,
    errors: 0
  })
  
  const toast = useToast()

  // Load transmissions data
  const loadTransmissions = async () => {
    try {
      setError(null)
      const response = await transmissionApi.getStatus()
      if (response.success && response.transmissions) {
        setTransmissions(response.transmissions)
        // Show toast for status changes
        const activeTransmissions = response.transmissions.filter(t => t.status === 'sending')
        if (activeTransmissions.length > 0) {
          toast.info(`${activeTransmissions.length} transmission(s) en cours`)
        }
      }
    } catch (error) {
      setError(handleApiError(error))
      toast.error('Erreur de chargement', 'Impossible de charger les transmissions')
    } finally {
      setIsLoading(false)
    }
  }

  // Real-time polling for transmission status updates
  const shouldPoll = transmissions.some(t => ['pending', 'sending'].includes(t.status))
  
  usePolling(loadTransmissions, {
    interval: 3000, // Poll every 3 seconds
    enabled: shouldPoll && !isLoading,
    immediate: false // Don't run immediately since we load on mount
  })

  // Load data on mount
  useEffect(() => {
    loadTransmissions()
  }, [])

  // Send transmission
  const handleTransmit = async (invoiceId: string, recipientSiret: string) => {
    try {
      setIsTransmitting(true)
      const response = await transmissionApi.send(invoiceId, recipientSiret)
      if (response.success) {
        toast.success('Transmission lancée', 'La facture est en cours d\'envoi')
        await loadTransmissions() // Refresh data
      } else {
        throw new Error(response.error || 'Erreur lors de la transmission')
      }
    } catch (error) {
      toast.error('Erreur de transmission', handleApiError(error))
    } finally {
      setIsTransmitting(false)
    }
  }

  const getStatusColor = (status: Transmission['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'sending':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'sent':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'delivered':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusLabel = (status: Transmission['status']) => {
    switch (status) {
      case 'pending':
        return 'En attente'
      case 'sending':
        return 'Envoi en cours'
      case 'sent':
        return 'Envoyé'
      case 'delivered':
        return 'Livré'
      case 'error':
        return 'Erreur'
      default:
        return status
    }
  }

  const getStatusIcon = (status: Transmission['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'sending':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'sent':
        return <Send className="h-4 w-4" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  // Update stats when transmissions change
  useEffect(() => {
    const stats = {
      total: transmissions.length,
      pending: transmissions.filter(t => t.status === 'pending').length,
      sent: transmissions.filter(t => ['sent', 'delivered'].includes(t.status)).length,
      errors: transmissions.filter(t => t.status === 'error').length
    }
    setTransmissionStats(stats)
  }, [transmissions])

  const handleRefreshTransmissions = async () => {
    await refreshTransmissions(async () => {
      const result = await transmissionApi.getStatus()
      return result
    })
  }

  const handleRetryTransmission = async (transmissionId: string) => {
    await retryTransmission(async () => {
      // Find the transmission to get the invoice ID
      const transmission = transmissions?.find(t => t.id === transmissionId)
      if (!transmission?.invoice_id) {
        throw new Error('Transmission non trouvée')
      }

      // Get buyer SIRET from invoice data
      const buyerSiret = transmission.invoices?.buyer_siret
      if (!buyerSiret) {
        throw new Error('SIRET destinataire manquant')
      }

      // Retry the transmission
      const result = await transmissionApi.send(
        transmission.invoice_id,
        buyerSiret,
        { 
          pdpProvider: transmission.pdp_provider,
          retry: true
        }
      )
      return result
    })
  }

  const handleTransmitPending = async () => {
    await transmitPending(async () => {
      const pendingTransmissions = transmissions?.filter(t => t.status === 'pending') || []
      
      if (pendingTransmissions.length === 0) {
        throw new Error('Aucune transmission en attente')
      }

      const results = []
      for (const transmission of pendingTransmissions) {
        try {
          const buyerSiret = transmission.invoices?.buyer_siret
          if (!buyerSiret) {
            console.warn(`SIRET manquant pour la facture ${transmission.invoices?.invoice_number}`)
            continue
          }

          const result = await transmissionApi.send(
            transmission.invoice_id,
            buyerSiret,
            { pdpProvider: transmission.pdp_provider }
          )
          results.push(result)
        } catch (error) {
          console.error(`Erreur transmission ${transmission.id}:`, error)
        }
      }
      
      return results
    })
  }

  const filteredTransmissions = selectedStatus === 'all' 
    ? (transmissions || [])
    : (transmissions || []).filter(t => t.status === selectedStatus)

  // Helper functions for display
  const formatAmount = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transmettre</h1>
          <p className="text-slate-600 mt-2">
            Envoi automatique vers Chorus Pro et plateformes partenaires
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            onClick={handleRefreshTransmissions}
            variant="outline"
            disabled={isRefreshing || transmissionsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(isRefreshing || transmissionsLoading) ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          
          <Button 
            onClick={handleTransmitPending}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90"
            disabled={transmissionStats.pending === 0 || isTransmitting}
          >
            {isTransmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Transmission...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Transmettre ({transmissionStats.pending})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Messages */}
      {(transmissionsError || refreshError || transmitError || retryError) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Erreur:</strong> {
              transmissionsError || refreshError || transmitError || retryError
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-6 border border-orange-100/50">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <Badge className="bg-orange-100 text-orange-700">EN ATTENTE</Badge>
          </div>
          <div className="text-2xl font-bold text-slate-900">{transmissionStats.pending}</div>
          <p className="text-sm text-orange-700">À transmettre</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 border border-green-100/50">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-xl">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <Badge className="bg-green-100 text-green-700">TRANSMIS</Badge>
          </div>
          <div className="text-2xl font-bold text-slate-900">{transmissionStats.sent}</div>
          <p className="text-sm text-green-700">Avec succès</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 p-6 border border-red-100/50">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <Badge className="bg-red-100 text-red-700">ERREURS</Badge>
          </div>
          <div className="text-2xl font-bold text-slate-900">{transmissionStats.errors}</div>
          <p className="text-sm text-red-700">À corriger</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border border-blue-100/50">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <ExternalLink className="h-5 w-5 text-blue-600" />
            </div>
            <Badge className="bg-blue-100 text-blue-700">CHORUS PRO</Badge>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {(transmissions || []).filter(t => t.pdp_provider === 'chorus_pro').length}
          </div>
          <p className="text-sm text-blue-700">Factures publiques</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filtrer par statut:</span>
        </div>
        <div className="flex space-x-2">
          {[
            { value: 'all', label: 'Tous' },
            { value: 'pending', label: 'En attente' },
            { value: 'sent', label: 'Envoyés' },
            { value: 'delivered', label: 'Livrés' },
            { value: 'error', label: 'Erreurs' }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setSelectedStatus(filter.value)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedStatus === filter.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transmissions List */}
      <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl border border-slate-200/50">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>
        
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">File de transmission</h3>
            <p className="text-slate-600">Suivi en temps réel de vos envois</p>
          </div>

          <div className="space-y-4">
            {transmissionsLoading ? (
              // Loading state
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-slate-50/80 border border-slate-200/50 p-6 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-6 bg-slate-200 rounded"></div>
                        <div className="space-y-2">
                          <div className="w-32 h-4 bg-slate-200 rounded"></div>
                          <div className="w-24 h-3 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                      <div className="w-24 h-8 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              filteredTransmissions.map((transmission) => (
                <div
                  key={transmission.id}
                  className="group relative rounded-2xl bg-slate-50/80 border border-slate-200/50 p-6 hover:bg-slate-50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(transmission.status)}
                        <Badge className={`${getStatusColor(transmission.status)} border`}>
                          {getStatusLabel(transmission.status)}
                        </Badge>
                      </div>
                      
                      <div>
                        <div className="font-semibold text-slate-900">
                          {transmission.invoices?.invoice_number || 'N° inconnu'}
                        </div>
                        <div className="text-sm text-slate-600">
                          {transmission.invoices?.buyer_name || 'Client inconnu'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">
                          {transmission.invoices?.total_amount 
                            ? formatAmount(transmission.invoices.total_amount)
                            : 'Montant inconnu'
                          }
                        </div>
                        <div className="text-sm text-slate-600">
                          {transmission.pdp_provider === 'chorus_pro' ? 'Chorus Pro' : 'PDP Partenaire'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-slate-600">
                          {formatDate(transmission.created_at)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatTime(transmission.created_at)}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          Détails
                        </Button>
                        
                        {transmission.status === 'error' && (
                          <Button 
                            onClick={() => handleRetryTransmission(transmission.id)}
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                            disabled={isRetrying}
                          >
                            <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                            Réessayer
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {transmission.chorus_pro_id && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">ID Chorus Pro:</span>
                        <span className="font-mono text-slate-900">{transmission.chorus_pro_id}</span>
                      </div>
                    </div>
                  )}

                  {transmission.delivered_at && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Livré le:</span>
                        <span className="text-slate-900">
                          {formatDate(transmission.delivered_at)} à {formatTime(transmission.delivered_at)}
                        </span>
                      </div>
                    </div>
                  )}

                  {transmission.error_message && (
                    <Alert className="mt-4 border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-900">
                        <strong>Erreur:</strong> {transmission.error_message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))
            )}
          </div>

          {filteredTransmissions.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500">
                Aucune transmission {selectedStatus !== 'all' ? `avec le statut "${getStatusLabel(selectedStatus as any)}"` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Alert className="border-blue-200 bg-blue-50">
          <ExternalLink className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Chorus Pro:</strong> Plateforme officielle pour les factures destinées au secteur public français.
          </AlertDescription>
        </Alert>

        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Transmission automatique:</strong> Les factures conformes sont envoyées automatiquement vers la bonne plateforme.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}