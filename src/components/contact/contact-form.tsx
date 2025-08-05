'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Send } from 'lucide-react'

const contactSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse e-mail invalide'),
  company: z.string().min(2, 'Le nom de l\'entreprise est requis'),
  phone: z.string().optional(),
  subject: z.string().min(5, 'Le sujet doit contenir au moins 5 caractères'),
  message: z.string().min(20, 'Le message doit contenir au moins 20 caractères'),
  contactType: z.enum(['support', 'commercial', 'compliance', 'technical']),
  urgency: z.enum(['low', 'medium', 'high'])
})

type ContactFormData = z.infer<typeof contactSchema>

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      contactType: 'support',
      urgency: 'medium'
    }
  })

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // In a real implementation, you would send the data to your API
      console.log('Contact form data:', data)
      
      setSubmitStatus('success')
      reset()
    } catch (error) {
      console.error('Error submitting contact form:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Success/Error Messages */}
      {submitStatus === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.
          </AlertDescription>
        </Alert>
      )}

      {submitStatus === 'error' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Une erreur est survenue lors de l'envoi de votre message. Veuillez réessayer.
          </AlertDescription>
        </Alert>
      )}

      {/* Contact Type */}
      <div className="space-y-2">
        <Label htmlFor="contactType">Type de demande</Label>
        <select
          {...register('contactType')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="support">Support technique</option>
          <option value="commercial">Demande commerciale</option>
          <option value="compliance">Conseil conformité</option>
          <option value="technical">Intégration technique</option>
        </select>
        {errors.contactType && (
          <p className="text-sm text-red-600">{errors.contactType.message}</p>
        )}
      </div>

      {/* Name and Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom complet *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Votre nom complet"
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="votre@email.fr"
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
      </div>

      {/* Company and Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company">Entreprise *</Label>
          <Input
            id="company"
            {...register('company')}
            placeholder="Nom de votre entreprise"
          />
          {errors.company && (
            <p className="text-sm text-red-600">{errors.company.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            type="tel"
            {...register('phone')}
            placeholder="+33 1 23 45 67 89"
          />
          {errors.phone && (
            <p className="text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>
      </div>

      {/* Urgency */}
      <div className="space-y-2">
        <Label htmlFor="urgency">Niveau d'urgence</Label>
        <select
          {...register('urgency')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">Faible - Réponse sous 48h</option>
          <option value="medium">Moyen - Réponse sous 24h</option>
          <option value="high">Élevé - Réponse sous 4h</option>
        </select>
        {errors.urgency && (
          <p className="text-sm text-red-600">{errors.urgency.message}</p>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject">Sujet *</Label>
        <Input
          id="subject"
          {...register('subject')}
          placeholder="Objet de votre message"
        />
        {errors.subject && (
          <p className="text-sm text-red-600">{errors.subject.message}</p>
        )}
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <textarea
          id="message"
          {...register('message')}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Décrivez votre demande en détail..."
        />
        {errors.message && (
          <p className="text-sm text-red-600">{errors.message.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          * Champs obligatoires
        </p>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Envoi...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>Envoyer</span>
            </div>
          )}
        </Button>
      </div>

      {/* Additional Info */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Temps de réponse moyen :</strong> Support technique (4h), 
          Commercial (24h), Conformité (48h). Les clients Premium bénéficient 
          d'un support prioritaire.
        </p>
      </div>
    </form>
  )
}