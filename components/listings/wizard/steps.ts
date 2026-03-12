export type Step = 'vin' | 'details' | 'condition' | 'photos' | 'documents' | 'review'

export const STEPS: Step[] = ['vin', 'details', 'condition', 'photos', 'documents', 'review']

export const STEP_LABELS: Record<Step, string> = {
  vin:       'VIN Lookup',
  details:   'Vehicle Details',
  condition: 'Condition',
  photos:    'Photos',
  documents: 'Documents',
  review:    'Review & Publish',
}
