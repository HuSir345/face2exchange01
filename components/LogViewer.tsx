'use client'

import { useState } from 'react'

interface LogEntry {
  timestamp: string
  type: 'info' | 'error' | 'success' | 'debug'
  message: string
  details?: string
}

interface LogViewerProps {
  logs: LogEntry[]
  onClear: () => void
}

export default function LogViewer({ logs, onClear }: LogViewerProps) {
  return (
    <div className="mb-8 bg-black rounded-lg p-4 text-sm font-mono">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-white font-semibold">系统日志</h2>
        <button 
          onClick={onClear}
          className="text-gray-400 hover:text-white text-xs"
        >
          清除日志
        </button>
      </div>
      <div className="h-48 overflow-y-auto">
        {logs.map((log, index) => (
          <div key={index} className="mb-2">
            <div className={`
              ${log.type === 'error' ? 'text-red-400' : 
                log.type === 'success' ? 'text-green-400' : 
                log.type === 'debug' ? 'text-yellow-400' : 
                'text-blue-400'}
            `}>
              <span className="text-gray-500">{log.timestamp}</span>
              {' '}
              <span className="text-gray-400">[{log.type.toUpperCase()}]</span>
              {' '}
              {log.message}
            </div>
            {log.details && (
              <pre className="ml-4 mt-1 text-gray-400 text-xs whitespace-pre-wrap">
                {log.details}
              </pre>
            )}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-gray-500 italic">
            等待操作...
          </div>
        )}
      </div>
    </div>
  )
} 