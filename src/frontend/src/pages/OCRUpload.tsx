import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle, Trash2, AlertTriangle, Upload, Loader2 } from 'lucide-react'
import { ocrApi } from '../services/api'
import toast from 'react-hot-toast'

interface OCRResult {
  imageId: string
  rawText: string
  extracted: {
    [key: string]: {
      value: number
      unit: string
      confidence: number
    }
  }
  recordDate?: string
}

interface ImageItem {
  tempId: string
  file: File
  previewUrl: string
  status: 'pending' | 'uploading' | 'recognizing' | 'done' | 'error'
  imageId?: string
  result?: OCRResult
  error?: string
}

const MAX_CONCURRENT = 3

export default function OCRUpload() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<ImageItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0])
  const [formData, setFormData] = useState<Record<string, string>>({
    creatinine: '',
    urea: '',
    potassium: '',
    sodium: '',
    phosphorus: '',
    uricAcid: '',
    tacrolimus: '',
    hemoglobin: '',
    bloodSugar: '',
  })

  const metricLabels: Record<string, string> = {
    creatinine: '血清肌酐',
    urea: '尿素氮',
    potassium: '血钾',
    sodium: '血钠',
    phosphorus: '血磷',
    uricAcid: '尿酸',
    tacrolimus: '他克莫司',
    hemoglobin: '血红蛋白',
    bloodSugar: '血糖',
  }

  // 生成临时ID
  const generateTempId = () => Math.random().toString(36).substring(2, 10)

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newImages: ImageItem[] = Array.from(files).map((file) => ({
      tempId: generateTempId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }))

    setImages((prev) => [...prev, ...newImages])

    // 开始处理新添加的图片
    processImages(newImages)

    // 重置 input 以便重复选择相同文件
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // 处理单张图片（上传 + 识别）
  const processSingleImage = async (item: ImageItem): Promise<ImageItem> => {
    try {
      // 1. 上传
      const uploadFormData = new FormData()
      uploadFormData.append('image', item.file)

      const uploadRes: any = await ocrApi.upload(uploadFormData)

      if (uploadRes.code !== 201 || !uploadRes.data?.imageId) {
        throw new Error(uploadRes.message || '上传失败')
      }

      const imageId = uploadRes.data.imageId

      // 2. 识别
      const recognizeRes: any = await ocrApi.recognize(imageId)

      if (recognizeRes.code !== 200 || !recognizeRes.data) {
        throw new Error(recognizeRes.message || '识别失败')
      }

      return {
        ...item,
        status: 'done',
        imageId,
        result: recognizeRes.data,
      }
    } catch (error: any) {
      return {
        ...item,
        status: 'error',
        error: error.message || '处理失败',
      }
    }
  }

  // 限制并发的批量处理
  const processImages = async (items: ImageItem[]) => {
    setIsProcessing(true)

    const queue = [...items]
    const running: Promise<void>[] = []

    const processNext = async () => {
      const item = queue.shift()
      if (!item) return

      // 更新状态为 uploading
      updateImageStatus(item.tempId, 'uploading')

      const result = await processSingleImage(item)

      setImages((prev) =>
        prev.map((img) => (img.tempId === result.tempId ? result : img))
      )

      // 继续处理队列中的下一张

      // 继续处理队列中的下一张
      if (queue.length > 0) {
        await processNext()
      }
    }

    // 启动最多 MAX_CONCURRENT 个并发任务
    for (let i = 0; i < Math.min(MAX_CONCURRENT, queue.length); i++) {
      running.push(processNext())
    }

    await Promise.all(running)

    // 所有图片处理完成后，统一合并一次结果
    setImages((currentImages) => {
      const doneItems = currentImages.filter((img) => img.status === 'done')
      if (doneItems.length > 0) {
        setFormData(() => {
          const merged: Record<string, string> = {
            creatinine: '',
            urea: '',
            potassium: '',
            sodium: '',
            phosphorus: '',
            uricAcid: '',
            tacrolimus: '',
            hemoglobin: '',
            bloodSugar: '',
          }

          doneItems.forEach((item) => {
            if (!item.result) return
            Object.entries(item.result.extracted).forEach(([key, data]) => {
              if (!(key in merged)) return
              const existing = merged[key]
              const existingConfidence = parseFloat(existing.split('|')[1] || '0')
              if (!existing || data.confidence > existingConfidence) {
                merged[key] = `${data.value}|${data.confidence}`
              }
            })
          })

          return merged
        })
      }
      return currentImages
    })

    setIsProcessing(false)
  }

  // 更新图片状态
  const updateImageStatus = (tempId: string, status: ImageItem['status']) => {
    setImages((prev) =>
      prev.map((img) => (img.tempId === tempId ? { ...img, status } : img))
    )
  }

  // 获取表单显示值（去掉置信度后缀）
  const getDisplayValue = (key: string) => {
    const raw = formData[key]
    if (!raw) return ''
    return raw.split('|')[0]
  }

  // 获取表单置信度
  const getConfidence = (key: string) => {
    const raw = formData[key]
    if (!raw) return 0
    return parseFloat(raw.split('|')[1] || '0')
  }

  // 删除某张图片
  const handleRemoveImage = (tempId: string) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.tempId === tempId)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)

      const remaining = prev.filter((img) => img.tempId !== tempId)
      const doneItems = remaining.filter((img) => img.status === 'done')

      // 重新合并剩余 done 图片的结果
      const merged: Record<string, string> = {
        creatinine: '',
        urea: '',
        potassium: '',
        sodium: '',
        phosphorus: '',
        uricAcid: '',
        tacrolimus: '',
        hemoglobin: '',
        bloodSugar: '',
      }

      doneItems.forEach((item) => {
        if (!item.result) return
        Object.entries(item.result.extracted).forEach(([key, data]) => {
          if (!(key in merged)) return
          const existing = merged[key]
          const existingConfidence = parseFloat(existing.split('|')[1] || '0')
          if (!existing || data.confidence > existingConfidence) {
            merged[key] = `${data.value}|${data.confidence}`
          }
        })
      })

      setFormData(merged)
      return remaining
    })
  }

  // 检查日期是否不一致
  const hasDateMismatch = (item: ImageItem) => {
    if (item.status !== 'done' || !item.result?.recordDate) return false
    return item.result.recordDate !== recordDate
  }

  // 获取状态文本和颜色
  const getStatusInfo = (status: ImageItem['status']) => {
    switch (status) {
      case 'pending':
        return { text: '等待中', color: 'text-gray-secondary' }
      case 'uploading':
        return { text: '上传中...', color: 'text-primary' }
      case 'recognizing':
        return { text: '识别中...', color: 'text-primary' }
      case 'done':
        return { text: '识别完成', color: 'text-success' }
      case 'error':
        return { text: '识别失败', color: 'text-danger' }
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    const doneImages = images.filter((img) => img.status === 'done')
    if (doneImages.length === 0) {
      toast.error('没有可保存的识别结果')
      return
    }

    setIsProcessing(true)
    try {
      const data: Record<string, number> = {}
      Object.entries(formData).forEach(([key, raw]) => {
        const value = raw ? parseFloat(raw.split('|')[0]) : NaN
        if (!isNaN(value)) data[key] = value
      })

      await ocrApi.confirm({
        imageIds: doneImages.map((img) => img.imageId!),
        recordDate,
        data,
      })

      toast.success(`保存成功，共录入 ${doneImages.length} 张报告`)
      navigate('/records')
    } catch (error: any) {
      toast.error(error.response?.data?.message || '保存失败')
    } finally {
      setIsProcessing(false)
    }
  }

  const hasAnyDone = images.some((img) => img.status === 'done')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} className="text-gray-text-primary" />
        </button>
        <h1 className="text-page-title font-semibold text-gray-text-primary">拍照识别</h1>
      </div>

      {/* 日期选择器 */}
      <div className="card">
        <label className="block text-helper text-gray-secondary mb-2">报告日期</label>
        <input
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          className="input-field w-full"
        />
        <p className="text-xs text-gray-helper mt-1">
          所有识别的指标将保存到该日期下，如与报告日期不一致会有提示
        </p>
      </div>

      {/* 上传区域 */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="card border-2 border-dashed border-gray-border hover:border-primary cursor-pointer transition-colors"
      >
        <div className="text-center py-8">
          <Upload size={36} className="text-gray-secondary mx-auto mb-3" />
          <p className="text-body text-gray-text-primary">点击上传化验单照片</p>
          <p className="text-small text-gray-secondary mt-1">支持 JPG、PNG 格式，可同时选择多张</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* 图片列表 */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-card-title font-medium text-gray-text-primary">
            已上传图片 ({images.length})
          </h2>

          {images.map((item) => {
            const statusInfo = getStatusInfo(item.status)
            const mismatch = hasDateMismatch(item)

            return (
              <div
                key={item.tempId}
                className={`card flex gap-3 ${
                  mismatch ? 'border-l-4 border-warning' : ''
                }`}
              >
                {/* 缩略图 */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <img
                    src={item.previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover rounded"
                  />
                  {item.status === 'uploading' || item.status === 'recognizing' ? (
                    <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center">
                      <Loader2 size={20} className="text-white animate-spin" />
                    </div>
                  ) : null}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-small font-medium ${statusInfo.color}`}>
                      {statusInfo.text}
                    </span>
                    {item.result && Object.keys(item.result.extracted).length > 0 && (
                      <span className="text-xs text-gray-helper">
                        提取到 {Object.keys(item.result.extracted).length} 个指标
                      </span>
                    )}
                  </div>

                  {item.result?.recordDate && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-gray-helper">
                        识别日期: {item.result.recordDate}
                      </span>
                      {mismatch && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-warning">
                          <AlertTriangle size={12} />
                          与选择日期不一致
                        </span>
                      )}
                    </div>
                  )}

                  {item.error && (
                    <p className="text-xs text-danger mt-1">{item.error}</p>
                  )}
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={() => handleRemoveImage(item.tempId)}
                  className="p-1.5 self-start text-gray-secondary hover:text-danger transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* 识别结果表单 */}
      {hasAnyDone && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-success" />
            <h2 className="text-card-title font-medium text-gray-text-primary">
              识别结果（请核对）
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {Object.entries(metricLabels).map(([key, label]) => {
              const confidence = getConfidence(key)
              const hasValue = !!formData[key]

              return (
                <div key={key}>
                  <label className="block text-small text-gray-secondary mb-1">
                    {label}
                    {hasValue && confidence > 0 && (
                      <span
                        className={`ml-1 text-xs ${
                          confidence >= 0.9
                            ? 'text-success'
                            : confidence >= 0.7
                            ? 'text-warning'
                            : 'text-danger'
                        }`}
                      >
                        {Math.round(confidence * 100)}%
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={getDisplayValue(key)}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="input-field w-full"
                    placeholder="未识别"
                  />
                </div>
              )
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary flex-1"
              disabled={isProcessing}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              className="btn-primary flex-1"
            >
              {isProcessing ? '保存中...' : '确认保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
