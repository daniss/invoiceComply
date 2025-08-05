'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  FileOutput, 
  Send, 
  Search, 
  Package, 
  CheckCircle, 
  AlertCircle, 
  Clock
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalInvoices: number
  processedToday: number
  pendingTransmissions: number
  complianceRate: number
  averageProcessingTime: number
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 127,
    processedToday: 23,
    pendingTransmissions: 3,
    complianceRate: 94.2,
    averageProcessingTime: 2.1
  })

  const getComplianceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 90) return 'text-blue-600'
    if (rate >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600 mt-1">
          Vue d'ensemble de vos factures électroniques Factur-X
        </p>
      </div>

      {/* Compliance Alert */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <div>
            <div className="font-medium text-orange-900">
              Échéance e-facturation: Septembre 2026
            </div>
            <div className="text-sm text-orange-700 mt-1">
              Préparez-vous dès maintenant à la facturation électronique obligatoire
            </div>
          </div>
        </div>
      </div>

      {/* Modern 2025 Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Factures - Blue gradient */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-blue-100/50">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-200/30 to-blue-300/20 rounded-full -translate-y-12 translate-x-12"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                <FileOutput className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-xs font-semibold text-blue-600 bg-blue-100/80 px-2 py-1 rounded-full">
                TOTAL
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.totalInvoices}</div>
            <div className="text-sm font-medium text-blue-700/80">Ce mois-ci</div>
          </div>
        </div>

        {/* Processed Today - Green gradient */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-emerald-100/50">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-200/30 to-green-300/20 rounded-full -translate-y-12 translate-x-12"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-xs font-semibold text-emerald-600 bg-emerald-100/80 px-2 py-1 rounded-full">
                AUJOURD'HUI
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.processedToday}</div>
            <div className="text-sm font-medium text-emerald-700/80">PDF → Factur-X</div>
          </div>
        </div>

        {/* Pending - Orange gradient */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-orange-100/50">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-200/30 to-amber-300/20 rounded-full -translate-y-12 translate-x-12"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                <Send className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-xs font-semibold text-orange-600 bg-orange-100/80 px-2 py-1 rounded-full">
                EN ATTENTE
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.pendingTransmissions}</div>
            <div className="text-sm font-medium text-orange-700/80">À transmettre</div>
          </div>
        </div>

        {/* Compliance - Purple gradient */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-purple-100/50">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-200/30 to-violet-300/20 rounded-full -translate-y-12 translate-x-12"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                <Search className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-xs font-semibold text-purple-600 bg-purple-100/80 px-2 py-1 rounded-full">
                CONFORMITÉ
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.complianceRate}%</div>
            <div className="text-sm font-medium text-purple-700/80">Factur-X valide</div>
          </div>
        </div>
      </div>

      {/* Modern 2025 Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions - Modern Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Actions Rapides</h3>
            <p className="text-slate-600">Fonctionnalités principales d'InvoiceComply</p>
          </div>
          
          <div className="space-y-4">
            <Link href="/dashboard/convert">
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-5 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center">
                  <div className="p-2 bg-white/20 rounded-xl mr-4">
                    <FileOutput className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-lg">Convertir PDF</div>
                    <div className="text-blue-100 text-sm">PDF vers Factur-X</div>
                  </div>
                  <div className="text-white/60">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
            
            <Link href="/dashboard/transmit">
              <div className="group rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 p-5 transition-all duration-300 cursor-pointer border border-slate-200/50">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-xl mr-4">
                    <Send className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">Transmettre</div>
                    <div className="text-slate-600 text-sm">Chorus Pro</div>
                  </div>
                  {stats.pendingTransmissions > 0 && (
                    <div className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      {stats.pendingTransmissions}
                    </div>
                  )}
                </div>
              </div>
            </Link>
            
            <Link href="/dashboard/compliance">
              <div className="group rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 p-5 transition-all duration-300 cursor-pointer border border-slate-200/50">
                <div className="flex items-center">
                  <div className="p-2 bg-emerald-100 rounded-xl mr-4">
                    <Search className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">Vérifier</div>
                    <div className="text-slate-600 text-sm">Conformité</div>
                  </div>
                </div>
              </div>
            </Link>
            
            <Link href="/dashboard/bulk">
              <div className="group rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 p-5 transition-all duration-300 cursor-pointer border border-slate-200/50">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-xl mr-4">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">Traitement en lot</div>
                    <div className="text-slate-600 text-sm">Import CSV</div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Process Flow - Modern Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"></div>
          
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Processus MVP</h3>
            <p className="text-slate-600">Flux simplifié de traitement des factures</p>
          </div>
          
          <div className="space-y-6">
            <div className="relative flex items-center">
              <div className="absolute left-6 top-12 w-0.5 h-8 bg-gradient-to-b from-blue-300 to-emerald-300"></div>
              <div className="flex items-center space-x-4 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-lg">Convertir PDF</div>
                  <div className="text-slate-600">PDF → Format Factur-X</div>
                </div>
              </div>
            </div>
            
            <div className="relative flex items-center">
              <div className="absolute left-6 top-12 w-0.5 h-8 bg-gradient-to-b from-emerald-300 to-purple-300"></div>
              <div className="flex items-center space-x-4 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-lg">Vérifier</div>
                  <div className="text-slate-600">Contrôle conformité automatique</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-lg">Transmettre</div>
                <div className="text-slate-600">Envoi sécurisé Chorus Pro</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern 2025 Activity Feed */}
      <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"></div>
        
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Activité Récente</h3>
          <p className="text-slate-600">Dernières actions sur vos factures Factur-X</p>
        </div>
        
        <div className="space-y-4">
          <div className="group relative rounded-2xl bg-emerald-50/80 border border-emerald-200/50 p-5 hover:bg-emerald-50 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">Facture FACT-2024-0127 convertie avec succès</p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-emerald-700">Il y a 5 minutes</p>
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  <p className="text-sm text-slate-600">PDF → Factur-X</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-emerald-100 rounded-full">
                <span className="text-xs font-semibold text-emerald-700">SUCCÈS</span>
              </div>
            </div>
          </div>
          
          <div className="group relative rounded-2xl bg-blue-50/80 border border-blue-200/50 p-5 hover:bg-blue-50 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">3 factures transmises à Chorus Pro</p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-blue-700">Il y a 12 minutes</p>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <p className="text-sm text-slate-600">Transmission automatique</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-blue-100 rounded-full">
                <span className="text-xs font-semibold text-blue-700">ENVOYÉ</span>
              </div>
            </div>
          </div>
          
          <div className="group relative rounded-2xl bg-purple-50/80 border border-purple-200/50 p-5 hover:bg-purple-50 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">Traitement en lot terminé (45 factures)</p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-purple-700">Il y a 1 heure</p>
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                  <p className="text-sm text-slate-600">Import CSV</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-purple-100 rounded-full">
                <span className="text-xs font-semibold text-purple-700">TERMINÉ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}