'use client'

import { useState } from 'react'
import { STEPS, type Step } from './steps'
import { WizardProgress } from './WizardProgress'
import { StepVinLookup } from './StepVinLookup'
import { StepVehicleDetails } from './StepVehicleDetails'
import { StepPhotos } from './StepPhotos'
import { StepReview } from './StepReview'

interface ListingWizardProps {
  listingId?:   string
  initialData?: Record<string, unknown>
  sellerTier?:  number
}

export function ListingWizard({ listingId, initialData, sellerTier = 1 }: ListingWizardProps) {
  const initialStep: Step = listingId ? 'details' : 'vin'
  // When editing an existing listing, treat all steps as already reachable
  const initialMax:  Step = listingId ? 'review' : 'vin'

  const [step, setStep]           = useState<Step>(initialStep)
  const [maxReached, setMaxReached] = useState<Step>(initialMax)
  const [draftId, setDraftId]     = useState<string | null>(listingId ?? null)
  const [vinData, setVinData]     = useState<Record<string, unknown> | null>(null)

  const listingStatus = (initialData?.status as string | undefined) ?? 'draft'

  function advance() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) {
      const next = STEPS[idx + 1]
      setStep(next)
      if (STEPS.indexOf(next) > STEPS.indexOf(maxReached)) setMaxReached(next)
    }
  }

  function goBack() {
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  function jumpToStep(target: Step) {
    setStep(target)
  }

  // In edit mode, back from the first editable step (details) has nowhere to go
  const canGoBack = STEPS.indexOf(step) > (listingId ? 1 : 0)

  return (
    <div>
      <div className="mb-8">
        <WizardProgress current={step} maxReached={maxReached} onStepClick={jumpToStep} />
      </div>
      <div className="mx-auto max-w-2xl">
        {step === 'vin' && (
          <StepVinLookup
            onSuccess={(id, vehicle) => {
              setDraftId(id)
              if (vehicle) setVinData({ make: vehicle.make, model: vehicle.model, year: vehicle.year })
              advance()
            }}
          />
        )}

        {step === 'details' && draftId && (
          <StepVehicleDetails
            listingId={draftId}
            initialData={vinData ?? initialData}
            listingStatus={listingStatus}
            onSave={advance}
            onBack={canGoBack ? goBack : undefined}
          />
        )}

        {step === 'photos' && draftId && (
          <StepPhotos
            listingId={draftId}
            initialPhotos={(initialData?.listing_photos as { id: string; storage_key: string; position: number; slot_type: string | null }[]) ?? []}
            onSave={advance}
            onBack={goBack}
          />
        )}

        {step === 'review' && draftId && (
          <StepReview
            listingId={draftId}
            listingStatus={listingStatus}
            sellerTier={sellerTier}
            onBack={goBack}
          />
        )}
      </div>
    </div>
  )
}
