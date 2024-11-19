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

      // 记录更详细的开始信息
      addLog('开始处理图片任务', 'info')
      addLog('浏览器环境信息', 'debug', JSON.stringify({
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        memory: (performance as any)?.memory ? {
          jsHeapSizeLimit: ((performance as any).memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB',
          totalJSHeapSize: ((performance as any).memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
          usedJSHeapSize: ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
        } : 'Not available'
      }, null, 2))

      // 记录更详细的图片信息
      addLog('图片详细信息', 'debug', JSON.stringify({
        image1: {
          name: image1.name,
          size: `${(image1.size / 1024).toFixed(2)}KB`,
          type: image1.type,
          lastModified: new Date(image1.lastModified).toISOString(),
          dimensions: await getImageDimensions(image1)
        },
        image2: {
          name: image2.name,
          size: `${(image2.size / 1024).toFixed(2)}KB`,
          type: image2.type,
          lastModified: new Date(image2.lastModified).toISOString(),
          dimensions: await getImageDimensions(image2)
        }
      }, null, 2))

      const formData = new FormData()
      formData.append('image1', image1)
      formData.append('image2', image2)

      addLog('准备发送请求到服务器', 'info', JSON.stringify({
        endpoint: '/api/merge',
        method: 'POST',
        contentType: 'multipart/form-data',
        timestamp: new Date().toISOString()
      }, null, 2))

      const startTime = Date.now()
      let responseStartTime: number
      let responseText = ''

      const response = await fetch('/api/merge', {
        method: 'POST',
        body: formData,
      })

      responseStartTime = Date.now()
      const responseTime = responseStartTime - startTime

      addLog(`收到服务器初始响应，耗时: ${responseTime}ms`, 'info')

      // 记录详细的响应头信息
      const responseHeaders = Object.fromEntries(response.headers.entries())
      addLog('服务器响应详情', 'debug', JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        type: response.type,
        url: response.url,
        redirected: response.redirected,
        ok: response.ok
      }, null, 2))

      // 尝试读取响应内容
      try {
        responseText = await response.text()
        addLog('服务器原始响应内容', 'debug', responseText)

        // 尝试解析为 JSON
        const data = JSON.parse(responseText)
        addLog('解析后的响应数据', 'debug', JSON.stringify(data, null, 2))

        if (!response.ok) {
          throw new Error(data.error || `服务器错误 (${response.status})`)
        }

        addLog('图片处理成功', 'success')
        if (data.resultUrl) {
          addLog('生成的图片URL', 'info', data.resultUrl)
          addLog('处理完成时间', 'info', JSON.stringify({
            totalTime: `${Date.now() - startTime}ms`,
            serverProcessing: `${responseTime}ms`,
            responseProcessing: `${Date.now() - responseStartTime}ms`
          }, null, 2))
        }

        setResultImage(data.resultUrl)
        setStatus('success')
      } catch (parseError) {
        addLog('解析响应失败', 'error', JSON.stringify({
          error: parseError instanceof Error ? parseError.message : String(parseError),
          responseText,
          contentType: responseHeaders['content-type'],
          contentLength: responseHeaders['content-length']
        }, null, 2))
        throw new Error('无法解析服务器响应')
      }
    } catch (error: any) {
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        type: error.name,
        code: error.code,
        // 添加更多错误相关信息
        cause: error.cause ? {
          message: error.cause.message,
          stack: error.cause.stack
        } : undefined,
        networkError: error instanceof TypeError && error.message.includes('network'),
        parseError: error instanceof SyntaxError
      }
      
      addLog('处理失败', 'error', error.message)
      addLog('错误详细信息', 'debug', JSON.stringify(errorDetails, null, 2))
      
      setError(error.message || '处理失败')
      setStatus('error')
    }
  }

  // 辅助函数：获取图片尺寸
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        })
      }
      img.src = URL.createObjectURL(file)
    })
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