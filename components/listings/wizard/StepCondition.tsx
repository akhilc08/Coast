'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { conditionStepSchema, type ConditionStepInput } from '@/lib/validations/listing'
import { updateConditionAction } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { DocumentUpload } from '@/components/listings/DocumentUpload'

interface StepConditionProps {
  listingId:              string
  initialData?:           Partial<ConditionStepInput>
  initialInspectionDocs?: { id: string; storage_key: string; document_type: string; file_name: string }[]
  onSave:                 () => void
}

const GRADE_OPTIONS = [
  { value: 'excellent', label: 'Excellent', hint: 'Like new. No visible flaws, fully functional.' },
  { value: 'good',      label: 'Good',      hint: 'Minor wear consistent with age. No major defects.' },
  { value: 'fair',      label: 'Fair',      hint: 'Visible wear or minor issues. Functional but imperfect.' },
  { value: 'poor',      label: 'Poor',      hint: 'Significant wear or defects. May need repair.' },
  { value: 'salvage',   label: 'Salvage',   hint: 'Major damage or non-operational.' },
] as const

const CONDITION_OPTIONS = [
  { value: '',          label: 'Not assessed' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good',      label: 'Good' },
  { value: 'fair',      label: 'Fair' },
  { value: 'poor',      label: 'Poor' },
] as const

const REQUIRED_CONDITION_OPTIONS = [
  { value: '',          label: 'Select...' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good',      label: 'Good' },
  { value: 'fair',      label: 'Fair' },
  { value: 'poor',      label: 'Poor' },
] as const

const COMMON_ISSUES = [
  'Check engine light',
  'AC not working',
  'Power window issue',
  'Minor rust',
  'Oil leak',
  'Brake noise',
  'Transmission slip',
  'Coolant leak',
]

const selectClass = 'w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] focus:border-blue-600 focus:outline-none appearance-none'
const textareaClass = 'min-h-[72px] w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-blue-600 focus:outline-none resize-y'
const sectionClass = 'rounded-xl border border-[#e7e5e4] bg-white p-6 mb-6'

export function StepCondition({ listingId, initialData, initialInspectionDocs = [], onSave }: StepConditionProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [issueInput, setIssueInput] = useState('')

  const form = useForm<ConditionStepInput>({
    resolver: zodResolver(conditionStepSchema) as never,
    defaultValues: {
      overall_grade:          (initialData?.overall_grade as ConditionStepInput['overall_grade']) ?? undefined,
      overall_notes:          initialData?.overall_notes          ?? '',
      paint_condition:        (initialData?.paint_condition as ConditionStepInput['paint_condition']) ?? undefined,
      body_condition:         (initialData?.body_condition as ConditionStepInput['body_condition']) ?? undefined,
      glass_condition:        (initialData?.glass_condition as ConditionStepInput['glass_condition']) ?? undefined,
      exterior_notes:         initialData?.exterior_notes         ?? '',
      seat_condition:         (initialData?.seat_condition as ConditionStepInput['seat_condition']) ?? undefined,
      dashboard_condition:    (initialData?.dashboard_condition as ConditionStepInput['dashboard_condition']) ?? undefined,
      carpet_condition:       (initialData?.carpet_condition as ConditionStepInput['carpet_condition']) ?? undefined,
      interior_notes:         initialData?.interior_notes         ?? '',
      engine_condition:       (initialData?.engine_condition as ConditionStepInput['engine_condition']) ?? undefined,
      transmission_condition: (initialData?.transmission_condition as ConditionStepInput['transmission_condition']) ?? undefined,
      brake_condition:        (initialData?.brake_condition as ConditionStepInput['brake_condition']) ?? undefined,
      tire_condition:         (initialData?.tire_condition as ConditionStepInput['tire_condition']) ?? undefined,
      tire_tread_depth:       initialData?.tire_tread_depth       ?? undefined,
      mechanical_notes:       initialData?.mechanical_notes       ?? '',
      known_issues:           initialData?.known_issues           ?? [],
      has_accident_history:   initialData?.has_accident_history   ?? false,
      has_flood_damage:       initialData?.has_flood_damage        ?? false,
      has_frame_damage:       initialData?.has_frame_damage        ?? false,
      has_rebuilt_title:      initialData?.has_rebuilt_title       ?? false,
      has_lien:               initialData?.has_lien                ?? false,
      is_former_rental:       initialData?.is_former_rental        ?? false,
    },
  })

  const { setValue, watch } = form
  const currentGrade  = watch('overall_grade')
  const currentIssues = watch('known_issues')

  function addIssue(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    if (currentIssues.includes(trimmed)) return
    setValue('known_issues', [...currentIssues, trimmed], { shouldValidate: true })
    setIssueInput('')
  }

  function removeIssue(issue: string) {
    setValue('known_issues', currentIssues.filter(i => i !== issue), { shouldValidate: true })
  }

  async function onSubmit(data: ConditionStepInput) {
    setServerError(null)
    const result = await updateConditionAction(listingId, data)
    if ('error' in result) {
      setServerError(result.error)
      return
    }
    onSave()
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Condition Assessment</h2>
      <p className="mb-6 text-sm text-[#78716c]">Describe the vehicle's current condition. Accurate details build buyer trust.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit as never)}>

          {/* ── Section 1: Overall Grade ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Overall Grade</h3>
            <p className="mb-4 text-sm text-[#78716c]">Give the vehicle an overall condition rating.</p>

            <FormField
              control={form.control}
              name="overall_grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Overall Grade *</FormLabel>
                  <FormControl>
                    <div className="mt-1 flex gap-2">
                      {GRADE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={`flex-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors ${
                            field.value === opt.value
                              ? 'border-blue-600 bg-blue-50 text-blue-600'
                              : 'border-[#e7e5e4] bg-white text-[#78716c] hover:border-[#a8a29e]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  {currentGrade && (
                    <p className="mt-1.5 text-xs text-[#a8a29e]">
                      {GRADE_OPTIONS.find(o => o.value === currentGrade)?.hint}
                    </p>
                  )}
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <div className="mt-4">
              <FormField
                control={form.control}
                name="overall_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#78716c]">Summary Notes</FormLabel>
                    <FormControl>
                      <textarea
                        className={textareaClass}
                        placeholder="Brief overview of the vehicle's condition..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── Section 2: Exterior ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Exterior</h3>
            <p className="mb-4 text-sm text-[#78716c]">Assess paint, body panels, and glass.</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="paint_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Paint Condition *</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {REQUIRED_CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} disabled={o.value === ''}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="body_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Body Panels *</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {REQUIRED_CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} disabled={o.value === ''}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="glass_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Glass & Windows</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>

            <div className="mt-4">
              <FormField control={form.control} name="exterior_notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Exterior Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className={textareaClass}
                      placeholder="e.g. Small scratch on rear bumper, paint fade on hood..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>
          </div>

          {/* ── Section 3: Interior ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Interior</h3>
            <p className="mb-4 text-sm text-[#78716c]">Seats, dashboard, carpet, and trim.</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="seat_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Seats & Upholstery *</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {REQUIRED_CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} disabled={o.value === ''}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="dashboard_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Dashboard & Trim</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="carpet_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Carpet & Headliner</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>

            <div className="mt-4">
              <FormField control={form.control} name="interior_notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Interior Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className={textareaClass}
                      placeholder="e.g. Minor wear on driver seat, all electronics functional..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>
          </div>

          {/* ── Section 4: Mechanical ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Mechanical</h3>
            <p className="mb-4 text-sm text-[#78716c]">Engine, drivetrain, brakes, and tires.</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="engine_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Engine *</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {REQUIRED_CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} disabled={o.value === ''}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="transmission_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Transmission</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="brake_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Brakes</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="tire_condition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Tires</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value || undefined)}
                    >
                      {CONDITION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />

              <FormField control={form.control} name="tire_tread_depth" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Tread Depth (mm)</FormLabel>
                  <FormControl>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      step={1}
                      className="w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-blue-600 focus:outline-none"
                      placeholder="e.g. 7"
                      value={field.value ?? ''}
                      onChange={e => {
                        const val = e.target.value
                        field.onChange(val === '' ? undefined : parseInt(val, 10))
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>

            <div className="mt-4">
              <FormField control={form.control} name="mechanical_notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#78716c]">Mechanical Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className={textareaClass}
                      placeholder="e.g. Recent brake job, new tires installed 6 months ago..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )} />
            </div>
          </div>

          {/* ── Section 5: Known Issues ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Known Issues</h3>
            <p className="mb-4 text-sm text-[#78716c]">Tag any known problems. Buyers appreciate honesty.</p>

            {currentIssues.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {currentIssues.map(issue => (
                  <span
                    key={issue}
                    className="flex items-center gap-1.5 rounded-full border border-[#e7e5e4] bg-[#fafaf9] px-3 py-1 text-sm text-[#1c1917]"
                  >
                    {issue}
                    <button
                      type="button"
                      onClick={() => removeIssue(issue)}
                      className="text-[#a8a29e] hover:text-[#1c1917]"
                      aria-label={`Remove ${issue}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={issueInput}
                onChange={e => setIssueInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIssue(issueInput) } }}
                placeholder="Type an issue and press + to add..."
                className="flex-1 rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-blue-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => addIssue(issueInput)}
                className="rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#78716c] hover:border-[#1c1917] hover:text-[#1c1917]"
              >
                + Add
              </button>
            </div>

            <p className="mt-2 text-xs text-[#a8a29e]">
              Common:{' '}
              {COMMON_ISSUES.map((issue, i) => (
                <span key={issue}>
                  <button
                    type="button"
                    onClick={() => addIssue(issue)}
                    className="underline hover:text-[#78716c]"
                  >
                    {issue}
                  </button>
                  {i < COMMON_ISSUES.length - 1 && ' · '}
                </span>
              ))}
            </p>
          </div>

          {/* ── Section 6: Seller Disclosures ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Seller Disclosures</h3>
            <p className="mb-4 text-sm text-[#78716c]">Check all that apply. Honest disclosures build buyer trust.</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                { name: 'has_accident_history', label: 'Prior accident history' },
                { name: 'has_flood_damage',     label: 'Flood or water damage' },
                { name: 'has_frame_damage',     label: 'Frame or structural damage' },
                { name: 'has_rebuilt_title',    label: 'Rebuilt or salvage title' },
                { name: 'has_lien',             label: 'Active lien on vehicle' },
                { name: 'is_former_rental',     label: 'Former rental or fleet vehicle' },
              ] as const).map(({ name, label }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2.5">
                      <FormControl>
                        <input
                          type="checkbox"
                          id={name}
                          checked={field.value}
                          onChange={e => field.onChange(e.target.checked)}
                          className="h-4 w-4 cursor-pointer accent-blue-600"
                        />
                      </FormControl>
                      <FormLabel htmlFor={name} className="cursor-pointer text-sm font-normal text-[#1c1917]">
                        {label}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          {/* ── Section 7: Inspection Report ── */}
          <div className={sectionClass}>
            <h3 className="mb-1 text-base font-semibold text-[#1c1917]">Inspection Report</h3>
            <p className="mb-1 text-sm text-[#78716c]">Upload a third-party inspection report (PDF). Optional but increases buyer confidence.</p>
            <p className="mb-4 text-xs text-[#a8a29e]">You can continue without uploading a report.</p>

            <DocumentUpload
              listingId={listingId}
              initialDocs={initialInspectionDocs}
              lockedDocumentType="inspection_report"
            />
          </div>

          {serverError && (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {form.formState.isSubmitting ? 'Saving...' : 'Save & Continue'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
