'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { detailsStepSchema, type DetailsStepInput } from '@/lib/validations/listing'
import { updateListingAction } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

interface StepVehicleDetailsProps {
  listingId: string
  initialData?: Record<string, unknown>
  onSave: () => void
}

export function StepVehicleDetails({ listingId, initialData, onSave }: StepVehicleDetailsProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<DetailsStepInput & { price: number }>({
    resolver: zodResolver(detailsStepSchema.extend({ price: detailsStepSchema.shape.price_cents.optional() }).omit({ price_cents: true }).extend({ price: detailsStepSchema.shape.price_cents.optional() })) as never,
    defaultValues: {
      make:            (initialData?.make as string) ?? '',
      model:           (initialData?.model as string) ?? '',
      year:            (initialData?.year as number) ?? new Date().getFullYear(),
      mileage:         (initialData?.mileage as number) ?? 0,
      price:           initialData?.price_cents ? (initialData.price_cents as number) / 100 : 0,
      color:           (initialData?.color as string) ?? '',
      trim:            (initialData?.trim as string) ?? '',
      body_class:      (initialData?.body_class as string) ?? '',
      condition_notes: (initialData?.condition_notes as string) ?? '',
    },
  })

  async function onSubmit(data: DetailsStepInput & { price: number }) {
    setServerError(null)
    const { price, ...rest } = data as { price: number } & Omit<DetailsStepInput, 'price_cents'>
    const result = await updateListingAction(listingId, { ...rest, price_cents: Math.round(price * 100) })
    if ('error' in result) {
      setServerError(result.error)
      return
    }
    onSave()
  }

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">Vehicle Details</h2>
      <p className="mb-6 text-sm text-[#78716c]">Fill in the vehicle details. Pre-filled fields are editable.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit as never)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="make" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Make *</FormLabel>
                <FormControl><Input className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="Honda" {...field} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
            <FormField control={form.control} name="model" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Model *</FormLabel>
                <FormControl><Input className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="Accord" {...field} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="year" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Year *</FormLabel>
                <FormControl><Input type="number" className="border-[#e7e5e4] bg-white text-[#1c1917]" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl>
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

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name={"price" as never} render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Price (USD) *</FormLabel>
                <FormControl><Input type="number" step="0.01" className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="15000" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
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

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="trim" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Trim</FormLabel>
                <FormControl><Input className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="EX-V6" {...field} /></FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )} />
            <FormField control={form.control} name="body_class" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">Body Style</FormLabel>
                <FormControl><Input className="border-[#e7e5e4] bg-white text-[#1c1917]" placeholder="Coupe" {...field} /></FormControl>
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

          {serverError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50">
            {form.formState.isSubmitting ? 'Saving...' : 'Save & Continue'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
