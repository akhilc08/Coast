'use client'

import { useState } from 'react'
import { WizardProgress } from './WizardProgress'
import { StepVinLookup } from './StepVinLookup'
import { StepVehicleDetails } from './StepVehicleDetails'
import { StepPhotos } from './StepPhotos'
import { StepDocuments } from './StepDocuments'
import { StepReview } from './StepReview'

type Step = 'vin' | 'details' | 'photos' | 'documents' | 'review'
const STEPS: Step[] = ['vin', 'details', 'photos', 'documents', 'review']

interface ListingWizardProps {
  listingId?: string
  initialData?: Record<string, unknown>
}

export function ListingWizard({ listingId, initialData }: ListingWizardProps) {
  const [step, setStep] = useState<Step>(listingId ? 'details' : 'vin')
  const [draftId, setDraftId] = useState<string | null>(listingId ?? null)
  const [vinData, setVinData] = useState<Record<string, unknown> | null>(null)

  function advance() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  return (
    <div className="mx-auto max-w-2xl">
      <WizardProgress current={step} />
      {step === 'vin' && (
        <StepVinLookup
          onSuccess={(id, vehicle) => {
            setDraftId(id)
            if (vehicle) setVinData({ make: vehicle.make, model: vehicle.model, year: vehicle.year, trim: vehicle.trim, body_class: vehicle.bodyClass })
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
          initialPhotos={(initialData?.listing_photos as { id: string; storage_key: string; position: number }[]) ?? []}
          onSave={advance}
        />
      )}
      {step === 'documents' && draftId && (
        <StepDocuments
          listingId={draftId}
          initialDocs={(initialData?.listing_documents as { id: string; storage_key: string; document_type: string; original_name: string }[]) ?? []}
          onSave={advance}
        />
      )}
      {step === 'review' && draftId && (
        <StepReview listingId={draftId} />
      )}
    </div>
  )
}
