'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { fr } from '@/locales/fr'
import { formatFileSize } from '@/lib/utils/french-formatting'
import { MAX_FILE_SIZE } from '@/constants/french-business'

interface UploadedFile {
  id: string
  file: File
  status: 'uploading' | 'success' | 'error' | 'processing'
  progress: number
  error?: string
  preview?: string
}

interface PdfUploadProps {
  onFileUpload: (files: File[]) => Promise<void>
  maxFiles?: number
  disabled?: boolean
}

export function PdfUpload({ onFileUpload, maxFiles = 10, disabled = false }: PdfUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    if (disabled) return

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errorMessages = rejectedFiles.map(({ file, errors }) => {
        const errorMsg = errors.map((e: any) => {
          switch (e.code) {
            case 'file-too-large':
              return `${file.name}: ${fr.common.fileTooLarge} (max ${formatFileSize(MAX_FILE_SIZE)})`
            case 'file-invalid-type':
              return `${file.name}: ${fr.common.invalidFileFormat}`
            default:
              return `${file.name}: ${e.message}`
          }
        }).join(', ')
        return errorMsg
      })
      
      // Add error files to display
      const errorFiles: UploadedFile[] = rejectedFiles.map(({ file }) => ({
        id: `error-${Date.now()}-${Math.random()}`,
        file,
        status: 'error',
        progress: 0,
        error: errorMessages.join(', ')
      }))
      
      setUploadedFiles(prev => [...prev, ...errorFiles])
      return
    }

    // Process accepted files
    if (acceptedFiles.length > 0) {
      setIsUploading(true)
      
      const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
        id: `upload-${Date.now()}-${Math.random()}`,
        file,
        status: 'uploading',
        progress: 0
      }))
      
      setUploadedFiles(prev => [...prev, ...newFiles])

      try {
        // Simulate upload progress
        for (const uploadFile of newFiles) {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, progress: 50 }
                : f
            )
          )
        }

        // Call the upload handler
        await onFileUpload(acceptedFiles)

        // Mark as success
        setUploadedFiles(prev => 
          prev.map(f => 
            newFiles.some(nf => nf.id === f.id)
              ? { ...f, status: 'success', progress: 100 }
              : f
          )
        )
      } catch (error) {
        // Mark as error
        setUploadedFiles(prev => 
          prev.map(f => 
            newFiles.some(nf => nf.id === f.id)
              ? { ...f, status: 'error', progress: 0, error: (error as Error).message }
              : f
          )
        )
      } finally {
        setIsUploading(false)
      }
    }
  }, [onFileUpload, disabled])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles,
    disabled: disabled || isUploading,
    multiple: true
  })

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const retryFile = async (fileId: string) => {
    const fileToRetry = uploadedFiles.find(f => f.id === fileId)
    if (!fileToRetry) return

    setUploadedFiles(prev => 
      prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'uploading', progress: 0, error: undefined }
          : f
      )
    )

    try {
      await onFileUpload([fileToRetry.file])
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'success', progress: 100 }
            : f
        )
      )
    } catch (error) {
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'error', progress: 0, error: (error as Error).message }
            : f
        )
      )
    }
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <File className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'uploading':
      case 'processing':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <Card className={`transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-dashed'}`}>
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`text-center cursor-pointer ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragActive ? 'text-blue-600' : 'text-gray-400'}`} />
            
            {isDragActive ? (
              <p className="text-lg font-medium text-blue-600">
                Déposez vos fichiers ici...
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">
                  {fr.common.dragAndDrop}
                </p>
                <p className="text-sm text-gray-500">
                  PDF, CSV, Excel • Max {formatFileSize(MAX_FILE_SIZE)} par fichier
                </p>
                <Button type="button" variant="outline" disabled={disabled || isUploading}>
                  {fr.common.selectFile}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">
            Fichiers ({uploadedFiles.length})
          </h3>
          
          {uploadedFiles.map((uploadedFile) => (
            <Card key={uploadedFile.id} className={`p-3 ${getStatusColor(uploadedFile.status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getStatusIcon(uploadedFile.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{formatFileSize(uploadedFile.file.size)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {uploadedFile.file.type.split('/')[1].toUpperCase()}
                      </Badge>
                    </div>
                    
                    {uploadedFile.status === 'uploading' && (
                      <Progress value={uploadedFile.progress} className="mt-1 h-1" />
                    )}
                    
                    {uploadedFile.error && (
                      <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {uploadedFile.status === 'error' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => retryFile(uploadedFile.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadedFile.id)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Help Text */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Formats supportés :</strong> PDF pour les factures, CSV/Excel pour l'import en lot.
          Taille maximale : {formatFileSize(MAX_FILE_SIZE)} par fichier.
        </AlertDescription>
      </Alert>
    </div>
  )
}