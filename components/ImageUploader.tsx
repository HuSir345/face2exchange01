'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImagePreview, ProcessingStatus } from '@/types'
import { ImageUploaderProps } from '@/types'

export default function ImageUploader({ onProcess, status, onImageChange }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<[ImagePreview?, ImagePreview?]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: 0 | 1) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      onError?.('请上传图片文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const newPreviews = [...previews]
      newPreviews[index] = {
        url: e.target?.result as string,
        file
      }
      setPreviews(newPreviews as [ImagePreview?, ImagePreview?])
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!previews[0] || !previews[1]) {
      onError?.('请上传两张图片')
      return
    }

    if (isProcessing) return

    try {
      setIsProcessing(true)
      await onProcess(previews[0].file, previews[1].file)
    } catch (error) {
      console.error('处理图片时出错:', error)
      onError?.(error instanceof Error ? error.message : '处理图片时出错')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((index) => (
          <div key={index} className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e, index as 0 | 1)}
              className="hidden"
              id={`image-input-${index}`}
            />
            <label
              htmlFor={`image-input-${index}`}
              className={`
                block w-full aspect-square border-2 border-dashed rounded-lg 
                cursor-pointer hover:border-gray-400 transition-colors
                ${status === 'processing' ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              {previews[index] ? (
                <div className="relative w-full h-full">
                  <Image
                    src={previews[index]!.url}
                    alt={`预览图 ${index + 1}`}
                    width={400}
                    height={400}
                    className="object-cover rounded-lg w-full h-full"
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-gray-500 text-lg font-bold">
                    {index === 0 ? '上传第一张图片' : '上传第二张图片'}
                  </span>
                </div>
              )}
            </label>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={status === 'processing' || !previews[0] || !previews[1] || isProcessing}
        className={`
          w-full py-3 px-4 rounded-lg font-medium transition-colors
          ${isProcessing || status === 'processing'
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
        `}
      >
        {isProcessing || status === 'processing' ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            处理中...
          </span>
        ) : '开始合成'}
      </button>
    </div>
  )
} 