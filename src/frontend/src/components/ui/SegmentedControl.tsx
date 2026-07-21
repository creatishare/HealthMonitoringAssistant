interface SegmentedControlOption<T extends string> {
  label: string
  value: T
}

interface SegmentedControlProps<T extends string> {
  options: Array<SegmentedControlOption<T>>
  value: T
  onChange: (value: T) => void
  className?: string
}

export default function SegmentedControl<T extends string>({ options, value, onChange, className = '' }: SegmentedControlProps<T>) {
  return (
    <div
      className={`grid gap-2 rounded-[18px] border border-gray-border bg-white/56 p-1 dark:bg-slate-900/30 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`h-9 rounded-[14px] text-helper font-medium transition-all ${
            value === option.value
              ? 'bg-primary text-white shadow-[0_10px_22px_rgba(62,99,221,0.18)]'
              : 'text-gray-text-secondary hover:text-primary'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
