interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  tone?: 'primary' | 'medication'
}

const sizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

const toneClasses = {
  primary: 'border-primary',
  medication: 'border-medication',
}

export default function Spinner({ size = 'md', tone = 'primary' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="加载中"
      className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${toneClasses[tone]}`}
    />
  )
}
