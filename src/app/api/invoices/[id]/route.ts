import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Facture non trouvée' },
          { status: 404 }
        )
      }
      
      console.error('Error fetching invoice:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération de la facture' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invoice
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // First check if invoice exists and belongs to user
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, file_path')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Facture non trouvée' },
          { status: 404 }
        )
      }
      
      console.error('Error fetching invoice for deletion:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération de la facture' },
        { status: 500 }
      )
    }

    // Delete the invoice
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting invoice:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression de la facture' },
        { status: 500 }
      )
    }

    // TODO: Also delete the file from storage if needed
    // if (invoice.file_path) {
    //   await supabase.storage.from('invoices').remove([invoice.file_path])
    // }

    return NextResponse.json({
      success: true,
      message: 'Facture supprimée avec succès'
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}