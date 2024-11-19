export type ProcessingStatus = 'idle' | 'processing' | 'success' | 'error'

export interface ImagePreview {
  url: string
  file: File
}

export interface LogEntry {
  timestamp: string
  type: 'info' | 'error' | 'success' | 'debug'
  message: string
  details?: string
}

export interface ImageUploaderProps {
  onProcess: (image1: File, image2: File) => Promise<void>
  status: ProcessingStatus
  onImageChange: () => void
  onError?: (message: string) => void
} 