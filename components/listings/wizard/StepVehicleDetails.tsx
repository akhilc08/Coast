// components/listings/wizard/StepVehicleDetails.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { detailsStepSchema, type DetailsStepInput } from '@/lib/validations/listing'
import { updateListingAction } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { ChevronLeft } from 'lucide-react'

interface StepVehicleDetailsProps {
  listingId: string
  initialData?: Record<string, unknown>
  listingStatus?: string
  onSave: () => void
  onBack?: () => void
}

export function StepVehicleDetails({ listingId, initialData, listingStatus, onSave, onBack }: StepVehicleDetailsProps) {
  const isPendingInspection = listingStatus === 'pending_inspection'
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<DetailsStepInput & { price: number }>({
    resolver: zodResolver(detailsStepSchema.extend({ price: detailsStepSchema.shape.price_cents.optional() }).omit({ price_cents: true }).extend({ price: detailsStepSchema.shape.price_cents.optional() })) as never,
    defaultValues: {
      make:            (initialData?.make as string) ?? '',
      model:           (initialData?.model as string) ?? '',
      year:            (initialData?.year as number) ?? new Date().getFullYear(),
      mileage:         (initialData?.mileage as number) ?? 0,
      price:           initialData?.price_cents ? (initialData.price_cents as number) / 100 : undefined,
      color:           (initialData?.color as string) ?? '',
      condition_notes: (initialData?.condition_notes as string) ?? '',
      pickup_zip:      (initialData?.pickup_zip as string) ?? '',
    },
  })

  async function onSubmit(data: DetailsStepInput & { price: number }) {
    setServerError(null)
    const { price, ...rest } = data as { price: number } & Omit<DetailsStepInput, 'price_cents'>
    const result = await updateListingAction(listingId, { ...rest, ...(price ? { price_cents: Math.round(price * 100) } : {}) })
    if ('error' in result) {
      setServerError(result.error)
      return
    }
    onSave()
  }

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-4 sm:p-6">
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Vehicle Details</h2>
      <p className="mb-6 text-sm text-[#78716c]">Fill in the vehicle details. Pre-filled fields are editable.</p>

      {isPendingInspection && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-700">
            This listing is pending inspection. Make, model, year, and price are locked until inspection is complete.
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit as never)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="make" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Make *</FormLabel>
                <FormControl><Input className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="Honda" disabled={isPendingInspection} {...field} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
            <FormField control={form.control} name="model" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Model *</FormLabel>
                <FormControl><Input className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="Accord" disabled={isPendingInspection} {...field} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="year" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Year *</FormLabel>
                <FormControl><Input type="number" className="border-[#e7e5e4] bg-white text-[#1c1917]" disabled={isPendingInspection} {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
            <FormField control={form.control} name="mileage" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Mileage *</FormLabel>
                <FormControl><Input type="number" className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="45000" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name={"price" as never} render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Price (USD) *</FormLabel>
                <FormControl><Input type="number" step="0.01" className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="15000" disabled={isPendingInspection} {...field} value={field.value ?? ''} onChange={e => { const v = parseFloat(e.target.value); field.onChange(isNaN(v) ? undefined : v) }} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
            <FormField control={form.control} name="color" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Color</FormLabel>
                <FormControl><Input className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="Silver" {...field} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="condition_notes" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#78716c]">Condition Notes</FormLabel>
              <FormControl>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-blue-600 focus:outline-none"
                  placeholder="Describe the vehicle condition..."
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )} />

          <FormField control={form.control} name={"pickup_zip" as never} render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#78716c]">Vehicle Pickup ZIP *</FormLabel>
              <FormControl>
                <Input
                  className="border-[#e7e5e4] bg-white text-[#1c1917]"
                  placeholder="78701"
                  maxLength={5}
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-[#a8a29e] mt-1">ZIP code where buyers will pick up or where transport begins</p>
              <FormMessage className="text-red-500" />
            </FormItem>
          )} />

          {serverError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
          )}

          <div className="flex gap-3">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack} className="flex-1 border-[#e7e5e4] text-[#78716c] hover:border-[#1c1917] hover:text-[#1c1917]">
                Back
              </Button>
            )}
            <Button type="submit" disabled={form.formState.isSubmitting} className={`${onBack ? 'flex-1' : 'w-full'} bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50`}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save & Continue'}
            </Button>
          </div>
        </form>
      </Form>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-4 flex items-center gap-1 text-sm text-[#a8a29e] hover:text-[#78716c] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      )}
    </div>
  )
}
