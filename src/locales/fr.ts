/**
 * French localization strings
 */

export const fr = {
  // Common UI elements
  common: {
    loading: 'Chargement...',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    confirm: 'Confirmer',
    error: 'Erreur',
    success: 'Succès',
    warning: 'Attention',
    info: 'Information',
    next: 'Suivant',
    previous: 'Précédent',
    finish: 'Terminer',
    retry: 'Réessayer',
    upload: 'Télécharger',
    download: 'Télécharger',
    preview: 'Aperçu',
    search: 'Rechercher',
    filter: 'Filtrer',
    sort: 'Trier',
    selectFile: 'Sélectionner un fichier',
    dragAndDrop: 'Glissez-déposez vos fichiers ici ou cliquez pour sélectionner',
    fileTooLarge: 'Fichier trop volumineux',
    invalidFileFormat: 'Format de fichier non supporté',
    optional: 'Optionnel',
    required: 'Obligatoire'
  },

  // Navigation
  nav: {
    home: 'Accueil',
    dashboard: 'Tableau de bord',
    invoices: 'Factures',
    process: 'Traitement',
    transmissions: 'Transmissions',
    analytics: 'Analytiques',
    settings: 'Paramètres',
    help: 'Aide',
    contact: 'Contact',
    login: 'Connexion',
    signup: 'Inscription',
    logout: 'Déconnexion'
  },

  // Authentication
  auth: {
    signIn: 'Se connecter',
    signUp: 'Créer un compte',
    signOut: 'Se déconnecter',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    forgotPassword: 'Mot de passe oublié ?',
    resetPassword: 'Réinitialiser le mot de passe',
    emailPlaceholder: 'votre@email.fr',
    passwordPlaceholder: 'Votre mot de passe',
    signInSuccess: 'Connexion réussie',
    signUpSuccess: 'Compte créé avec succès',
    invalidCredentials: 'Identifiants invalides',
    emailRequired: 'L\'adresse e-mail est requise',
    passwordRequired: 'Le mot de passe est requis',
    passwordTooShort: 'Le mot de passe doit contenir au moins 8 caractères',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    accountExists: 'Un compte existe déjà avec cette adresse e-mail',
    checkEmail: 'Vérifiez votre boîte e-mail pour confirmer votre compte'
  },

  // Business information
  business: {
    companyName: 'Nom de l\'entreprise',
    siret: 'SIRET',
    siren: 'SIREN',
    vatNumber: 'Numéro de TVA',
    address: 'Adresse',
    postalCode: 'Code postal',
    city: 'Ville',
    country: 'Pays',
    phone: 'Téléphone',
    website: 'Site web',
    legalEntity: 'Forme juridique',
    registrationNumber: 'Numéro d\'immatriculation',
    sector: 'Secteur d\'activité'
  },

  // Invoice fields
  invoice: {
    number: 'Numéro de facture',
    date: 'Date de facture',
    dueDate: 'Date d\'échéance',
    supplier: 'Fournisseur',
    customer: 'Client',
    description: 'Description',
    quantity: 'Quantité',
    unitPrice: 'Prix unitaire',
    totalHT: 'Total HT',
    vatRate: 'Taux de TVA',
    vatAmount: 'Montant TVA',
    totalTTC: 'Total TTC',
    currency: 'Devise',
    paymentTerms: 'Conditions de paiement',
    paymentMethod: 'Mode de paiement',
    notes: 'Notes',
    status: 'Statut',
    created: 'Créée',
    processed: 'Traitée',
    sent: 'Envoyée',
    paid: 'Payée',
    cancelled: 'Annulée'
  },

  // Processing workflow
  processing: {
    upload: 'Téléchargement',
    extract: 'Extraction',
    validate: 'Validation',
    preview: 'Aperçu',
    transmit: 'Transmission',
    complete: 'Terminé',
    uploadPdf: 'Télécharger un PDF',
    extractData: 'Extraire les données',
    validateData: 'Valider les données',
    previewInvoice: 'Aperçu de la facture',
    transmitInvoice: 'Transmettre la facture',
    processingComplete: 'Traitement terminé',
    extractionFailed: 'Échec de l\'extraction',
    validationFailed: 'Échec de la validation',
    transmissionFailed: 'Échec de la transmission'
  },

  // Compliance
  compliance: {
    compliant: 'Conforme',
    nonCompliant: 'Non conforme',
    partiallyCompliant: 'Partiellement conforme',
    score: 'Score de conformité',
    legal: 'Exigences légales',
    format: 'Format des données',
    business: 'Règles métier',
    technical: 'Aspects techniques',
    issues: 'Problèmes détectés',
    recommendations: 'Recommandations',
    criticalIssue: 'Problème critique',
    warning: 'Avertissement',
    passed: 'Réussi',
    failed: 'Échec'
  },

  // Transmission
  transmission: {
    chorusPro: 'Chorus Pro',
    peppol: 'PEPPOL',
    email: 'E-mail',
    status: 'Statut',
    pending: 'En attente',
    sent: 'Envoyée',
    delivered: 'Livrée',
    acknowledged: 'Accusé de réception',
    failed: 'Échec',
    retrying: 'Nouvelle tentative',
    recipient: 'Destinataire',
    transmissionId: 'ID de transmission',
    sentAt: 'Envoyée le',
    deliveredAt: 'Livrée le'
  },

  // Errors and validation
  validation: {
    invalidSiret: 'SIRET invalide',
    invalidSiren: 'SIREN invalide',
    invalidVat: 'Numéro de TVA invalide',
    invalidDate: 'Date invalide',
    invalidAmount: 'Montant invalide',
    invalidEmail: 'Adresse e-mail invalide',
    fieldRequired: 'Ce champ est obligatoire',
    fieldTooShort: 'Ce champ est trop court',
    fieldTooLong: 'Ce champ est trop long',
    invalidFormat: 'Format invalide'
  },

  // Dashboard
  dashboard: {
    overview: 'Vue d\'ensemble',
    totalInvoices: 'Total factures',
    complianceRate: 'Taux de conformité',
    transmissions: 'Transmissions',
    averageTime: 'Temps moyen',
    recentActivity: 'Activité récente',
    quickActions: 'Actions rapides',
    processInvoice: 'Traiter une facture',
    viewReports: 'Voir les rapports',
    manageRecipients: 'Gérer les destinataires',
    noActivity: 'Aucune activité récente'
  },

  // Reports and analytics
  reports: {
    complianceReport: 'Rapport de conformité',
    transmissionReport: 'Rapport de transmission',
    performanceReport: 'Rapport de performance',
    exportPdf: 'Exporter en PDF',
    exportExcel: 'Exporter en Excel',
    dateRange: 'Période',
    from: 'Du',
    to: 'Au',
    generateReport: 'Générer le rapport',
    noData: 'Aucune donnée disponible pour cette période'
  },

  // Settings
  settings: {
    general: 'Général',
    company: 'Entreprise',
    users: 'Utilisateurs',
    integrations: 'Intégrations',
    security: 'Sécurité',
    billing: 'Facturation',
    notifications: 'Notifications',
    apiKeys: 'Clés API',
    chorusProConfig: 'Configuration Chorus Pro',
    peppolConfig: 'Configuration PEPPOL',
    emailConfig: 'Configuration e-mail'
  },

  // GDPR and legal
  gdpr: {
    dataExport: 'Export de données',
    dataDelete: 'Suppression de données',
    consent: 'Consentement',
    privacy: 'Confidentialité',
    terms: 'Conditions d\'utilisation',
    cookiePolicy: 'Politique de cookies',
    dataRetention: 'Conservation des données',
    contactDpo: 'Contacter le DPO',
    yourRights: 'Vos droits',
    requestData: 'Demander mes données',
    deleteAccount: 'Supprimer mon compte'
  },

  // Success messages
  success: {
    invoiceProcessed: 'Facture traitée avec succès',
    invoiceTransmitted: 'Facture transmise avec succès',
    settingsSaved: 'Paramètres enregistrés',
    accountCreated: 'Compte créé avec succès',
    passwordChanged: 'Mot de passe modifié',
    dataExported: 'Données exportées avec succès',
    emailSent: 'E-mail envoyé'
  },

  // Error messages
  error: {
    generic: 'Une erreur est survenue',
    networkError: 'Erreur de réseau',
    serverError: 'Erreur serveur',
    invalidFile: 'Fichier invalide',
    fileTooBig: 'Fichier trop volumineux',
    processingFailed: 'Échec du traitement',
    transmissionFailed: 'Échec de la transmission',
    authenticationFailed: 'Échec de l\'authentification',
    permissionDenied: 'Permission refusée',
    notFound: 'Élément non trouvé',
    alreadyExists: 'Élément déjà existant'
  }
}

export type LocaleKey = keyof typeof fr
export type LocaleSubKey<T extends LocaleKey> = keyof typeof fr[T]

// Helper function to get nested translation
export function t<T extends LocaleKey>(
  key: T,
  subKey?: LocaleSubKey<T>
): string {
  if (subKey) {
    return (fr[key] as any)[subKey] || `${key}.${subKey}`
  }
  return fr[key] as any || key
}