'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PrivacyNoticeProps {
  onAccept?: () => void
  onReject?: () => void
  compact?: boolean
}

export function PrivacyNotice({ onAccept, onReject, compact = false }: PrivacyNoticeProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (compact) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
        <Alert>
          <AlertDescription className="text-sm">
            <div className="flex items-center justify-between">
              <span>
                Nous utilisons des cookies pour améliorer votre expérience.
              </span>
              <div className="flex space-x-2 ml-4">
                <Button size="sm" variant="outline" onClick={onReject}>
                  Refuser
                </Button>
                <Button size="sm" onClick={onAccept}>
                  Accepter
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>🔒</span>
          <span>Protection de vos données personnelles</span>
          <Badge variant="secondary">RGPD</Badge>
        </CardTitle>
        <CardDescription>
          InvoiceComply respecte votre vie privée et protège vos données conformément au RGPD
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium">Hébergement en Union Européenne</h4>
              <p className="text-sm text-gray-600">
                Toutes vos données sont stockées exclusivement dans des centres de données certifiés en UE
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium">Chiffrement de bout en bout</h4>
              <p className="text-sm text-gray-600">
                Vos factures et données sensibles sont chiffrées en transit et au repos
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium">Conservation limitée</h4>
              <p className="text-sm text-gray-600">
                Conservation de 7 ans maximum conformément à la législation fiscale française
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium">Vos droits RGPD</h4>
              <p className="text-sm text-gray-600">
                Accès, rectification, suppression, portabilité de vos données à tout moment
              </p>
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium">Données collectées :</h4>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Informations d'entreprise (SIRET, raison sociale)</li>
              <li>• Email de contact pour l'authentification</li>
              <li>• Factures téléchargées pour traitement</li>
              <li>• Journaux d'audit pour la conformité</li>
            </ul>

            <h4 className="font-medium mt-4">Finalités du traitement :</h4>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Conversion et validation de vos factures</li>
              <li>• Transmission vers les plateformes certifiées</li>
              <li>• Respect des obligations légales</li>
              <li>• Support technique et amélioration du service</li>
            </ul>

            <p className="text-xs text-gray-500 mt-4">
              Contact DPO : dpo@invoicecomply.fr
            </p>
          </div>
        )}

        <div className="flex flex-col space-y-3">
          <Button
            variant="link"
            className="text-sm self-start p-0"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Masquer les détails' : 'Voir les détails'}
          </Button>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={onReject}>
              Je refuse
            </Button>
            <Button onClick={onAccept}>
              J'accepte le traitement de mes données
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            En continuant, vous acceptez notre{' '}
            <a href="/legal/privacy" className="text-blue-600 hover:underline">
              Politique de confidentialité
            </a>
            {' '}et nos{' '}
            <a href="/legal/terms" className="text-blue-600 hover:underline">
              Conditions d'utilisation
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}