import { STEPS, STEP_LABELS, type Step } from './steps'

export function WizardProgress({ current }: { current: Step }) {
  const currentIdx = STEPS.indexOf(current)
  return (
    <div className="flex items-center justify-center">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            i < currentIdx ? 'bg-blue-600 text-white' :
            i === currentIdx ? 'border-2 border-blue-600 bg-white text-blue-600' :
            'border border-[#e7e5e4] bg-white text-[#a8a29e]'
          }`}>
            {i < currentIdx ? '✓' : i + 1}
          </div>
          <span className={`ml-2 hidden text-xs sm:block ${i === currentIdx ? 'text-[#1c1917]' : 'text-[#a8a29e]'}`}>
            {STEP_LABELS[step]}
          </span>
          {i < STEPS.length - 1 && <div className="mx-1.5 sm:mx-3 h-px w-4 sm:w-16 bg-[#e7e5e4]" />}
        </div>
      ))}
    </div>
  )
}
