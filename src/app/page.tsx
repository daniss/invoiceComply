import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fr } from '@/locales/fr'
import { 
  CheckCircle, 
  Star, 
  Clock, 
  Shield, 
  Zap, 
  FileText, 
  Building2, 
  TrendingUp,
  Users,
  Award,
  ArrowRight,
  Play,
  FileOutput,
  Send,
  Search,
  Package,
  FileSearch,
  Lock,
  Euro,
  Phone,
  Mail
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Euro className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  InvoiceComply
                </h1>
                <Badge variant="outline" className="text-xs">Conforme 2026</Badge>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/contact" className="text-gray-600 hover:text-gray-900 transition-colors">
                Contact
              </Link>
              <Link href="/legal/privacy" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sécurité
              </Link>
              <Link href="/auth" className="text-gray-600 hover:text-gray-900 transition-colors">
                Connexion
              </Link>
              <Link href="/auth">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Essai gratuit
                </Button>
              </Link>
            </div>
            <div className="md:hidden">
              <Button variant="outline" size="sm">Menu</Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-300"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-700"></div>
        </div>

        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center max-w-6xl mx-auto mb-20">
            {/* Trust indicators */}
            <div className="flex justify-center items-center space-x-6 mb-8">
              <Badge variant="outline" className="flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>RGPD Conforme</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Award className="w-3 h-3" />
                <span>Certifié FR</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>Factur-X</span>
              </Badge>
            </div>

            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                Facturation électronique
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                simplifiée
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transformez vos factures PDF en format Factur-X conforme et transmettez-les 
              automatiquement via Chorus Pro. Prêt pour 2026.
            </p>

            {/* Deadline warning - modern style */}
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 rounded-2xl blur opacity-20"></div>
              <div className="relative bg-white border border-orange-200 rounded-2xl p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center space-x-3">
                  <Clock className="w-6 h-6 text-orange-600" />
                  <p className="text-orange-800 font-semibold text-lg">
                    Obligation légale dès septembre 2026 pour toutes les entreprises françaises
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth">
                <Button size="lg" className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <Zap className="w-5 h-5 mr-2" />
                  Commencer gratuitement
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4 group">
                <Play className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                Voir la démo
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Déjà adopté par 500+ entreprises</span>
              </div>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-2">4.9/5 (127 avis)</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                Fonctionnalités puissantes
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour être conforme à la réglementation française
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileOutput className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold">
                  Conversion PDF vers Factur-X
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">
                  Convertissez vos factures PDF existantes au format Factur-X conforme 
                  avec mappage automatique des champs obligatoires.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold">
                  Intégration Chorus Pro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">
                  Transmission directe vers la plateforme officielle du gouvernement 
                  français avec suivi en temps réel.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold">
                  Vérification de conformité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">
                  Validation automatique de tous les champs obligatoires et 
                  des règles fiscales françaises.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold">
                  Traitement en lot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">
                  Importez et traitez plusieurs factures simultanément avec 
                  compatibilité CSV et logiciels comptables.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileSearch className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold">
                  Piste d'audit complète
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">
                  Traçabilité complète de toutes les transmissions pour 
                  les autorités fiscales (conservation 7 ans).
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold">
                  Conformité RGPD
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">
                  Hébergement en Union Européenne, chiffrement des données 
                  et respect de la réglementation française.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                Tarifs transparents
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choisissez le plan qui correspond à vos besoins. Essai gratuit de 14 jours.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold">Starter</CardTitle>
                <CardDescription className="text-gray-600">Parfait pour débuter</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">29€</span>
                  <span className="text-gray-500">/mois</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>50 factures/mois</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Conversion Factur-X</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Transmission Chorus Pro</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Support email</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline">
                  Commencer
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-xl relative scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1">
                  ⭐ Recommandé
                </Badge>
              </div>
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold">Professional</CardTitle>
                <CardDescription className="text-gray-600">Idéal pour les PME</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">79€</span>
                  <span className="text-gray-500">/mois</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>500 factures/mois</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Traitement en lot</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Intégration comptabilité</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Support prioritaire</span>
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Commencer
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold">Business</CardTitle>
                <CardDescription className="text-gray-600">Pour les grandes entreprises</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">149€</span>
                  <span className="text-gray-500">/mois</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Factures illimitées</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>API dédiée</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>PDP partenaires</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Support téléphonique</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline">
                  Nous contacter
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-900 via-purple-900 to-blue-900">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Prêt pour la conformité 2026 ?
            </h2>
            <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
              Ne attendez pas la dernière minute. Commencez dès maintenant et 
              assurez-vous d'être conforme avant l'obligation légale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth">
                <Button size="lg" className="bg-white text-blue-900 hover:bg-gray-100 px-8 py-4 text-lg font-semibold">
                  <Zap className="w-5 h-5 mr-2" />
                  Démarrer l'essai gratuit
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4 text-lg">
                  Parler à un expert
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Euro className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">InvoiceComply</h3>
              </div>
              <p className="text-gray-400 mb-4">
                La solution française pour la facturation électronique conforme.
              </p>
              <div className="flex space-x-4">
                <Badge variant="outline" className="text-gray-400 border-gray-400">
                  Certifié France
                </Badge>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/auth" className="hover:text-white transition-colors">Fonctionnalités</Link></li>
                <li><Link href="/auth" className="hover:text-white transition-colors">Tarifs</Link></li>
                <li><Link href="/auth" className="hover:text-white transition-colors">Sécurité</Link></li>
                <li><Link href="/auth" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Ressources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/contact" className="hover:text-white transition-colors">Support</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Formation</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/legal/privacy" className="hover:text-white transition-colors">Confidentialité</Link></li>
                <li><Link href="/legal/terms" className="hover:text-white transition-colors">CGU</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">RGPD</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 mb-4 md:mb-0">
              © 2024 InvoiceComply. Tous droits réservés.
            </div>
            <div className="flex items-center space-x-4 text-gray-400">
              <span>Hébergé en France</span>
              <span>•</span>
              <span>Conforme RGPD</span>
              <span>•</span>
              <span>Support 24/7</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
