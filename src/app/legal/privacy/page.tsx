import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Retour à l'accueil
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Politique de confidentialité</span>
              <Badge variant="secondary">RGPD</Badge>
            </CardTitle>
            <p className="text-gray-600">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">1. Responsable du traitement</h2>
              <div className="space-y-2 text-gray-700">
                <p><strong>InvoiceComply</strong></p>
                <p>Email : contact@invoicecomply.fr</p>
                <p>DPO : dpo@invoicecomply.fr</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">2. Données collectées</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Données d'entreprise :</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Raison sociale</li>
                    <li>Numéro SIRET</li>
                    <li>Forme juridique</li>
                    <li>Secteur d'activité</li>
                    <li>Adresse de l'entreprise</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Données de contact :</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Adresse email</li>
                    <li>Mot de passe (haché)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Données de facturation :</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Factures téléchargées (PDF)</li>
                    <li>Données extraites des factures</li>
                    <li>Fichiers XML générés (Factur-X)</li>
                    <li>Statuts de transmission</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Données techniques :</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Journaux d'audit</li>
                    <li>Adresse IP</li>
                    <li>Informations de connexion</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">3. Finalités du traitement</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Conversion des factures au format Factur-X</li>
                <li>Validation de la conformité réglementaire</li>
                <li>Transmission vers les plateformes certifiées (PDP)</li>
                <li>Gestion des comptes utilisateurs</li>
                <li>Facturation et gestion des abonnements</li>
                <li>Support technique</li>
                <li>Respect des obligations légales</li>
                <li>Amélioration du service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">4. Base légale</h2>
              <div className="space-y-2 text-gray-700">
                <p><strong>Exécution du contrat :</strong> Fourniture du service de conformité e-facture</p>
                <p><strong>Obligation légale :</strong> Conservation des documents fiscaux (7 ans)</p>
                <p><strong>Intérêt légitime :</strong> Amélioration du service et prévention de la fraude</p>
                <p><strong>Consentement :</strong> Cookies et communications marketing</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">5. Conservation des données</h2>
              <div className="space-y-2 text-gray-700">
                <p><strong>Données de facturation :</strong> 7 ans (obligation légale)</p>
                <p><strong>Données de compte :</strong> Durée de l'abonnement + 3 ans</p>
                <p><strong>Journaux d'audit :</strong> 7 ans</p>
                <p><strong>Données de navigation :</strong> 13 mois maximum</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">6. Destinataires des données</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Chorus Pro :</strong> Transmission officielle (DGFiP)</li>
                <li><strong>Plateformes PDP certifiées :</strong> Transmission alternative</li>
                <li><strong>Prestataires techniques :</strong> Hébergement (Supabase, Vercel)</li>
                <li><strong>Processeur de paiement :</strong> Stripe (SEPA)</li>
                <li><strong>Support :</strong> Résolution des incidents</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">7. Transferts internationaux</h2>
              <p className="text-gray-700">
                Toutes les données sont hébergées exclusivement dans l'Union Européenne. 
                Aucun transfert vers des pays tiers n'est effectué.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">8. Vos droits RGPD</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Vous disposez des droits suivants :</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li><strong>Droit d'accès :</strong> Consulter vos données</li>
                    <li><strong>Droit de rectification :</strong> Corriger vos données</li>
                    <li><strong>Droit à l'effacement :</strong> Supprimer vos données*</li>
                    <li><strong>Droit à la portabilité :</strong> Récupérer vos données</li>
                    <li><strong>Droit d'opposition :</strong> S'opposer au traitement</li>
                    <li><strong>Droit à la limitation :</strong> Limiter le traitement</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-600">
                  * Sous réserve des obligations légales de conservation (documents fiscaux)
                </p>

                <div>
                  <h3 className="font-medium mb-2">Comment exercer vos droits :</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Email : dpo@invoicecomply.fr</li>
                    <li>Depuis votre compte : Section "Mes données"</li>
                    <li>Réponse sous 1 mois maximum</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">9. Sécurité des données</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Chiffrement TLS 1.3 en transit</li>
                <li>Chiffrement AES-256 au repos</li>
                <li>Authentification à deux facteurs</li>
                <li>Sauvegardes quotidiennes chiffrées</li>
                <li>Surveillance continue des accès</li>
                <li>Tests de sécurité réguliers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">10. Cookies</h2>
              <div className="space-y-2 text-gray-700">
                <p><strong>Cookies strictement nécessaires :</strong> Authentification, sécurité</p>
                <p><strong>Cookies analytiques :</strong> Amélioration du service (avec consentement)</p>
                <p><strong>Gestion :</strong> Paramètres disponibles dans votre compte</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">11. Réclamations</h2>
              <p className="text-gray-700">
                En cas de litige concernant vos données personnelles, vous pouvez saisir la CNIL :
              </p>
              <div className="mt-2 text-gray-700">
                <p>CNIL - 3 Place de Fontenoy - TSA 80715 - 75334 PARIS CEDEX 07</p>
                <p>Téléphone : 01 53 73 22 22</p>
                <p>Site web : www.cnil.fr</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">12. Modifications</h2>
              <p className="text-gray-700">
                Cette politique peut être modifiée pour refléter les évolutions réglementaires 
                ou techniques. Vous serez informé de tout changement significatif par email.
              </p>
            </section>

            <div className="bg-blue-50 p-4 rounded-lg mt-8">
              <p className="text-blue-800 text-sm">
                <strong>Questions ?</strong> Contactez notre délégué à la protection des données : 
                <a href="mailto:dpo@invoicecomply.fr" className="underline"> dpo@invoicecomply.fr</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}