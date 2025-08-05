import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Draft form data schema
const draftFormSchema = z.object({
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  issuer: z.object({
    companyName: z.string().optional(),
    address: z.string().optional(),
    siret: z.string().optional(),
    vatNumber: z.string().optional(),
    iban: z.string().optional(),
  }).optional(),
  customer: z.object({
    companyName: z.string().optional(),
    address: z.string().optional(),
    vatNumber: z.string().optional(),
    siret: z.string().optional(),
  }).optional(),
  lineItems: z.array(z.object({
    id: z.string(),
    description: z.string().optional(),
    quantity: z.number().optional(),
    unitPrice: z.number().optional(),
    vatRate: z.number().optional(),
  })).optional(),
  notes: z.string().optional(),
  paymentTerms: z.number().optional(),
  paymentMethod: z.string().optional(),
})

// GET /api/manual-invoices/drafts - Get user's draft
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Get user's draft (only one per user)
    const { data: draft, error } = await supabase
      .from('invoice_drafts')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching draft:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération du brouillon' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      draft: draft || null
    })

  } catch (error) {
    console.error('Draft fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST /api/manual-invoices/drafts - Save/update draft
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate form data
    const validatedData = draftFormSchema.parse(body.formData)

    // Upsert draft (update if exists, insert if not)
    const { data: draft, error } = await supabase
      .from('invoice_drafts')
      .upsert({
        user_id: user.id,
        form_data: validatedData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving draft:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la sauvegarde du brouillon' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Brouillon sauvegardé avec succès',
      draft
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Draft save error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE /api/manual-invoices/drafts - Delete draft
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Delete user's draft
    const { error } = await supabase
      .from('invoice_drafts')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting draft:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression du brouillon' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Brouillon supprimé avec succès'
    })

  } catch (error) {
    console.error('Draft delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}