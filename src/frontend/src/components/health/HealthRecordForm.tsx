import { useEffect, useMemo, useState } from 'react'
import {
  Droplets,
  FlaskConical,
  HeartPulse,
  Save,
  Scale,
} from 'lucide-react'
import {
  buildHealthRecordPayload,
  createHealthRecordFormValues,
  getFieldsForMode,
  type HealthRecordFieldKey,
  type HealthRecordFormMode,
  type HealthRecordFormValues,
  type HealthRecordLike,
  type HealthRecordPayload,
  type HealthRecordQuickType,
} from '../../services/healthRecordFields'

const FIELD_ICONS: Record<HealthRecordFieldKey, typeof Scale> = {
  weight: Scale,
  urineVolume: Droplets,
  bloodPressureSystolic: HeartPulse,
  bloodPressureDiastolic: HeartPulse,
  heartRate: HeartPulse,
  creatinine: FlaskConical,
  egfr: FlaskConical,
  urea: FlaskConical,
  potassium: FlaskConical,
  sodium: FlaskConical,
  phosphorus: FlaskConical,
  hemoglobin: FlaskConical,
  bloodSugar: FlaskConical,
  uricAcid: FlaskConical,
  urineProteinCreatinineRatio: FlaskConical,
  urineAlbuminCreatinineRatio: FlaskConical,
  urineOccultBlood: FlaskConical,
  tacrolimus: FlaskConical,
  bkVirusCopies: FlaskConical,
  cmvVirusCopies: FlaskConical,
  ebvVirusCopies: FlaskConical,
}

interface HealthRecordFormProps {
  mode: HealthRecordFormMode
  quickType?: HealthRecordQuickType
  initialRecord?: Partial<HealthRecordLike>
  submitLabel?: string
  submittingLabel?: string
  showNotes?: boolean
  resetAfterSubmit?: boolean
  onSubmit: (payload: HealthRecordPayload, values: HealthRecordFormValues) => Promise<void>
}

export default function HealthRecordForm({
  mode,
  quickType = null,
  initialRecord,
  submitLabel = '保存记录',
  submittingLabel = '保存中...',
  showNotes,
  resetAfterSubmit = false,
  onSubmit,
}: HealthRecordFormProps) {
  const [values, setValues] = useState(() => createHealthRecordFormValues(initialRecord))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setValues(createHealthRecordFormValues(initialRecord))
  }, [initialRecord])

  const fields = useMemo(() => getFieldsForMode(mode, quickType), [mode, quickType])
  const visibleCategories = useMemo(() => Array.from(new Set(fields.map((field) => field.category))), [fields])
  const shouldShowNotes = showNotes ?? !quickType

  const handleChange = (field: keyof HealthRecordFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      await onSubmit(buildHealthRecordPayload(values), values)
      if (resetAfterSubmit) {
        setValues(createHealthRecordFormValues())
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-helper font-medium text-gray-text-secondary">记录日期</label>
        <input
          type="date"
          value={values.recordDate}
          onChange={(event) => handleChange('recordDate', event.target.value)}
          className="input-field"
          required
        />
      </div>

      {visibleCategories.map((category) => {
        const categoryFields = fields.filter((field) => field.category === category)
        const title = category === 'daily' ? '日常指标' : '化验指标'

        return (
          <div key={category} className="space-y-4">
            {mode === 'full' && !quickType && (
              <div>
                <p className="section-kicker">{title}</p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {categoryFields.map((field) => {
                const Icon = FIELD_ICONS[field.key]
                const inputPadding = field.unit.length > 8 ? 'pr-32' : 'pr-20'

                return (
                  <div key={field.key}>
                    <label className="mb-2 flex items-center gap-1.5 text-helper font-medium text-gray-text-secondary">
                      <Icon size={15} />
                      {field.label}
                    </label>
                    <div className="relative">
                      <input
                        type={field.valueType === 'text' ? 'text' : 'number'}
                        step={field.valueType === 'text' ? undefined : field.step}
                        value={values[field.key]}
                        onChange={(event) => handleChange(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        className={`input-field ${field.unit ? inputPadding : ''}`}
                      />
                      {field.unit && (
                        <span className="absolute right-4 top-1/2 max-w-[7rem] -translate-y-1/2 truncate text-helper text-gray-text-secondary">
                          {field.unit}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {shouldShowNotes && (
        <div>
          <label className="mb-2 block text-helper font-medium text-gray-text-secondary">备注</label>
          <textarea
            value={values.notes}
            onChange={(event) => handleChange('notes', event.target.value)}
            placeholder="添加备注信息..."
            rows={3}
            className="input-field resize-none"
          />
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        <Save size={19} />
        {submitting ? submittingLabel : submitLabel}
      </button>
    </form>
  )
}
