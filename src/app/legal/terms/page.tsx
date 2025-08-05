import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation - InvoiceComply',
  description: 'Conditions générales d\'utilisation de la plateforme InvoiceComply',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Conditions Générales d'Utilisation
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Objet</h2>
              <p className="text-gray-700 mb-4">
                Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation 
                de la plateforme InvoiceComply, service de dématérialisation et de conformité 
                des factures électroniques selon la réglementation française.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Définitions</h2>
              <ul className="text-gray-700 space-y-2">
                <li><strong>Service :</strong> La plateforme InvoiceComply et l'ensemble de ses fonctionnalités</li>
                <li><strong>Utilisateur :</strong> Toute personne physique ou morale utilisant le Service</li>
                <li><strong>Factur-X :</strong> Standard français de facturation électronique</li>
                <li><strong>Chorus Pro :</strong> Plateforme gouvernementale française de facturation électronique</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Acceptation des CGU</h2>
              <p className="text-gray-700 mb-4">
                L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU. 
                L'Utilisateur déclare avoir pris connaissance de ces conditions et les accepter sans réserve.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Description du Service</h2>
              <p className="text-gray-700 mb-4">
                InvoiceComply propose les services suivants :
              </p>
              <ul className="text-gray-700 space-y-2 ml-6">
                <li>• Conversion de factures PDF vers le format Factur-X</li>
                <li>• Validation de conformité selon la réglementation française</li>
                <li>• Transmission via Chorus Pro et réseaux PEPPOL</li>
                <li>• Suivi et traçabilité des transmissions</li>
                <li>• Rapports de conformité et analytiques</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Obligations de l'Utilisateur</h2>
              <div className="text-gray-700 space-y-4">
                <p>L'Utilisateur s'engage à :</p>
                <ul className="ml-6 space-y-2">
                  <li>• Fournir des informations exactes et à jour</li>
                  <li>• Respecter la réglementation en vigueur</li>
                  <li>• Ne pas porter atteinte à la sécurité du Service</li>
                  <li>• Respecter les droits de propriété intellectuelle</li>
                  <li>• Maintenir la confidentialité de ses identifiants</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Protection des Données</h2>
              <p className="text-gray-700 mb-4">
                Le traitement des données personnelles est régi par notre Politique de Confidentialité, 
                conforme au RGPD. L'Utilisateur dispose d'un droit d'accès, de rectification, 
                d'effacement et de portabilité de ses données.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Responsabilité</h2>
              <p className="text-gray-700 mb-4">
                InvoiceComply met en œuvre tous les moyens nécessaires pour assurer la qualité 
                du Service. Toutefois, la responsabilité d'InvoiceComply ne saurait être engagée 
                en cas de dommages indirects ou de perte de données due à un cas de force majeure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Propriété Intellectuelle</h2>
              <p className="text-gray-700 mb-4">
                Tous les éléments du Service (textes, images, sons, logiciels, etc.) sont protégés 
                par le droit de la propriété intellectuelle. Toute reproduction sans autorisation 
                est interdite.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Résiliation</h2>
              <p className="text-gray-700 mb-4">
                L'Utilisateur peut résilier son compte à tout moment depuis les paramètres 
                de son compte. InvoiceComply se réserve le droit de suspendre ou résilier 
                un compte en cas de non-respect des présentes CGU.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Droit applicable</h2>
              <p className="text-gray-700 mb-4">
                Les présentes CGU sont soumises au droit français. Tout litige sera porté 
                devant les tribunaux compétents de Paris.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Contact</h2>
              <p className="text-gray-700 mb-4">
                Pour toute question relative aux présentes CGU, vous pouvez nous contacter :
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>InvoiceComply</strong><br />
                  Email : support@invoicecomply.fr<br />
                  Adresse : 123 Avenue des Champs-Élysées, 75008 Paris, France
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}