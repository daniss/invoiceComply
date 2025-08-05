/**
 * French business constants and configuration
 */

export const FRENCH_VAT_RATES = {
  STANDARD: 20,
  REDUCED_1: 10,
  REDUCED_2: 5.5,
  REDUCED_3: 2.1,
  EXEMPT: 0,
} as const

export const SUBSCRIPTION_TIERS = {
  STARTER: {
    name: 'Starter',
    price: 29,
    currency: 'EUR',
    invoiceLimit: 50,
    features: [
      'Conversion PDF vers Factur-X',
      'Transmission Chorus Pro',
      'Vérification de conformité',
      'Support email'
    ]
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 79,
    currency: 'EUR',
    invoiceLimit: 500,
    features: [
      'Conversion PDF vers Factur-X',
      'Transmission Chorus Pro',
      'Vérification de conformité',
      'Traitement en lot',
      'Intégration comptabilité',
      'Support prioritaire'
    ]
  },
  BUSINESS: {
    name: 'Business',
    price: 149,
    currency: 'EUR',
    invoiceLimit: -1, // Unlimited
    features: [
      'Conversion PDF vers Factur-X',
      'Transmission Chorus Pro',
      'Vérification de conformité',
      'Traitement en lot',
      'Intégration comptabilité',
      'PDP partenaires',
      'API dédiée',
      'Support téléphonique'
    ]
  }
} as const

export const SETUP_FEE = 199 // EUR

export const FRENCH_LEGAL_ENTITIES = [
  'SARL',
  'SAS',
  'SASU',
  'EURL',
  'SA',
  'SCA',
  'SNC',
  'SCS',
  'EARL',
  'GAEC',
  'GIE',
  'EI',
  'MICRO',
  'AUTO-ENTREPRENEUR'
] as const

export const PAYMENT_TERMS = {
  B2B_MAX_DAYS: 60,
  B2G_MAX_DAYS: 30,
} as const

export const INVOICE_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  CONVERTED: 'converted',
  TRANSMITTED: 'transmitted',
  FAILED: 'failed',
} as const

export const TRANSMISSION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
} as const

export const PDP_PROVIDERS = {
  CHORUS_PRO: 'chorus_pro',
  PARTNER: 'partner',
} as const

export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const FACTUR_X_PROFILES = {
  MINIMUM: 'MINIMUM',
  BASIC_WL: 'BASIC WL',
  BASIC: 'BASIC',
  EN16931: 'EN16931',
  EXTENDED: 'EXTENDED',
} as const

export const COMPLIANCE_DEADLINES = {
  LARGE_COMPANIES: new Date('2026-09-01'),
  SMES: new Date('2027-09-01'),
} as const

export const GDPR_RETENTION_PERIOD = 7 * 365 * 24 * 60 * 60 * 1000 // 7 years in milliseconds

export const FRENCH_REGIONS = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Hauts-de-France',
  'Île-de-France',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  'Provence-Alpes-Côte d\'Azur',
  'Guadeloupe',
  'Martinique',
  'Guyane',
  'La Réunion',
  'Mayotte'
] as const

export const BUSINESS_SECTORS = [
  'Agriculture',
  'Construction',
  'Commerce de gros',
  'Commerce de détail',
  'Transport et logistique',
  'Hébergement et restauration',
  'Information et communication',
  'Activités financières',
  'Activités immobilières',
  'Services professionnels',
  'Services administratifs',
  'Administration publique',
  'Enseignement',
  'Santé et social',
  'Arts et spectacles',
  'Autres services',
] as const