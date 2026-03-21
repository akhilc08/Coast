export type Step = 'vin' | 'details' | 'condition' | 'condition_review' | 'photos' | 'documents' | 'review'

export const STEPS: Step[] = ['vin', 'details', 'condition', 'condition_review', 'photos', 'documents', 'review']

export const STEP_LABELS: Record<Step, string> = {
  vin:              'VIN Lookup',
  details:          'Vehicle Details',
  condition:        'Upload Report',
  condition_review: 'Condition Review',
  photos:           'Photos',
  documents:        'Documents',
  review:           'Review & Publish',
}
