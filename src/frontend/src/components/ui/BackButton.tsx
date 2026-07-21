import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface BackButtonProps {
  /** 自定义点击行为，默认 navigate(-1) */
  onClick?: () => void
  ariaLabel?: string
}

export default function BackButton({ onClick, ariaLabel = '返回' }: BackButtonProps) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick ?? (() => navigate(-1))}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-border bg-white/65 text-gray-text-primary backdrop-blur-xl transition-colors hover:text-primary dark:bg-white/5"
    >
      <ArrowLeft size={20} />
    </button>
  )
}
