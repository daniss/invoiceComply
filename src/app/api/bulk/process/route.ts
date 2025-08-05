import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePdfInvoice } from '@/lib/pdf/parser'
import { validateCompliance } from '@/lib/compliance/validation-engine'
import { generateFacturXXML } from '@/lib/factur-x/xml-generator'
import { z } from 'zod'

const bulkProcessSchema = z.object({
  files: z.array(z.string()), // Array of file IDs or URLs
  template: z.enum(['sage', 'cegid', 'custom']).default('sage'),
  options: z.object({
    autoValidate: z.boolean().default(true),
    generateFacturX: z.boolean().default(true),
    autoTransmit: z.boolean().default(false)
  }).optional()
})

interface BulkProcessingJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalFiles: number
  processedFiles: number
  errors: string[]
  results: any[]
}

// In-memory job tracking (in production, use Redis or database)
const processingJobs = new Map<string, BulkProcessingJob>()

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const template = formData.get('template') as string || 'sage'
    const options = JSON.parse(formData.get('options') as string || '{}')

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Validate file types
    for (const file of files) {
      const validTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
      if (!validTypes.includes(file.type)) {
        return NextResponse.json({ 
          error: `Type de fichier non supporté: ${file.name}` 
        }, { status: 400 })
      }
    }

    // Create processing job
    const jobId = `bulk_${user.id}_${Date.now()}`
    const job: BulkProcessingJob = {
      id: jobId,
      status: 'pending',
      totalFiles: files.length,
      processedFiles: 0,
      errors: [],
      results: []
    }

    processingJobs.set(jobId, job)

    // Store job in database
    await supabase
      .from('bulk_processing_jobs')
      .insert({
        id: jobId,
        user_id: user.id,
        status: 'pending',
        total_files: files.length,
        template,
        options,
        created_at: new Date().toISOString()
      })

    // Start background processing
    processFilesInBackground(jobId, files, template, options, user.id, supabase)

    return NextResponse.json({
      success: true,
      jobId,
      status: 'pending',
      totalFiles: files.length,
      message: 'Traitement en lot démarré'
    })

  } catch (error) {
    console.error('Bulk processing error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du traitement en lot' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (jobId) {
      // Get specific job status
      const job = processingJobs.get(jobId)
      if (!job) {
        // Try to get from database
        const { data: dbJob, error: dbError } = await supabase
          .from('bulk_processing_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('user_id', user.id)
          .single()

        if (dbError || !dbJob) {
          return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          job: {
            id: dbJob.id,
            status: dbJob.status,
            totalFiles: dbJob.total_files,
            processedFiles: dbJob.processed_files || 0,
            errors: dbJob.errors || [],
            results: dbJob.results || []
          }
        })
      }

      return NextResponse.json({
        success: true,
        job
      })
    }

    // Get all jobs for user
    const { data: jobs, error: dbError } = await supabase
      .from('bulk_processing_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Erreur de base de données' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      jobs
    })

  } catch (error) {
    console.error('Bulk status error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    )
  }
}

async function processFilesInBackground(
  jobId: string, 
  files: File[], 
  template: string, 
  options: any, 
  userId: string, 
  supabase: any
) {
  const job = processingJobs.get(jobId)
  if (!job) return

  job.status = 'processing'
  
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      try {
        let result: any = {}

        if (file.type === 'application/pdf') {
          // Process PDF file
          const arrayBuffer = await file.arrayBuffer()
          const extractedData = await parsePdfInvoice(arrayBuffer, {
            extractText: true,
            extractMetadata: true,
            validateFields: true,
            language: 'fr'
          })

          if (options.autoValidate) {
            const compliance = validateCompliance(extractedData)
            result.compliance = compliance
          }

          if (options.generateFacturX) {
            const facturXml = generateFacturXXML(extractedData)
            result.facturXml = facturXml
          }

          result.extractedData = extractedData
          result.fileName = file.name
          result.status = 'completed'

          // Store in database
          await supabase
            .from('invoices')
            .insert({
              user_id: userId,
              invoice_number: extractedData.invoiceNumber,
              supplier_name: extractedData.supplierName,
              total_amount: extractedData.totalAmountIncludingVat,
              extracted_data: extractedData,
              status: 'processed',
              bulk_job_id: jobId
            })

        } else if (file.type.includes('csv') || file.type.includes('excel')) {
          // Process CSV/Excel file
          const text = await file.text()
          const rows = parseCSV(text, template)
          
          result.fileName = file.name
          result.status = 'completed'
          result.processedRows = rows.length
          result.rows = rows
        }

        job.results.push(result)
        
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError)
        job.errors.push(`Erreur fichier ${file.name}: ${fileError.message}`)
        job.results.push({
          fileName: file.name,
          status: 'failed',
          error: fileError.message
        })
      }

      job.processedFiles++
      
      // Update job status in database
      await supabase
        .from('bulk_processing_jobs')
        .update({
          status: 'processing',
          processed_files: job.processedFiles,
          errors: job.errors,
          results: job.results
        })
        .eq('id', jobId)
    }

    job.status = 'completed'
    
    // Final database update
    await supabase
      .from('bulk_processing_jobs')
      .update({
        status: 'completed',
        processed_files: job.processedFiles,
        errors: job.errors,
        results: job.results,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'bulk_processing_completed',
        details: {
          jobId,
          totalFiles: job.totalFiles,
          processedFiles: job.processedFiles,
          errorCount: job.errors.length
        }
      })

  } catch (error) {
    console.error('Background processing error:', error)
    job.status = 'failed'
    job.errors.push(`Erreur générale: ${error.message}`)
    
    await supabase
      .from('bulk_processing_jobs')
      .update({
        status: 'failed',
        errors: job.errors
      })
      .eq('id', jobId)
  }
}

function parseCSV(csvText: string, template: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    const row: any = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    // Map based on template
    if (template === 'sage') {
      rows.push(mapSageFormat(row))
    } else if (template === 'cegid') {
      rows.push(mapCegidFormat(row))
    } else {
      rows.push(row)
    }
  }

  return rows
}

function mapSageFormat(row: any): any {
  return {
    invoiceNumber: row['N° Facture'] || row['Invoice Number'] || '',
    supplierName: row['Fournisseur'] || row['Supplier'] || '',
    totalAmount: parseFloat(row['Montant TTC'] || row['Total Amount'] || '0'),
    invoiceDate: row['Date'] || row['Date Facture'] || ''
  }
}

function mapCegidFormat(row: any): any {
  return {
    invoiceNumber: row['NUMERO'] || row['NUM_FACTURE'] || '',
    supplierName: row['RAISON_SOCIALE'] || row['SUPPLIER_NAME'] || '',
    totalAmount: parseFloat(row['MONTANT_TTC'] || row['TOTAL'] || '0'),
    invoiceDate: row['DATE_FACTURE'] || row['DATE'] || ''
  }
}