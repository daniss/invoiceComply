import { Metadata } from 'next'
import { ContactForm } from '@/components/contact/contact-form'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact - InvoiceComply',
  description: 'Contactez notre équipe pour toute question sur InvoiceComply',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contactez-nous
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Notre équipe d'experts est là pour vous accompagner dans votre transition 
            vers la facturation électronique conforme.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Informations de contact
              </h2>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Email</h3>
                    <p className="text-gray-600">support@invoicecomply.fr</p>
                    <p className="text-gray-600">commercial@invoicecomply.fr</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Téléphone</h3>
                    <p className="text-gray-600">+33 1 23 45 67 89</p>
                    <p className="text-gray-600">Support technique : +33 1 23 45 67 90</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Adresse</h3>
                    <p className="text-gray-600">
                      123 Avenue des Champs-Élysées<br />
                      75008 Paris<br />
                      France
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Horaires</h3>
                    <p className="text-gray-600">
                      Lundi - Vendredi : 9h00 - 18h00<br />
                      Support 24h/7j pour les clients Premium
                    </p>
                  </div>
                </div>
              </div>

              {/* Support par type */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Support spécialisé
                </h3>
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">Support Technique</h4>
                    <p className="text-sm text-blue-700">
                      Assistance pour l'intégration et les problèmes techniques
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">Conseil Conformité</h4>
                    <p className="text-sm text-green-700">
                      Aide pour la mise en conformité réglementaire
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-medium text-purple-900">Support Commercial</h4>
                    <p className="text-sm text-purple-700">
                      Démonstrations et devis personnalisés
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Envoyez-nous un message
              </h2>
              <ContactForm />
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Questions Fréquentes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Quand la facturation électronique devient-elle obligatoire ?
              </h3>
              <p className="text-gray-600">
                Pour les grandes entreprises : septembre 2026. Pour les PME : septembre 2027.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                InvoiceComply est-il conforme aux standards français ?
              </h3>
              <p className="text-gray-600">
                Oui, nous respectons le format Factur-X et l'intégration Chorus Pro.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Combien de temps faut-il pour traiter une facture ?
              </h3>
              <p className="text-gray-600">
                En moyenne 30 secondes pour l'extraction et validation automatique.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Vos données sont-elles sécurisées ?
              </h3>
              <p className="text-gray-600">
                Nous respectons le RGPD et hébergeons en France avec chiffrement bout en bout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}