'use client'

import { useState } from 'react'
import { STEPS, type Step } from './steps'
import { WizardProgress } from './WizardProgress'
import { StepVinLookup } from './StepVinLookup'
import { StepVehicleDetails } from './StepVehicleDetails'
import { StepPhotos } from './StepPhotos'
import { StepDocuments } from './StepDocuments'
import { StepReview } from './StepReview'

interface ListingWizardProps {
  listingId?:   string
  initialData?: Record<string, unknown>
}

export function ListingWizard({ listingId, initialData }: ListingWizardProps) {
  const initialStep: Step = listingId ? 'details' : 'vin'

  const [step, setStep]       = useState<Step>(initialStep)
  const [draftId, setDraftId] = useState<string | null>(listingId ?? null)
  const [vinData, setVinData] = useState<Record<string, unknown> | null>(null)

  function advance() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  return (
    <div>
      <div className="mb-8">
        <WizardProgress current={step} />
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
            onSave={advance}
          />
        )}

        {step === 'photos' && draftId && (
          <StepPhotos
            listingId={draftId}
            initialPhotos={(initialData?.listing_photos as { id: string; storage_key: string; position: number; slot_type: string | null }[]) ?? []}
            onSave={advance}
          />
        )}

        {step === 'documents' && draftId && (
          <StepDocuments
            listingId={draftId}
            initialDocs={
              (initialData?.listing_documents as { id: string; storage_key: string; document_type: string; file_name: string }[] | undefined)
                ?.filter(d => d.document_type !== 'inspection_report') ?? []
            }
            onSave={advance}
          />
        )}

        {step === 'review' && draftId && (
          <StepReview listingId={draftId} />
        )}
      </div>
    </div>
  )
}
