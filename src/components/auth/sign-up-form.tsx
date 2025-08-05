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
import { validateSiret } from '@/lib/validations/french-business'
import { createClient } from '@/lib/supabase/client'
import { fr } from '@/locales/fr'

const signUpSchema = z.object({
  email: z.string()
    .min(1, fr.auth.emailRequired)
    .email(fr.auth.emailInvalid)
    .transform(val => val.toLowerCase()),
  password: z.string()
    .min(8, fr.auth.passwordTooShort)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
  confirmPassword: z.string(),
  companyName: z.string()
    .min(2, 'Le nom de l\'entreprise doit contenir au moins 2 caractères')
    .max(100, 'Le nom de l\'entreprise ne peut pas dépasser 100 caractères'),
  siret: z.string()
    .regex(/^\d{14}$/, 'Le SIRET doit contenir exactement 14 chiffres')
    .refine(validateSiret, fr.auth.siretInvalid),
  legalEntity: z.string().optional(),
  gdprConsent: z.boolean().refine(val => val === true, 'Consentement RGPD requis'),
}).refine((data) => data.password === data.confirmPassword, {
  message: fr.auth.passwordMismatch,
  path: ["confirmPassword"],
})

type SignUpFormData = z.infer<typeof signUpSchema>

interface SignUpFormProps {
  onSuccess?: () => void
  onSignInClick?: () => void
}

export function SignUpForm({ onSuccess, onSignInClick }: SignUpFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const supabase = createClient()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  })

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            company_name: data.companyName,
            siret: data.siret,
            legal_entity: data.legalEntity,
            gdpr_consent: data.gdprConsent,
            gdpr_consent_date: new Date().toISOString(),
          }
        }
      })

      if (authError) {
        throw authError
      }

      if (authData.user) {
        // Create user profile in public.users table
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: data.email,
              company_name: data.companyName,
              siret: data.siret,
              legal_entity: data.legalEntity,
              subscription_tier: 'starter',
              gdpr_consent: data.gdprConsent,
              gdpr_consent_date: new Date().toISOString(),
            }
          ])

        if (profileError) {
          throw profileError
        }

        setSuccess(true)
        onSuccess?.()
      }
    } catch (err: any) {
      console.error('Sign up error:', err)
      
      if (err.message?.includes('already registered')) {
        setError(fr.auth.emailAlreadyExists)
      } else if (err.message?.includes('Password')) {
        setError(fr.auth.weakPassword)
      } else {
        setError('Une erreur est survenue lors de l\'inscription')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-green-600">Inscription réussie !</CardTitle>
          <CardDescription className="text-center">
            {fr.auth.signUpSuccess}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={onSignInClick} 
            variant="outline" 
            className="w-full"
          >
            {fr.auth.signIn}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{fr.auth.createAccount}</CardTitle>
        <CardDescription>
          Créez votre compte pour commencer la mise en conformité
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
            <Label htmlFor="companyName">{fr.auth.companyName}</Label>
            <Input
              id="companyName"
              placeholder={fr.auth.companyNamePlaceholder}
              {...register('companyName')}
            />
            {errors.companyName && (
              <p className="text-sm text-red-600">{errors.companyName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="siret">{fr.auth.siret}</Label>
            <Input
              id="siret"
              placeholder={fr.auth.siretPlaceholder}
              {...register('siret')}
              maxLength={14}
            />
            {errors.siret && (
              <p className="text-sm text-red-600">{errors.siret.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="legalEntity">{fr.auth.legalEntity}</Label>
            <Input
              id="legalEntity"
              placeholder={fr.auth.legalEntityPlaceholder}
              {...register('legalEntity')}
            />
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{fr.auth.confirmPassword}</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={fr.auth.passwordPlaceholder}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="gdprConsent"
              type="checkbox"
              {...register('gdprConsent')}
              className="rounded border-gray-300"
            />
            <Label htmlFor="gdprConsent" className="text-sm">
              {fr.auth.gdprConsent}
            </Label>
          </div>
          {errors.gdprConsent && (
            <p className="text-sm text-red-600">{errors.gdprConsent.message}</p>
          )}

          <p className="text-xs text-gray-600">
            {fr.auth.dataHostingEu}
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? fr.common.loading : fr.auth.signUp}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onSignInClick}
              className="text-sm text-blue-600 hover:underline"
            >
              {fr.auth.alreadyHaveAccount} {fr.auth.signIn}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}