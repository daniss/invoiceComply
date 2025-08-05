'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Home,
  FileOutput,
  Send,
  Search,
  Receipt,
  Plus
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Core MVP Features + Manual Invoice Builder
const navigation = [
  {
    name: 'Tableau de bord',
    href: '/dashboard',
    icon: Home,
    description: 'Vue d\'ensemble'
  },
  {
    name: 'Créer Facture',
    href: '/dashboard/create',
    icon: Plus,
    description: 'Éditeur manuel',
    featured: true
  },
  {
    name: 'Convertir PDF',
    href: '/dashboard/convert',
    icon: FileOutput,
    description: 'PDF vers Factur-X',
    primary: true
  },
  {
    name: 'Transmettre',
    href: '/dashboard/transmit',
    icon: Send,
    description: 'Chorus Pro',
    count: 3
  },
  {
    name: 'Vérifier',
    href: '/dashboard/compliance',
    icon: Search,
    description: 'Conformité'
  }
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col w-64 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200/60 shadow-xl">
      {/* Modern Logo */}
      <div className="flex items-center px-6 py-6">
        <div className="flex items-center">
          <div className="relative">
            {/* Main logo container with better design */}
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              
              {/* Custom invoice icon using geometric shapes */}
              <div className="relative">
                {/* Document shape */}
                <div className="w-6 h-7 bg-white rounded-sm relative">
                  {/* Document lines */}
                  <div className="absolute top-1.5 left-1 right-1 space-y-0.5">
                    <div className="h-0.5 bg-blue-600 rounded-full"></div>
                    <div className="h-0.5 bg-blue-500 rounded-full w-3/4"></div>
                    <div className="h-0.5 bg-blue-400 rounded-full w-1/2"></div>
                  </div>
                  
                  {/* Compliance checkmark in corner */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 border-b-2 border-r-2 border-white transform rotate-45 -translate-y-0.5"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full shadow-sm flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          
          <div className="ml-4">
            <div className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              InvoiceComply
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <div className="text-xs text-slate-500 font-medium">Factur-X • Conformité</div>
              <div className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                MVP
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Navigation */}
      <nav className="flex-1 px-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 overflow-hidden',
                  item.primary 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transform'
                    : item.featured
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transform'
                    : isActive
                    ? 'bg-blue-50/80 text-blue-700 border border-blue-200/50 shadow-sm backdrop-blur-sm'
                    : 'text-slate-700 hover:bg-slate-50/80 hover:text-slate-900 hover:shadow-sm backdrop-blur-sm'
                )}
              >
                {/* Background effect for primary and featured buttons */}
                {item.primary && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
                {item.featured && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
                
                {/* Active indicator */}
                {isActive && !item.primary && !item.featured && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full"></div>
                )}
                
                <div className="relative flex items-center w-full">
                  <div className={cn(
                    'mr-3 p-1.5 rounded-lg transition-colors duration-200',
                    item.primary 
                      ? 'bg-white/20' 
                      : item.featured
                      ? 'bg-white/20'
                      : isActive 
                      ? 'bg-blue-100' 
                      : 'bg-slate-100 group-hover:bg-slate-200'
                  )}>
                    <item.icon
                      className={cn(
                        'h-4 w-4 flex-shrink-0 transition-colors duration-200',
                        item.primary 
                          ? 'text-white' 
                          : item.featured
                          ? 'text-white'
                          : isActive 
                          ? 'text-blue-600' 
                          : 'text-slate-500 group-hover:text-slate-600'
                      )}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'font-semibold truncate',
                      item.primary ? 'text-white' : item.featured ? 'text-white' : isActive ? 'text-blue-700' : 'text-slate-700'
                    )}>
                      {item.name}
                    </div>
                    <div className={cn(
                      'text-xs truncate mt-0.5',
                      item.primary 
                        ? 'text-blue-100' 
                        : item.featured
                        ? 'text-green-100'
                        : isActive 
                        ? 'text-blue-600/70' 
                        : 'text-slate-500'
                    )}>
                      {item.description}
                    </div>
                  </div>
                  
                  {item.count && (
                    <Badge
                      className={cn(
                        'ml-2 transition-all duration-200',
                        item.primary 
                          ? 'bg-white/20 text-white border-white/30 hover:bg-white/30' 
                          : item.featured
                          ? 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                          : isActive 
                          ? 'bg-blue-100 text-blue-700 border-blue-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      )}
                      variant="outline"
                    >
                      {item.count}
                    </Badge>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Modern Footer */}
      <div className="p-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200/50 shadow-sm">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-200/30 to-amber-200/30 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="relative">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <div className="text-sm font-bold text-orange-900">
                Échéance 2026
              </div>
            </div>
            <div className="text-xs text-orange-700/80 leading-relaxed">
              Obligation légale septembre 2026
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}