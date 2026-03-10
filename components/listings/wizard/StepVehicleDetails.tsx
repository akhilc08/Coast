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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="mb-1 text-xl font-semibold text-zinc-100">Vehicle Details</h2>
      <p className="mb-6 text-sm text-zinc-400">Fill in the vehicle details. Pre-filled fields are editable.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit as never)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="make" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Make *</FormLabel>
                <FormControl><Input className="border-zinc-700 bg-zinc-800 text-zinc-100" placeholder="Honda" {...field} /></FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )} />
            <FormField control={form.control} name="model" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Model *</FormLabel>
                <FormControl><Input className="border-zinc-700 bg-zinc-800 text-zinc-100" placeholder="Accord" {...field} /></FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="year" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Year *</FormLabel>
                <FormControl><Input type="number" className="border-zinc-700 bg-zinc-800 text-zinc-100" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )} />
            <FormField control={form.control} name="mileage" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Mileage *</FormLabel>
                <FormControl><Input type="number" className="border-zinc-700 bg-zinc-800 text-zinc-100" placeholder="45000" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name={"price" as never} render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Price (USD) *</FormLabel>
                <FormControl><Input type="number" step="0.01" className="border-zinc-700 bg-zinc-800 text-zinc-100" placeholder="15000" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )} />
            <FormField control={form.control} name="color" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Color</FormLabel>
                <FormControl><Input className="border-zinc-700 bg-zinc-800 text-zinc-100" placeholder="Silver" {...field} /></FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="trim" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Trim</FormLabel>
                <FormControl><Input className="border-zinc-700 bg-zinc-800 text-zinc-100" placeholder="EX-V6" {...field} /></FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )} />
            <FormField control={form.control} name="body_class" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Body Style</FormLabel>
                <FormControl><Input className="border-zinc-700 bg-zinc-800 text-zinc-100" placeholder="Coupe" {...field} /></FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="condition_notes" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-300">Condition Notes</FormLabel>
              <FormControl>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none"
                  placeholder="Describe the vehicle condition..."
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )} />

          {serverError && (
            <p className="rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">{serverError}</p>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50">
            {form.formState.isSubmitting ? 'Saving...' : 'Save & Continue'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
