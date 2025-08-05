import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateSiret, validateFrenchVat } from '@/lib/validations/french-business'
import { z } from 'zod'

const companySettingsSchema = z.object({
  companyName: z.string().min(1, 'Raison sociale requise'),
  siret: z.string().refine(validateSiret, 'SIRET invalide (14 chiffres requis)'),
  vatNumber: z.string().refine(validateFrenchVat, 'Numéro TVA français invalide (FRxxxxxxxxx)'),
  legalForm: z.enum(['SARL', 'SAS', 'EURL', 'SA', 'SNC', 'Auto-entrepreneur']),
  address: z.string().min(1, 'Adresse requise'),
  postalCode: z.string().regex(/^\d{5}$/, 'Code postal français invalide'),
  city: z.string().min(1, 'Ville requise'),
  contactEmail: z.string().email('Email invalide'),
  contactPhone: z.string().regex(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/, 'Numéro français invalide'),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().max(500, 'Description trop longue').optional(),
  logoUrl: z.string().url().optional().or(z.literal(''))
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Get company settings
    const { data: companySettings, error: dbError } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (dbError && dbError.code !== 'PGRST116') { // Not found is OK
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Erreur de base de données' }, { status: 500 })
    }

    // If no settings exist, return default structure
    if (!companySettings) {
      return NextResponse.json({
        success: true,
        companySettings: {
          companyName: '',
          siret: '',
          vatNumber: '',
          legalForm: 'SARL',
          address: '',
          postalCode: '',
          city: '',
          contactEmail: user.email || '',
          contactPhone: '',
          website: '',
          description: '',
          logoUrl: '',
          isComplete: false,
          lastUpdated: null
        }
      })
    }

    // Check if settings are complete
    const requiredFields = ['companyName', 'siret', 'vatNumber', 'address', 'postalCode', 'city', 'contactEmail', 'contactPhone']
    const isComplete = requiredFields.every(field => companySettings[field])

    return NextResponse.json({
      success: true,
      companySettings: {
        ...companySettings,
        isComplete,
        lastUpdated: companySettings.updated_at
      }
    })

  } catch (error) {
    console.error('Company settings fetch error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const validation = companySettingsSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Données invalides',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 })
    }

    const settingsData = validation.data

    // Check if SIRET is already used by another user
    const { data: existingSiret, error: siretError } = await supabase
      .from('company_settings')
      .select('user_id')
      .eq('siret', settingsData.siret)
      .neq('user_id', user.id)
      .single()

    if (siretError && siretError.code !== 'PGRST116') {
      console.error('SIRET check error:', siretError)
      return NextResponse.json({ error: 'Erreur de vérification SIRET' }, { status: 500 })
    }

    if (existingSiret) {
      return NextResponse.json({ 
        error: 'Ce SIRET est déjà utilisé par un autre compte' 
      }, { status: 400 })
    }

    // Upsert company settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('company_settings')
      .upsert({
        user_id: user.id,
        ...settingsData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 })
    }

    // Update user profile with company info
    await supabase.auth.updateUser({
      data: {
        company_name: settingsData.companyName,
        siret: settingsData.siret
      }
    })

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'company_settings_updated',
        details: {
          companyName: settingsData.companyName,
          siret: settingsData.siret,
          legalForm: settingsData.legalForm
        }
      })

    return NextResponse.json({
      success: true,
      companySettings: updatedSettings,
      message: 'Paramètres de l\'entreprise mis à jour avec succès'
    })

  } catch (error) {
    console.error('Company settings update error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate only provided fields
    const allowedFields = [
      'companyName', 'siret', 'vatNumber', 'legalForm', 'address', 
      'postalCode', 'city', 'contactEmail', 'contactPhone', 
      'website', 'description', 'logoUrl'
    ]

    const updateData: any = {}
    
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        // Validate specific fields
        if (key === 'siret' && value && !validateSiret(value as string)) {
          return NextResponse.json({ 
            error: 'SIRET invalide (14 chiffres requis)' 
          }, { status: 400 })
        }
        
        if (key === 'vatNumber' && value && !validateFrenchVat(value as string)) {
          return NextResponse.json({ 
            error: 'Numéro TVA français invalide (FRxxxxxxxxx)' 
          }, { status: 400 })
        }
        
        if (key === 'contactEmail' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string)) {
          return NextResponse.json({ 
            error: 'Email invalide' 
          }, { status: 400 })
        }

        updateData[key] = value
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: 'Aucun champ valide à mettre à jour' 
      }, { status: 400 })
    }

    updateData.updated_at = new Date().toISOString()

    // Update company settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('company_settings')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Partial update error:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'company_settings_partial_update',
        details: {
          updatedFields: Object.keys(updateData),
          ...updateData
        }
      })

    return NextResponse.json({
      success: true,
      companySettings: updatedSettings,
      message: 'Paramètres mis à jour avec succès'
    })

  } catch (error) {
    console.error('Company settings partial update error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour partielle' },
      { status: 500 }
    )
  }
}