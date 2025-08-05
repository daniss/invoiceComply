/**
 * GDPR-compliant data retention utilities
 */

import { createClient } from '@/lib/supabase/server'
import { GDPR_RETENTION_PERIOD } from '@/constants/french-business'

export interface DataRetentionPolicy {
  table: string
  retentionPeriod: number // in milliseconds
  archiveStrategy: 'delete' | 'anonymize' | 'archive'
  requiredFields?: string[]
}

const dataRetentionPolicies: DataRetentionPolicy[] = [
  {
    table: 'audit_logs',
    retentionPeriod: GDPR_RETENTION_PERIOD,
    archiveStrategy: 'delete',
  },
  {
    table: 'invoices',
    retentionPeriod: GDPR_RETENTION_PERIOD,
    archiveStrategy: 'archive',
    requiredFields: ['invoice_number', 'invoice_date', 'total_amount_including_vat'],
  },
  {
    table: 'file_uploads',
    retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
    archiveStrategy: 'delete',
  },
]

export async function enforceDataRetention() {
  const supabase = await createClient()
  const results = []

  for (const policy of dataRetentionPolicies) {
    try {
      const cutoffDate = new Date(Date.now() - policy.retentionPeriod)
      
      switch (policy.archiveStrategy) {
        case 'delete':
          const { error: deleteError } = await supabase
            .from(policy.table)
            .delete()
            .lt('created_at', cutoffDate.toISOString())

          if (deleteError) throw deleteError
          results.push({ table: policy.table, action: 'deleted', cutoffDate })
          break

        case 'anonymize':
          // Anonymize personal data while keeping statistical data
          const { error: anonymizeError } = await supabase
            .from(policy.table)
            .update({ 
              email: '[anonymized]',
              company_name: '[anonymized]',
              siret: '[anonymized]',
            })
            .lt('created_at', cutoffDate.toISOString())

          if (anonymizeError) throw anonymizeError
          results.push({ table: policy.table, action: 'anonymized', cutoffDate })
          break

        case 'archive':
          // Mark as archived instead of deleting (for legal compliance)
          const { error: archiveError } = await supabase
            .from(policy.table)
            .update({ 
              metadata: { archived: true, archived_at: new Date().toISOString() }
            })
            .lt('created_at', cutoffDate.toISOString())
            .is('metadata->archived', null)

          if (archiveError) throw archiveError
          results.push({ table: policy.table, action: 'archived', cutoffDate })
          break
      }
    } catch (error) {
      console.error(`Error enforcing retention policy for ${policy.table}:`, error)
      results.push({ table: policy.table, action: 'error', error: error.message })
    }
  }

  return results
}

export async function getUserDataExport(userId: string) {
  const supabase = await createClient()
  
  try {
    // Collect all user data
    const [userProfile, invoices, auditLogs, subscriptions] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('invoices').select('*').eq('user_id', userId),
      supabase.from('audit_logs').select('*').eq('user_id', userId),
      supabase.from('subscriptions').select('*').eq('user_id', userId),
    ])

    return {
      exportDate: new Date().toISOString(),
      userId,
      profile: userProfile.data,
      invoices: invoices.data || [],
      auditLogs: auditLogs.data || [],
      subscriptions: subscriptions.data || [],
    }
  } catch (error) {
    console.error('Error exporting user data:', error)
    throw new Error('Unable to export user data')
  }
}

export async function deleteUserData(userId: string, keepFinancialRecords: boolean = true) {
  const supabase = await createClient()
  
  try {
    if (keepFinancialRecords) {
      // Anonymize user data but keep financial records for legal compliance
      await supabase
        .from('users')
        .update({
          email: '[deleted-user]',
          company_name: '[deleted]',
          siret: null,
          legal_entity: null,
          business_sector: null,
          address: null,
        })
        .eq('id', userId)

      // Mark invoices as belonging to deleted user
      await supabase
        .from('invoices')
        .update({
          metadata: { user_deleted: true, deleted_at: new Date().toISOString() }
        })
        .eq('user_id', userId)
    } else {
      // Complete deletion (only when legally permitted)
      await supabase.from('users').delete().eq('id', userId)
      // Invoices will be cascade deleted due to foreign key constraint
    }

    return { success: true, strategy: keepFinancialRecords ? 'anonymized' : 'deleted' }
  } catch (error) {
    console.error('Error deleting user data:', error)
    throw new Error('Unable to delete user data')
  }
}

export function getDataRetentionInfo() {
  return {
    retentionPeriod: '7 années',
    legalBasis: 'Article 289 du Code général des impôts',
    dataTypes: [
      'Factures et documents fiscaux',
      'Journaux d\'audit',
      'Données de transmission',
      'Vérifications de conformité',
    ],
    contactEmail: process.env.GDPR_CONTACT_EMAIL || 'dpo@invoicecomply.fr',
  }
}