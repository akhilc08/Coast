type Step = 'vin' | 'details' | 'photos' | 'documents' | 'review'
const STEP_LABELS: Record<Step, string> = {
  vin: 'VIN Lookup',
  details: 'Vehicle Details',
  photos: 'Photos',
  documents: 'Documents',
  review: 'Review & Publish',
}
const STEPS: Step[] = ['vin', 'details', 'photos', 'documents', 'review']

export function WizardProgress({ current }: { current: Step }) {
  const currentIdx = STEPS.indexOf(current)
  return (
    <div className="mb-8 flex items-center justify-between">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            i < currentIdx ? 'bg-blue-600 text-white' :
            i === currentIdx ? 'border-2 border-blue-600 bg-zinc-950 text-blue-400' :
            'border border-zinc-700 bg-zinc-950 text-zinc-600'
          }`}>
            {i < currentIdx ? '✓' : i + 1}
          </div>
          <span className={`ml-2 hidden text-xs sm:block ${i === currentIdx ? 'text-zinc-100' : 'text-zinc-600'}`}>
            {STEP_LABELS[step]}
          </span>
          {i < STEPS.length - 1 && <div className="mx-3 h-px w-8 bg-zinc-800 sm:w-16" />}
        </div>
      ))}
    </div>
  )
}
