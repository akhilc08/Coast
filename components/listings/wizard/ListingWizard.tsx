'use client'

import { useState } from 'react'
import { STEPS, type Step } from './steps'
import { WizardProgress } from './WizardProgress'
import { StepVinLookup } from './StepVinLookup'
import { StepVehicleDetails } from './StepVehicleDetails'
import { StepCondition } from './StepCondition'
import { StepPhotos } from './StepPhotos'
import { StepReview } from './StepReview'
import type { ConditionStepInput } from '@/lib/validations/listing'

interface ListingWizardProps {
  listingId?:   string
  initialData?: Record<string, unknown>
}

export function ListingWizard({ listingId, initialData }: ListingWizardProps) {
  const [step, setStep]     = useState<Step>(listingId ? 'details' : 'vin')
  const [draftId, setDraftId] = useState<string | null>(listingId ?? null)
  const [vinData, setVinData] = useState<Record<string, unknown> | null>(null)

  function advance() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  // Extract condition fields from initialData for StepCondition
  const conditionInitialData: Partial<ConditionStepInput> | undefined = initialData
    ? {
        overall_grade:          initialData.overall_grade          as ConditionStepInput['overall_grade'],
        overall_notes:          initialData.overall_notes          as string | undefined,
        paint_condition:        initialData.paint_condition        as ConditionStepInput['paint_condition'],
        body_condition:         initialData.body_condition         as ConditionStepInput['body_condition'],
        glass_condition:        initialData.glass_condition        as ConditionStepInput['glass_condition'],
        exterior_notes:         initialData.exterior_notes         as string | undefined,
        seat_condition:         initialData.seat_condition         as ConditionStepInput['seat_condition'],
        dashboard_condition:    initialData.dashboard_condition    as ConditionStepInput['dashboard_condition'],
        carpet_condition:       initialData.carpet_condition       as ConditionStepInput['carpet_condition'],
        interior_notes:         initialData.interior_notes         as string | undefined,
        engine_condition:       initialData.engine_condition       as ConditionStepInput['engine_condition'],
        transmission_condition: initialData.transmission_condition as ConditionStepInput['transmission_condition'],
        brake_condition:        initialData.brake_condition        as ConditionStepInput['brake_condition'],
        tire_condition:         initialData.tire_condition         as ConditionStepInput['tire_condition'],
        tire_tread_depth:       initialData.tire_tread_depth       as number | undefined,
        mechanical_notes:       initialData.mechanical_notes       as string | undefined,
        known_issues:           (initialData.known_issues          as string[]) ?? [],
        has_accident_history:   (initialData.has_accident_history  as boolean) ?? false,
        has_flood_damage:       (initialData.has_flood_damage      as boolean) ?? false,
        has_frame_damage:       (initialData.has_frame_damage      as boolean) ?? false,
        has_rebuilt_title:      (initialData.has_rebuilt_title     as boolean) ?? false,
        has_lien:               (initialData.has_lien              as boolean) ?? false,
        is_former_rental:       (initialData.is_former_rental      as boolean) ?? false,
      }
    : undefined

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
          initialData={conditionInitialData}
          initialInspectionDocs={
            (initialData?.listing_documents as { id: string; storage_key: string; document_type: string; file_name: string }[] | undefined)
              ?.filter(d => d.document_type === 'inspection_report') ?? []
          }
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

{step === 'review' && draftId && (
        <StepReview listingId={draftId} />
      )}
    </div>
  )
}
