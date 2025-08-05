import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const InvoiceListParamsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  status: z.string().optional(),
  search: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams.entries())
    const { page, limit, status, search } = InvoiceListParamsSchema.parse(searchParams)

    // Build query
    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,supplier_name.ilike.%${search}%`)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: invoices, error, count } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des factures' },
        { status: 500 }
      )
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      success: true,
      invoices: invoices || [],
      pagination: {
        page,
        limit,
        totalItems: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}