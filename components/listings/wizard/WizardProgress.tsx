import { STEPS, STEP_LABELS, type Step } from './steps'

interface WizardProgressProps {
  current: Step
  maxReached?: Step
  onStepClick?: (step: Step) => void
}

export function WizardProgress({ current, maxReached, onStepClick }: WizardProgressProps) {
  const currentIdx  = STEPS.indexOf(current)
  const maxIdx      = maxReached ? STEPS.indexOf(maxReached) : currentIdx

  return (
    <div className="flex items-center justify-center">
      {STEPS.map((step, i) => {
        const clickable = onStepClick && i <= maxIdx && i !== currentIdx
        return (
          <div key={step} className="flex items-center">
            <div
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onStepClick(step) : undefined}
              onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onStepClick(step) } : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i < currentIdx  ? 'bg-blue-600 text-white'                    :
                i === currentIdx ? 'border-2 border-blue-600 bg-white text-blue-600' :
                                   'border border-[#e7e5e4] bg-white text-[#a8a29e]'
              } ${clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
            >
              {i < currentIdx ? '✓' : i + 1}
            </div>
            <span className={`ml-2 hidden text-xs sm:block ${i === currentIdx ? 'text-[#1c1917]' : 'text-[#a8a29e]'}`}>
              {STEP_LABELS[step]}
            </span>
            {i < STEPS.length - 1 && <div className="mx-1.5 sm:mx-3 h-px w-4 sm:w-16 bg-[#e7e5e4]" />}
          </div>
        )
      })}
    </div>
  )
}
