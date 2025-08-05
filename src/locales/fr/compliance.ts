export const compliance = {
  // Main compliance messages
  title: 'Conformité e-Facture 2026',
  subtitle: 'Préparez votre entreprise à la facturation électronique obligatoire',
  deadline: 'Échéance : 1er septembre 2026 pour les grandes entreprises, 1er septembre 2027 pour les PME',
  
  // Regulation information
  regulationTitle: 'Réglementation française',
  regulationDescription: 'Toutes les entreprises françaises assujetties à la TVA devront émettre des factures électroniques structurées',
  requiredFormats: 'Formats requis : Factur-X, UBL ou CII',
  transmissionRequired: 'Transmission obligatoire via une plateforme certifiée (PDP)',
  
  // Compliance checker
  checkerTitle: 'Vérification de conformité',
  checkerDescription: 'Vérifiez si votre facture respecte les exigences réglementaires',
  validationRules: 'Règles de validation',
  mandatoryFieldsCheck: 'Vérification des champs obligatoires',
  formatValidation: 'Validation du format',
  vatValidation: 'Validation de la TVA',
  
  // Required fields
  requiredFieldsTitle: 'Champs obligatoires',
  supplierSiret: 'SIRET du fournisseur',
  buyerSiret: 'SIRET de l\'acheteur',
  invoiceNumber: 'Numéro de facture (séquentiel)',
  invoiceDate: 'Date de facture',
  vatBreakdown: 'Détail de la TVA',
  totalAmountExcludingVat: 'Montant total HT',
  totalAmountIncludingVat: 'Montant total TTC',
  paymentTerms: 'Conditions de paiement',
  
  // VAT rates
  vatRatesTitle: 'Taux de TVA français',
  standardRate: 'Taux normal : 20%',
  reducedRates: 'Taux réduits : 10%, 5.5%, 2.1%',
  exemptRate: 'Exonéré : 0%',
  
  // Errors and warnings
  errors: {
    invalidSiret: 'Numéro SIRET invalide (doit contenir 14 chiffres)',
    invalidVatNumber: 'Numéro de TVA invalide (format FR + 11 chiffres)',
    missingMandatoryField: 'Champ obligatoire manquant',
    invalidVatRate: 'Taux de TVA invalide',
    invalidDate: 'Format de date invalide (DD/MM/YYYY)',
    invalidAmount: 'Montant invalide',
    sequentialNumber: 'Le numéro de facture doit être séquentiel',
    paymentTermsExceeded: 'Délai de paiement dépassé (60 jours B2B, 30 jours B2G)',
  },
  
  // Success messages
  success: {
    compliantInvoice: 'Facture conforme aux exigences réglementaires',
    validationPassed: 'Validation réussie',
    readyForTransmission: 'Prêt pour la transmission',
  },
  
  // PDP Integration
  pdpTitle: 'Plateformes de Dématérialisation Partenaires (PDP)',
  chorusProTitle: 'Chorus Pro',
  chorusProDescription: 'Plateforme officielle du gouvernement français',
  partnerPdpTitle: 'PDP Partenaires',
  partnerPdpDescription: 'Plateformes certifiées par l\'administration fiscale',
  
  // Transmission status
  transmissionTitle: 'État de transmission',
  transmitted: 'Transmis',
  transmissionPending: 'Transmission en attente',
  transmissionFailed: 'Échec de transmission',
  confirmed: 'Confirmé par la PDP',
  
  // Audit trail
  auditTitle: 'Piste d\'audit',
  auditDescription: 'Traçabilité complète pour les autorités fiscales',
  auditRequired: 'Conservation obligatoire pendant 7 ans',
}