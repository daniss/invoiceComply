import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/manual-invoices/templates/[id] - Get specific template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: template, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Template non trouvé' },
          { status: 404 }
        )
      }
      
      console.error('Error fetching template:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération du template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    console.error('Template fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST /api/manual-invoices/templates/[id] - Use template (increment usage)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Increment usage count
    const { data: template, error } = await supabase
      .from('invoice_templates')
      .update({ 
        usage_count: supabase.sql`usage_count + 1` 
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Template non trouvé' },
          { status: 404 }
        )
      }
      
      console.error('Error updating template usage:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour du template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Template utilisé avec succès',
      template
    })

  } catch (error) {
    console.error('Template usage error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE /api/manual-invoices/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if template exists and belongs to user
    const { data: existingTemplate } = await supabase
      .from('invoice_templates')
      .select('is_default')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template non trouvé' },
        { status: 404 }
      )
    }

    // Prevent deletion of default templates
    if (existingTemplate.is_default) {
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer un template par défaut' },
        { status: 400 }
      )
    }

    // Delete template
    const { error } = await supabase
      .from('invoice_templates')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression du template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Template supprimé avec succès'
    })

  } catch (error) {
    console.error('Template delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}