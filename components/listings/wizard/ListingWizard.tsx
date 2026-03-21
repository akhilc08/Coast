'use client'

import { useState } from 'react'
import { STEPS, type Step } from './steps'
import { WizardProgress } from './WizardProgress'
import { StepVinLookup } from './StepVinLookup'
import { StepVehicleDetails } from './StepVehicleDetails'
import { StepCondition } from './StepCondition'
import { StepConditionReview } from './StepConditionReview'
import { StepPhotos } from './StepPhotos'
import { StepDocuments } from './StepDocuments'
import { StepReview } from './StepReview'
import type { AiConditionData } from '@/lib/types/condition'

interface ListingWizardProps {
  listingId?:   string
  initialData?: Record<string, unknown>
}

export function ListingWizard({ listingId, initialData }: ListingWizardProps) {
  const alreadyLocked = !!(initialData?.condition_locked)

  const initialStep: Step = listingId
    ? (alreadyLocked ? 'condition_review' : 'details')
    : 'vin'

  const [step, setStep]     = useState<Step>(initialStep)
  const [draftId, setDraftId] = useState<string | null>(listingId ?? null)
  const [vinData, setVinData] = useState<Record<string, unknown> | null>(null)

  const [aiData, setAiData] = useState<AiConditionData | null>(
    initialData?.ai_condition_exterior
      ? {
          exterior:   initialData.ai_condition_exterior   as AiConditionData['exterior'],
          interior:   initialData.ai_condition_interior   as AiConditionData['interior'],
          mechanical: initialData.ai_condition_mechanical as AiConditionData['mechanical'],
          tires:      initialData.ai_condition_tires      as AiConditionData['tires'],
        }
      : null
  )
  const [pdfStorageKey, setPdfKey] = useState<string>(
    (initialData?.condition_pdf_key as string) ?? ''
  )

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

      {step === 'condition' && draftId && (
        <StepCondition
          listingId={draftId}
          alreadyLocked={alreadyLocked}
          onSkipToReview={() => setStep('condition_review')}
          onAiExtracted={(data, storageKey) => {
            setAiData(data)
            setPdfKey(storageKey)
            advance()
          }}
        />
      )}

      {step === 'condition_review' && draftId && aiData && (
        <StepConditionReview
          listingId={draftId}
          data={aiData}
          pdfStorageKey={pdfStorageKey}
          onSave={advance}
        />
      )}

      {step === 'condition_review' && draftId && !aiData && (
        <div className="rounded-xl border border-[#e7e5e4] bg-white p-8 text-center">
          <p className="text-sm text-[#78716c]">No condition data found.</p>
          <button
            onClick={() => setStep('condition')}
            className="mt-4 text-sm text-blue-600 hover:text-blue-500"
          >
            ← Back to upload
          </button>
        </div>
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
  )
}
