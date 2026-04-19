interface StepperProps {
  steps: { label: string }[]
  current: number  // 1-based
}

/**
 * Generic 4-adımlı stepper. Material symbols + Tailwind, eksternal lib yok.
 * a11y: aria-current="step" current adımda.
 */
export function Stepper({ steps, current }: StepperProps) {
  return (
    <div
      className="flex items-center gap-2 mb-4"
      role="navigation"
      aria-label="Adımlar"
    >
      {steps.map((s, i) => {
        const num = i + 1
        const state =
          num < current ? 'done' : num === current ? 'current' : 'todo'
        const dotClass =
          state === 'done'
            ? 'bg-success text-white'
            : state === 'current'
              ? 'bg-primary text-white'
              : 'bg-surface-container-low text-on-surface-variant border border-outline-variant'
        return (
          <div key={s.label} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dotClass}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {state === 'done' ? '✓' : num}
            </div>
            <span
              className={`text-xs ${state === 'current' ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 bg-surface-container-low rounded" />
            )}
          </div>
        )
      })}
    </div>
  )
}
