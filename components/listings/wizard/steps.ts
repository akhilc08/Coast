export type Step = 'vin' | 'details' | 'photos' | 'review'

export const STEPS: Step[] = ['vin', 'details', 'photos', 'review']

export const STEP_LABELS: Record<Step, string> = {
  vin:     'VIN Lookup',
  details: 'Vehicle Details',
  photos:  'Photos',
  review:  'Review & Submit',
}
