'use client'

import { useState } from 'react'
import ImageUploader from '@/components/ImageUploader'
import ResultDisplay from '@/components/ResultDisplay'
import LogViewer from '@/components/LogViewer'
import { ProcessingStatus, LogEntry } from '@/types'

export default function Home() {
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = (
    message: string, 
    type: LogEntry['type'] = 'info',
    details?: string
  ) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
    
    // 同时在控制台输出日志
    const consoleMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`
    switch (type) {
      case 'error':
        console.error(consoleMessage, details || '')
        break
      case 'success':
        console.log('%c' + consoleMessage, 'color: green', details || '')
        break
      case 'debug':
        console.debug(consoleMessage, details || '')
        break
      default:
        console.log(consoleMessage, details || '')
    }

    setLogs(prev => [...prev, { timestamp, type, message, details }])
  }

  const handleImageChange = () => {
    setResultImage(null)
    setError(null)
    setStatus('idle')
    setLogs([]) // 清空日志
  }

  const handleProcess = async (image1: File, image2: File) => {
    try {
      setStatus('processing')
      setError(null)
      setLogs([])

      // 记录开始处理的详细信息
      addLog('开始处理图片任务', 'info')
      addLog('系统环境信息', 'debug', JSON.stringify({
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        platform: navigator.platform,
        language: navigator.language
      }, null, 2))

      // 记录图片信息
      addLog('图片信息', 'debug', JSON.stringify({
        image1: {
          name: image1.name,
          size: `${(image1.size / 1024).toFixed(2)}KB`,
          type: image1.type,
          lastModified: new Date(image1.lastModified).toISOString()
        },
        image2: {
          name: image2.name,
          size: `${(image2.size / 1024).toFixed(2)}KB`,
          type: image2.type,
          lastModified: new Date(image2.lastModified).toISOString()
        }
      }, null, 2))

      const formData = new FormData()
      formData.append('image1', image1)
      formData.append('image2', image2)

      addLog('准备发送请求到服务器', 'info')
      const startTime = Date.now()

      const response = await fetch('/api/merge', {
        method: 'POST',
        body: formData,
      })

      const endTime = Date.now()
      addLog(`服务器响应完成，耗时: ${endTime - startTime}ms`, 'info')

      // 记录响应头信息
      addLog('服务器响应头', 'debug', JSON.stringify(
        Object.fromEntries(response.headers.entries()),
        null, 2
      ))

      const data = await response.json()
      addLog('服务器返回数据', 'debug', JSON.stringify(data, null, 2))

      if (!response.ok) {
        throw new Error(data.error || '处理失败')
      }

      addLog('图片处理成功', 'success')
      if (data.resultUrl) {
        addLog('生成的图片URL', 'info', data.resultUrl)
      }

      setResultImage(data.resultUrl)
      setStatus('success')
    } catch (error: any) {
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        type: error.name,
        code: error.code
      }
      
      addLog('处理失败', 'error', error.message)
      addLog('错误详情', 'debug', JSON.stringify(errorDetails, null, 2))
      
      setError(error.message || '处理失败')
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold text-center mb-8">
          一起玩
          <span className="inline-block px-2 py-1 mx-1 bg-blue-600 text-white rounded-lg transform hover:scale-105 transition-transform">
            换脸
          </span>
        </h1>

        <LogViewer 
          logs={logs}
          onClear={() => setLogs([])}
        />
        
        <ImageUploader 
          onProcess={handleProcess} 
          status={status}
          onImageChange={handleImageChange}
          onError={(message) => {
            setError(message)
            addLog(message, 'error')
          }}
        />
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        {resultImage && (
          <ResultDisplay imageUrl={resultImage} />
        )}
      </div>
    </main>
  )
} 