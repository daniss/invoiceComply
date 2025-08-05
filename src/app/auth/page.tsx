'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignInForm } from '@/components/auth/sign-in-form'
import { SignUpForm } from '@/components/auth/sign-up-form'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const router = useRouter()

  const handleAuthSuccess = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">InvoiceComply</h1>
          <p className="text-gray-600 mt-2">
            Conformité e-Facture 2026 pour les PME françaises
          </p>
        </div>

        {mode === 'signin' ? (
          <SignInForm
            onSuccess={handleAuthSuccess}
            onSignUpClick={() => setMode('signup')}
            onForgotPasswordClick={() => {
              // TODO: Implement forgot password
              console.log('Forgot password clicked')
            }}
          />
        ) : (
          <SignUpForm
            onSuccess={handleAuthSuccess}
            onSignInClick={() => setMode('signin')}
          />
        )}

        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>Données hébergées en Union Européenne</p>
          <p>Conforme RGPD</p>
        </div>
      </div>
    </div>
  )
}