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