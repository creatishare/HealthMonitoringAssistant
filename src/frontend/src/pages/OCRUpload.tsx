import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Camera, X, CheckCircle } from 'lucide-react'
import { ocrApi, healthRecordApi } from '../services/api'
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

export default function OCRUpload() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    recordDate: new Date().toISOString().split('T')[0],
    creatinine: '',
    urea: '',
    potassium: '',
    sodium: '',
    phosphorus: '',
    uricAcid: '',
    hemoglobin: '',
    bloodSugar: '',
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 预览图片
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // 上传并识别
    setLoading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('image', file)

      const uploadRes: any = await ocrApi.upload(uploadFormData)
      console.log('上传响应:', uploadRes)

      if (uploadRes.code === 201 && uploadRes.data?.imageId) {
        toast.success('图片上传成功，正在识别...')
        const recognizeRes: any = await ocrApi.recognize(uploadRes.data.imageId)
        console.log('识别响应:', recognizeRes)

        if (recognizeRes.code === 200 && recognizeRes.data) {
          setOcrResult(recognizeRes.data)
          fillFormWithOCRResult(recognizeRes.data)
          const extractedCount = Object.keys(recognizeRes.data.extracted || {}).length
          if (extractedCount > 0) {
            toast.success(`识别成功，提取到 ${extractedCount} 个指标，请核对数据`)
          } else {
            toast('未识别到指标，请手动录入', { icon: '⚠️' })
          }
        } else {
          toast.error(recognizeRes.message || '识别失败')
        }
      } else {
        toast.error(uploadRes.message || '上传失败')
      }
    } catch (error: any) {
      console.error('OCR上传失败:', error)
      toast.error(error.response?.data?.message || '识别失败，请手动录入')
    } finally {
      setLoading(false)
    }
  }

  const fillFormWithOCRResult = (result: OCRResult) => {
    const newFormData = { ...formData }

    if (result.recordDate) {
      newFormData.recordDate = result.recordDate
    }

    Object.entries(result.extracted).forEach(([key, data]) => {
      if (key in newFormData) {
        (newFormData as any)[key] = String(data.value)
      }
    })

    setFormData(newFormData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const data = {
        recordDate: formData.recordDate,
        creatinine: formData.creatinine ? parseFloat(formData.creatinine) : undefined,
        urea: formData.urea ? parseFloat(formData.urea) : undefined,
        potassium: formData.potassium ? parseFloat(formData.potassium) : undefined,
        sodium: formData.sodium ? parseFloat(formData.sodium) : undefined,
        phosphorus: formData.phosphorus ? parseFloat(formData.phosphorus) : undefined,
        uricAcid: formData.uricAcid ? parseFloat(formData.uricAcid) : undefined,
        hemoglobin: formData.hemoglobin ? parseFloat(formData.hemoglobin) : undefined,
        bloodSugar: formData.bloodSugar ? parseFloat(formData.bloodSugar) : undefined,
      }

      await healthRecordApi.create(data)
      toast.success('保存成功')
      navigate('/records')
    } catch (error) {
      toast.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const metricLabels: Record<string, string> = {
    creatinine: '血清肌酐',
    urea: '尿素氮',
    potassium: '血钾',
    sodium: '血钠',
    phosphorus: '血磷',
    uricAcid: '尿酸',
    hemoglobin: '血红蛋白',
    bloodSugar: '血糖',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} className="text-gray-text-primary" />
        </button>
        <h1 className="text-page-title font-semibold text-gray-text-primary">拍照识别</h1>
      </div>

      {/* 上传区域 */}
      {!previewUrl && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="card border-2 border-dashed border-gray-border hover:border-primary cursor-pointer transition-colors"
        >
          <div className="text-center py-12">
            <Camera size={48} className="text-gray-secondary mx-auto mb-4" />
            <p className="text-body text-gray-text-primary">点击上传化验单照片</p>
            <p className="text-small text-gray-secondary mt-2">支持 JPG、PNG 格式</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* 预览和识别结果 */}
      {previewUrl && (
        <div className="card space-y-4">
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-48 object-contain bg-gray-bg rounded"
            />
            <button
              onClick={() => {
                setPreviewUrl(null)
                setOcrResult(null)
              }}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow"
            >
              <X size={16} className="text-gray-secondary" />
            </button>
          </div>

          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-small text-gray-secondary mt-2">正在识别...</p>
            </div>
          )}

          {ocrResult && (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle size={18} />
              <span className="text-small">识别成功，请核对以下数据</span>
            </div>
          )}
        </div>
      )}

      {/* 识别结果表单 */}
      {previewUrl && (
        <div className="card space-y-4">
          <h2 className="text-card-title font-medium text-gray-text-primary">识别结果</h2>

          <div>
            <label className="block text-helper text-gray-secondary mb-2">记录日期</label>
            <input
              type="date"
              value={formData.recordDate}
              onChange={(e) => handleChange('recordDate', e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {Object.entries(metricLabels).map(([key, label]) => (
              <div key={key}>
                <label className="block text-small text-gray-secondary mb-1">{label}</label>
                <input
                  type="number"
                  step="0.01"
                  value={(formData as any)[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="input-field w-full"
                  placeholder="未识别"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary flex-1"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
