export type Step = 'vin' | 'details' | 'condition' | 'condition_review' | 'photos' | 'review'

export const STEPS: Step[] = ['vin', 'details', 'condition', 'condition_review', 'photos', 'review']

export const STEP_LABELS: Record<Step, string> = {
  vin:              'VIN Lookup',
  details:          'Vehicle Details',
  condition:        'Upload Report',
  condition_review: 'Condition Review',
  photos:           'Photos',
  review:           'Review & Publish',
}
