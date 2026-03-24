export type Step = 'vin' | 'details' | 'photos' | 'documents' | 'review'

export const STEPS: Step[] = ['vin', 'details', 'photos', 'documents', 'review']

export const STEP_LABELS: Record<Step, string> = {
  vin:       'VIN Lookup',
  details:   'Vehicle Details',
  photos:    'Photos',
  documents: 'Documents',
  review:    'Review & Submit',
}
