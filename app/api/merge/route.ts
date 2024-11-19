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

    const response = await fetch(process.env.IMAGEHUB_API_URL!, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.IMAGEHUB_API_KEY!,
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error('图片上传失败')
    }

    const result = await response.json()
    console.log('图床上传响应:', result)

    if (result.status_code !== 200) {
      throw new Error(result.status_txt || '图片上传失败')
    }

    return result.image.url
  } catch (error) {
    if (retryCount < 2) {
      console.log(`上传失败，尝试压缩后重新上传 (第${retryCount + 1}次)...`)
      const compressedFile = await compressImage(file instanceof File ? file : new File([file], 'image.jpg'))
      return uploadToImageHub(compressedFile, retryCount + 1)
    }
    throw error
  }
}

async function downloadAndUploadImage(url: string): Promise<string> {
  try {
    console.log('开始下载图片:', url)
    const response = await fetch(url)
    if (!response.ok) throw new Error('图片下载失败')
    
    const blob = await response.blob()
    console.log('图片下载完成，开始上传到图床')
    
    return await uploadToImageHub(blob)
  } catch (error) {
    console.error('下载并上传图片失败:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image1 = formData.get('image1') as File
    const image2 = formData.get('image2') as File

    if (!image1 || !image2) {
      return NextResponse.json(
        { error: '请提供两张图片' },
        { status: 400 }
      )
    }

    console.log('开始上传原始图片到图床...')

    const [image1Url, image2Url] = await Promise.all([
      uploadToImageHub(image1),
      uploadToImageHub(image2)
    ])

    console.log('原始图片上传成功:')
    console.log('图片1 URL:', image1Url)
    console.log('图片2 URL:', image2Url)

    console.log('准备调用 Coze API...')

    const requestBody = {
      workflow_id: process.env.WORKFLOW_ID!.trim(),
      parameters: {
        face_image: image1Url,
        base_image: image2Url
      }
    }

    const response = await fetch(process.env.COZE_API_URL!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AUTHORIZATION!.trim()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Origin': 'https://www.coze.cn',
        'Referer': 'https://www.coze.cn/'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Coze API 响应状态:', response.status)
    
    const result = await response.json()
    console.log('Coze API 响应数据:', JSON.stringify(result, null, 2))

    if (!response.ok) {
      throw new Error(`Coze API 错误: ${response.status}`)
    }

    if (result.code !== 0) {
      throw new Error(result.msg || '处理失败')
    }

    // 解析返回的数据
    let outputData
    try {
      outputData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data
      console.log('解析后的输出数据:', outputData)

      // 将 Coze API 返回的图片上传到图床
      console.log('开始上传生成的图片到图床...')
      const finalImageUrl = await downloadAndUploadImage(outputData.output)
      console.log('生成的图片上传成功:', finalImageUrl)

      return NextResponse.json({
        resultUrl: finalImageUrl,
        originalUrl: outputData.output,
        rawResponse: result
      })

    } catch (e) {
      console.log('原始返回数据:', result.data)
      throw new Error('处理返回数据失败')
    }

  } catch (error) {
    console.error('API错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '处理失败' },
      { status: 500 }
    )
  }
} 