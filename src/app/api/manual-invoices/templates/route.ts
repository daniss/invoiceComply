import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Template data schema
const templateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom doit faire moins de 100 caractères'),
  description: z.string().optional(),
  category: z.enum(['service', 'product', 'consulting', 'other']).default('other'),
  templateData: z.object({
    lineItems: z.array(z.object({
      id: z.string(),
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      vatRate: z.number(),
    })).optional(),
    paymentTerms: z.number().optional(),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
  })
})

// GET /api/manual-invoices/templates - Get user's templates
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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Build query
    let query = supabase
      .from('invoice_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false })

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      templates: templates || []
    })

  } catch (error) {
    console.error('Templates fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST /api/manual-invoices/templates - Create new template
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
    
    // Validate template data
    const validatedData = templateSchema.parse(body)

    // Check for duplicate template names
    const { data: existingTemplate } = await supabase
      .from('invoice_templates')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', validatedData.name)
      .single()

    if (existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Un template avec ce nom existe déjà' },
        { status: 400 }
      )
    }

    // Create template
    const { data: template, error } = await supabase
      .from('invoice_templates')
      .insert({
        user_id: user.id,
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category,
        template_data: validatedData.templateData,
        is_default: false,
        usage_count: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création du template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Template créé avec succès',
      template
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Template create error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}