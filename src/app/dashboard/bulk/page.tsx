'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Package, 
  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  FileText,
  Settings,
  Play,
  Pause,
  SkipForward,
  Database
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { bulkApi, handleApiError } from '@/lib/api/client'
import { usePolling } from '@/hooks/usePolling'
import { useToast } from '@/components/ui/toast'

interface BulkItem {
  id: string
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  invoiceNumber?: string
  amount?: string
  companyName?: string
  errorMessage?: string
  progress?: number
  file?: File
}

interface BulkJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalFiles: number
  processedFiles: number
  errors: string[]
  results: any[]
  created_at?: string
  completed_at?: string
}

interface ProcessingStats {
  total: number
  completed: number
  errors: number
  inProgress: number
}

export default function BulkPage() {
  const [uploadedFiles, setUploadedFiles] = useState<BulkItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentProcessing, setCurrentProcessing] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('sage')
  const [currentJob, setCurrentJob] = useState<BulkJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<BulkJob[]>([])
  
  const toast = useToast()

  const templates = [
    { id: 'sage', name: 'Sage Comptabilité', description: 'Format standard Sage' },
    { id: 'cegid', name: 'Cegid Expert', description: 'Format Cegid/EBP' },
    { id: 'custom', name: 'Personnalisé', description: 'Mapping manuel' }
  ]

  // Load previous jobs on mount
  useEffect(() => {
    loadPreviousJobs()
  }, [])

  // Poll current job status
  useEffect(() => {
    if (currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing')) {
      const interval = setInterval(() => {
        pollJobStatus(currentJob.id)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [currentJob])

  const loadPreviousJobs = async () => {
    try {
      const response = await bulkApi.getStatus()
      if (response.success && response.jobs) {
        setJobs(response.jobs.slice(0, 5)) // Show only last 5 jobs
      }
    } catch (error) {
      console.error('Error loading jobs:', error)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await bulkApi.getStatus(jobId)
      if (response.success && response.job) {
        const job = response.job
        setCurrentJob(job)
        
        // Update file statuses based on job results
        if (job.results && job.results.length > 0) {
          setUploadedFiles(prev => prev.map(file => {
            const result = job.results.find(r => r.fileName === file.fileName)
            if (result) {
              return {
                ...file,
                status: result.status === 'completed' ? 'completed' : result.status === 'failed' ? 'error' : file.status,
                invoiceNumber: result.extractedData?.invoiceNumber,
                amount: result.extractedData?.totalAmountIncludingVat ? `${result.extractedData.totalAmountIncludingVat} EUR` : undefined,
                companyName: result.extractedData?.supplierName,
                errorMessage: result.error,
                progress: result.status === 'completed' ? 100 : file.progress
              }
            }
            return file
          }))
        }
        
        if (job.status === 'completed' || job.status === 'failed') {
          setIsProcessing(false)
          setCurrentProcessing(null)
          
          // Show completion toast
          if (job.status === 'completed') {
            toast.success('Traitement terminé', `${job.processedFiles}/${job.totalFiles} fichiers traités avec succès`)
          } else {
            toast.error('Traitement échoué', `Erreurs: ${job.errors.length}`)
          }
          
          loadPreviousJobs() // Refresh job list
        }
      }
    } catch (error) {
      console.error('Error polling job status:', error)
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: BulkItem[] = acceptedFiles.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      fileName: file.name,
      status: 'pending',
      file
    }))
    
    setUploadedFiles(prev => [...prev, ...newFiles])
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: true,
    disabled: isProcessing
  })

  const processFiles = async () => {
    if (uploadedFiles.length === 0) return
    
    const filesToProcess = uploadedFiles.filter(f => f.status === 'pending' && f.file)
    if (filesToProcess.length === 0) return
    
    setIsProcessing(true)
    setIsPaused(false)
    setError(null)
    
    try {
      // Create FileList from File objects
      const files = filesToProcess.map(f => f.file!)
      const fileList = new DataTransfer()
      files.forEach(file => fileList.items.add(file))
      
      const options = {
        autoValidate: true,
        generateFacturX: true,
        autoTransmit: false
      }
      
      const response = await bulkApi.process(fileList.files, selectedTemplate, options)
      
      if (response.success && response.jobId) {
        const newJob: BulkJob = {
          id: response.jobId,
          status: 'pending',
          totalFiles: filesToProcess.length,
          processedFiles: 0,
          errors: [],
          results: []
        }
        
        setCurrentJob(newJob)
        setJobs(prev => [newJob, ...prev])
        
        // Show start toast
        toast.info('Traitement démarré', `${filesToProcess.length} fichier(s) en cours de traitement`)
        
        // Update file statuses to processing
        setUploadedFiles(prev => prev.map(f => 
          filesToProcess.find(ftf => ftf.id === f.id) 
            ? { ...f, status: 'processing' as const, progress: 0 }
            : f
        ))
      } else {
        throw new Error(response.error || 'Erreur lors du démarrage du traitement')
      }
    } catch (error) {
      console.error('Error starting bulk processing:', error)
      setError(handleApiError(error))
      setIsProcessing(false)
      
      // Reset file statuses
      setUploadedFiles(prev => prev.map(f => 
        f.status === 'processing' ? { ...f, status: 'pending' as const, progress: undefined } : f
      ))
    }
  }

  const pauseProcessing = () => {
    // Note: Real pause/resume would require backend support
    // For now, we just stop polling
    setIsPaused(true)
    setIsProcessing(false)
  }

  const resumeProcessing = () => {
    // Resume polling if there's a current job
    setIsPaused(false)
    if (currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing')) {
      setIsProcessing(true)
    }
  }

  const clearAll = () => {
    setUploadedFiles([])
    setCurrentProcessing(null)
    setIsProcessing(false)
    setIsPaused(false)
    setCurrentJob(null)
    setError(null)
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const retryFile = (fileId: string) => {
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'pending' as const, errorMessage: undefined } : f
    ))
  }

  const downloadResults = () => {
    const csvContent = [
      ['Fichier', 'Statut', 'Numéro facture', 'Montant', 'Entreprise', 'Erreur'],
      ...uploadedFiles.map(file => [
        file.fileName,
        file.status === 'completed' ? 'Succès' : 
        file.status === 'error' ? 'Erreur' : 
        file.status === 'processing' ? 'En cours' : 'En attente',
        file.invoiceNumber || '',
        file.amount || '',
        file.companyName || '',
        file.errorMessage || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `traitement-lot-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const stats: ProcessingStats = {
    total: uploadedFiles.length,
    completed: uploadedFiles.filter(f => f.status === 'completed').length,
    errors: uploadedFiles.filter(f => f.status === 'error').length,
    inProgress: uploadedFiles.filter(f => f.status === 'processing').length
  }

  const getStatusIcon = (status: BulkItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'processing':
        return <Settings className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: BulkItem['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'processing':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Traitement en lot</h1>
          <p className="text-slate-600 mt-2">
            Import CSV et traitement automatique de multiples factures
          </p>
        </div>
        
        <div className="flex space-x-3">
          {uploadedFiles.length > 0 && (
            <Button onClick={clearAll} variant="outline">
              Tout effacer
            </Button>
          )}
          
          {stats.completed > 0 && (
            <Button onClick={downloadResults} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter résultats
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Erreur:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Processing Stats */}
      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-gray-50 p-6 border border-slate-100/50">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-slate-100 rounded-xl">
                <Database className="h-5 w-5 text-slate-600" />
              </div>
              <Badge className="bg-slate-100 text-slate-700">TOTAL</Badge>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <p className="text-sm text-slate-600">Fichiers</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 border border-green-100/50">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-100 rounded-xl">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <Badge className="bg-green-100 text-green-700">TRAITÉS</Badge>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.completed}</div>
            <p className="text-sm text-green-600">Avec succès</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border border-blue-100/50">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <Badge className="bg-blue-100 text-blue-700">EN COURS</Badge>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.inProgress}</div>
            <p className="text-sm text-blue-600">En traitement</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 p-6 border border-red-100/50">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-red-100 rounded-xl">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <Badge className="bg-red-100 text-red-700">ERREURS</Badge>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.errors}</div>
            <p className="text-sm text-red-600">À corriger</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Zone */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Télécharger des fichiers</h3>
              <p className="text-slate-600">PDF, CSV, Excel - plusieurs fichiers acceptés</p>
            </div>

            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
                isDragActive ? 'border-blue-400 bg-blue-50' :
                'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              
              <div className="space-y-4">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl mx-auto flex items-center justify-center">
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
                
                <div>
                  <p className="font-semibold text-slate-900">
                    {isDragActive ? 'Déposez les fichiers ici' : 'Glissez-déposez ou cliquez'}
                  </p>
                  <p className="text-sm text-slate-600">
                    PDF, CSV, Excel • Jusqu'à 100 fichiers
                  </p>
                </div>
              </div>
            </div>

            {/* Processing Controls */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="flex space-x-3">
                  {!isProcessing && !isPaused && (
                    <Button 
                      onClick={processFiles}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90"
                      disabled={uploadedFiles.filter(f => f.status === 'pending').length === 0}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Lancer le traitement
                    </Button>
                  )}
                  
                  {isProcessing && (
                    <Button onClick={pauseProcessing} variant="outline">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                  )}
                  
                  {isPaused && (
                    <Button 
                      onClick={resumeProcessing}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:opacity-90"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Reprendre
                    </Button>
                  )}
                </div>

                <div className="text-sm text-slate-600">
                  {stats.total > 0 && (
                    <span>
                      {stats.completed + stats.errors}/{stats.total} traités
                      {stats.total > 0 && ` (${Math.round(((stats.completed + stats.errors) / stats.total) * 100)}%)`}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Files List */}
          {uploadedFiles.length > 0 && (
            <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl border border-slate-200/50">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-blue-500 to-red-500"></div>
              
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Files de traitement</h3>
                  <p className="text-slate-600">État de chaque fichier</p>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`p-4 rounded-2xl border transition-all duration-300 ${
                        file.status === 'completed' ? 'bg-green-50/80 border-green-200/50' :
                        file.status === 'error' ? 'bg-red-50/80 border-red-200/50' :
                        file.status === 'processing' ? 'bg-blue-50/80 border-blue-200/50' :
                        'bg-slate-50/80 border-slate-200/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(file.status)}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-900 truncate">{file.fileName}</div>
                            {file.invoiceNumber && (
                              <div className="text-sm text-slate-600">
                                {file.invoiceNumber} • {file.companyName} • {file.amount}
                              </div>
                            )}
                            {file.errorMessage && (
                              <div className="text-sm text-red-600">{file.errorMessage}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge className={`${getStatusColor(file.status)} border text-xs`}>
                            {file.status === 'completed' ? 'TERMINÉ' :
                             file.status === 'error' ? 'ERREUR' :
                             file.status === 'processing' ? 'EN COURS' : 'EN ATTENTE'}
                          </Badge>
                          
                          {file.status === 'error' && (
                            <Button 
                              onClick={() => retryFile(file.id)}
                              size="sm" 
                              variant="outline"
                              className="text-xs"
                            >
                              Réessayer
                            </Button>
                          )}
                          
                          <Button 
                            onClick={() => removeFile(file.id)}
                            size="sm" 
                            variant="outline"
                            className="text-xs"
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>

                      {file.status === 'processing' && file.progress !== undefined && (
                        <div className="mt-3">
                          <Progress value={file.progress} className="h-2" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Panel */}
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/50">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-500"></div>
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Configuration</h3>
              <p className="text-slate-600">Template de mapping des données</p>
            </div>

            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                    selectedTemplate === template.id
                      ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500 ring-opacity-20'
                      : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedTemplate === template.id
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-slate-300'
                    }`}></div>
                    <div>
                      <div className="font-semibold text-slate-900">{template.name}</div>
                      <div className="text-sm text-slate-600">{template.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Alert className="border-purple-200 bg-purple-50">
            <Package className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-900">
              <strong>Traitement optimisé:</strong> Les fichiers sont traités en parallèle pour une vitesse maximale.
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Auto-validation:</strong> Chaque fichier est automatiquement vérifié pour la conformité française.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Job History */}
      {jobs.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl border border-slate-200/50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
          
          <div className="p-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Historique des traitements</h3>
              <p className="text-slate-600">Jobs récents de traitement en lot</p>
            </div>

            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 ${
                    job.status === 'completed' ? 'bg-green-50/80 border-green-200/50' :
                    job.status === 'failed' ? 'bg-red-50/80 border-red-200/50' :
                    job.status === 'processing' ? 'bg-blue-50/80 border-blue-200/50' :
                    'bg-slate-50/80 border-slate-200/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {job.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {job.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                      {job.status === 'processing' && <Settings className="h-4 w-4 text-blue-600 animate-spin" />}
                      {job.status === 'pending' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                      
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-900">
                          Job {job.id.slice(-8)}
                        </div>
                        <div className="text-sm text-slate-600">
                          {job.processedFiles}/{job.totalFiles} fichiers traités
                          {job.created_at && ` • ${new Date(job.created_at).toLocaleString('fr-FR')}`}
                        </div>
                        {job.errors.length > 0 && (
                          <div className="text-sm text-red-600 mt-1">
                            {job.errors.length} erreur(s)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge className={`text-xs border ${
                        job.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                        job.status === 'failed' ? 'bg-red-100 text-red-700 border-red-200' :
                        job.status === 'processing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {job.status === 'completed' ? 'TERMINÉ' :
                         job.status === 'failed' ? 'ÉCHEC' :
                         job.status === 'processing' ? 'EN COURS' : 'EN ATTENTE'}
                      </Badge>
                      
                      {job.totalFiles > 0 && (
                        <div className="text-xs text-slate-500">
                          {Math.round((job.processedFiles / job.totalFiles) * 100)}%
                        </div>
                      )}
                    </div>
                  </div>

                  {job.status === 'processing' && job.totalFiles > 0 && (
                    <div className="mt-3">
                      <Progress value={Math.round((job.processedFiles / job.totalFiles) * 100)} className="h-2" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}