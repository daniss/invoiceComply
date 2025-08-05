'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Search, 
  Settings, 
  LogOut, 
  User as UserIcon,
  ChevronDown
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DashboardHeaderProps {
  user: User
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [notifications] = useState([
    {
      id: 1,
      message: 'Nouvelle facture traitée avec succès',
      time: '2 min',
      type: 'success'
    },
    {
      id: 2,
      message: 'Problème de conformité détecté',
      time: '5 min',
      type: 'warning'
    }
  ])
  
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une facture, un destinataire..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Compliance Status */}
          <div className="hidden md:flex items-center space-x-2">
            <span className="text-sm text-gray-600">Conformité:</span>
            <Badge variant="default" className="bg-green-100 text-green-800">
              92% Conforme
            </Badge>
          </div>

          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </Button>
          </div>

          {/* User Profile */}
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-blue-600" />
              </div>
              <span className="hidden md:block text-sm font-medium">
                {user.email?.split('@')[0]}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="text-sm font-medium text-gray-900">
                      {user.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      Plan Professionnel
                    </div>
                  </div>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Mon Profil
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Paramètres
                  </button>
                  <div className="border-t border-gray-100">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Se déconnecter
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications panel (if open) */}
      {/* This would be a separate dropdown component */}
    </header>
  )
}