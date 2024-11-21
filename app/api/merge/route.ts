import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

async function compressImage(file: File) {
  try {
    const buffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(buffer)

    const randomQuality = 0.59 + Math.random() * (0.99 - 0.59)
    const finalQuality = Math.floor(80 * randomQuality)

    console.log('压缩质量系数:', randomQuality.toFixed(6))
    console.log('最终压缩质量:', finalQuality)

    const compressedBuffer = await sharp(fileBuffer)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: finalQuality,
        progressive: true
      })
      .toBuffer()

    const compressedFile = new File(
      [compressedBuffer],
      file.name,
      { type: 'image/jpeg' }
    )

    console.log('压缩前大小:', (file.size / 1024 / 1024).toFixed(2) + 'MB')
    console.log('压缩后大小:', (compressedFile.size / 1024 / 1024).toFixed(2) + 'MB')

    return compressedFile
  } catch (error) {
    console.error('图片压缩失败:', error)
    return file
  }
}

async function uploadToImageHub(file: File | Blob, retryCount = 0): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('source', file)

    console.log('准备上传图片到图床:', {
      url: process.env.IMAGEHUB_API_URL,
      method: 'POST',
      file: {
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        lastModified: file instanceof File ? new Date(file.lastModified).toISOString() : 'N/A',
        name: file instanceof File ? file.name : 'blob'
      },
      retryCount
    })

    const requestHeaders = {
      'X-API-Key': '***' + process.env.IMAGEHUB_API_KEY!.slice(-6)
    }
    console.log('请求头:', requestHeaders)

    console.log('FormData 内容:')
    for (const [key, value] of formData.entries()) {
      console.log('- ', key, ':', {
        type: value instanceof Blob ? value.type : typeof value,
        size: value instanceof Blob ? `${(value.size / 1024 / 1024).toFixed(2)}MB` : 'N/A',
        name: value instanceof File ? value.name : 'blob'
      })
    }

    const startTime = Date.now()
    const response = await fetch(process.env.IMAGEHUB_API_URL!, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.IMAGEHUB_API_KEY!,
      },
      body: formData
    })

    const endTime = Date.now()

    console.log('图床响应详情:', {
      timing: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: `${endTime - startTime}ms`
      },
      status: {
        code: response.status,
        text: response.statusText
      },
      headers: Object.fromEntries(response.headers.entries()),
      type: response.type,
      url: response.url,
      redirected: response.redirected
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('图床上传失败:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: errorText,
        timestamp: new Date().toISOString()
      })
      throw new Error('图片上传失败')
    }

    const result = await response.json()
    console.log('图床上传成功:', {
      timing: {
        total: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString()
      },
      response: {
        status_code: result.status_code,
        status_txt: result.status_txt,
        image: result.image
      },
      request: {
        originalFile: {
          type: file.type,
          size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          name: file instanceof File ? file.name : 'blob'
        }
      }
    })

    if (result.status_code !== 200) {
      console.error('图床返回错误:', {
        result,
        timestamp: new Date().toISOString(),
        requestDetails: {
          fileType: file.type,
          fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`
        }
      })
      throw new Error(result.status_txt || '图片上传失败')
    }

    return result.image.url
  } catch (error) {
    if (retryCount < 2) {
      console.log(`上传失败，准备重试 (第${retryCount + 1}次):`, {
        error: error instanceof Error ? error.message : String(error),
        nextAction: '尝试压缩后重新上传',
        timestamp: new Date().toISOString(),
        fileInfo: {
          type: file.type,
          size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          name: file instanceof File ? file.name : 'blob'
        }
      })
      const compressedFile = await compressImage(file instanceof File ? file : new File([file], 'image.jpg'))
      return uploadToImageHub(compressedFile, retryCount + 1)
    }
    console.error('图片上传最终失败:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      retryCount,
      timestamp: new Date().toISOString(),
      fileDetails: {
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        name: file instanceof File ? file.name : 'blob'
      }
    })
    throw error
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 1000
): Promise<Response> {
  let lastError: Error = new Error('Unknown error')
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response
      
      const errorText = await response.text()
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.log(`请求失败，第 ${attempt + 1} 次重试:`, {
        error: lastError.message,
        nextRetryIn: attempt < retries - 1 ? `${delay}ms` : 'no more retries',
        url,
        timestamp: new Date().toISOString()
      })
      
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
    }
  }
  
  throw lastError
}

async function downloadAndUploadImage(url: string): Promise<string> {
  try {
    console.log('开始下载图片:', url)
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    
    const response = await fetchWithRetry(
      url,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/*, */*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        keepalive: true
      },
      3,  // 重试次数
      1000 // 重试延迟
    ).finally(() => clearTimeout(timeout))

    if (!response.ok) {
      console.error('图片下载失败:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
      throw new Error(`图片下载失败: ${response.status} ${response.statusText}`)
    }
    
    const contentType = response.headers.get('content-type')
    if (!contentType?.startsWith('image/')) {
      console.error('响应不是图片:', contentType)
      throw new Error('下载的内容不是图片')
    }

    const blob = await response.blob()
    console.log('图片下载完成', {
      size: `${(blob.size / 1024 / 1024).toFixed(2)}MB`,
      type: blob.type
    })
    
    return await uploadToImageHub(blob)
  } catch (error) {
    console.error('下载并上传图片失败:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url,
      timestamp: new Date().toISOString()
    })
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. 环境变量验证
    const requiredEnvVars = [
      'WORKFLOW_ID',
      'COZE_API_URL',
      'AUTHORIZATION',
      'IMAGEHUB_API_URL',
      'IMAGEHUB_API_KEY'
    ]
    
    const missingVars = requiredEnvVars.filter(key => !process.env[key])
    if (missingVars.length > 0) {
      console.error('缺少环境变量:', missingVars)
      return new NextResponse(
        JSON.stringify({
          error: `配置错误: 缺少环境变量 ${missingVars.join(', ')}`,
          errorType: 'ConfigError'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 2. 请求验证
    const formData = await request.formData().catch(error => {
      console.error('解析表单数据失败:', error)
      return null
    })

    if (!formData) {
      return new NextResponse(
        JSON.stringify({
          error: '无效的请求数据',
          errorType: 'ValidationError'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const image1 = formData.get('image1') as File
    const image2 = formData.get('image2') as File

    if (!image1 || !image2) {
      return new NextResponse(
        JSON.stringify({
          error: '请提供两张图片',
          errorType: 'ValidationError'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 3. 图片处理
    try {
      console.log('开始上传原始图片...')
      const [image1Url, image2Url] = await Promise.all([
        uploadToImageHub(image1),
        uploadToImageHub(image2)
      ])

      // 4. 调用 Coze API
      console.log('调用 Coze API...')
      const cozeResponse = await fetch(process.env.COZE_API_URL!, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AUTHORIZATION!.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          workflow_id: process.env.WORKFLOW_ID!.trim(),
          parameters: { face_image: image1Url, base_image: image2Url }
        })
      })

      if (!cozeResponse.ok) {
        const errorText = await cozeResponse.text()
        console.error('Coze API 错误响应:', errorText)
        return new NextResponse(
          JSON.stringify({
            error: 'AI 处理失败',
            errorType: 'CozeAPIError',
            details: errorText
          }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      const cozeResult = await cozeResponse.json()
      
      if (cozeResult.code !== 0) {
        return new NextResponse(
          JSON.stringify({
            error: cozeResult.msg || 'AI 处理失败',
            errorType: 'CozeAPIError',
            details: cozeResult
          }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // 5. 处理返回的图片
      const outputData = typeof cozeResult.data === 'string' 
        ? JSON.parse(cozeResult.data) 
        : cozeResult.data

      if (!outputData?.output) {
        return new NextResponse(
          JSON.stringify({
            error: '处理结果无效',
            errorType: 'ProcessError',
            details: cozeResult
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // 6. 上传结果图片到图床
      const finalImageUrl = await downloadAndUploadImage(outputData.output)

      return new NextResponse(
        JSON.stringify({
          resultUrl: finalImageUrl,
          originalUrl: outputData.output,
          rawResponse: cozeResult
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )

    } catch (error) {
      console.error('处理过程错误:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.cause : undefined
      })
      
      return new NextResponse(
        JSON.stringify({
          error: error instanceof Error ? error.message : '处理失败',
          errorType: 'ProcessError',
          details: error instanceof Error ? error.stack : undefined
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    // 最外层错误处理
    console.error('API 致命错误:', error)
    return new NextResponse(
      JSON.stringify({
        error: '服务器内部错误',
        errorType: 'ServerError',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
} 