'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { fr } from '@/locales/fr'

const signInSchema = z.object({
  email: z.string()
    .min(1, fr.auth.emailRequired)
    .email(fr.auth.emailInvalid)
    .transform(val => val.toLowerCase()),
  password: z.string().min(1, fr.auth.passwordRequired),
})

type SignInFormData = z.infer<typeof signInSchema>

interface SignInFormProps {
  onSuccess?: () => void
  onSignUpClick?: () => void
  onForgotPasswordClick?: () => void
}

export function SignInForm({ onSuccess, onSignUpClick, onForgotPasswordClick }: SignInFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        throw authError
      }

      if (authData.user) {
        onSuccess?.()
      }
    } catch (err: any) {
      console.error('Sign in error:', err)
      
      if (err.message?.includes('Invalid login credentials')) {
        setError(fr.auth.invalidCredentials)
      } else if (err.message?.includes('Email not confirmed')) {
        setError(fr.auth.emailVerificationRequired)
      } else if (err.message?.includes('Too many requests')) {
        setError(fr.auth.tooManyRequests)
      } else {
        setError('Une erreur est survenue lors de la connexion')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{fr.auth.welcomeBack}</CardTitle>
        <CardDescription>
          Connectez-vous à votre compte InvoiceComply
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{fr.auth.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder={fr.auth.emailPlaceholder}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{fr.auth.password}</Label>
            <Input
              id="password"
              type="password"
              placeholder={fr.auth.passwordPlaceholder}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? fr.common.loading : fr.auth.signIn}
          </Button>

          <div className="flex flex-col space-y-2 text-center">
            <button
              type="button"
              onClick={onForgotPasswordClick}
              className="text-sm text-blue-600 hover:underline"
            >
              {fr.auth.forgotPassword}
            </button>
            
            <div className="text-sm text-gray-600">
              {fr.auth.noAccount}{' '}
              <button
                type="button"
                onClick={onSignUpClick}
                className="text-blue-600 hover:underline"
              >
                {fr.auth.signUp}
              </button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}