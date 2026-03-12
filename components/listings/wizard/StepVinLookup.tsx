'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { vinStepSchema, type VinStepInput } from '@/lib/validations/listing'
import { decodeVin } from '@/lib/nhtsa'
import { createDraftAction } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

interface StepVinLookupProps {
  onSuccess: (draftId: string) => void
}

export function StepVinLookup({ onSuccess }: StepVinLookupProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<VinStepInput>({
    resolver: zodResolver(vinStepSchema),
    defaultValues: { vin: '' },
  })

  async function onSubmit(data: VinStepInput) {
    setServerError(null)
    const vin = data.vin.toUpperCase()

    // Attempt NHTSA lookup — failure is OK, wholesaler can fill manually
    await decodeVin(vin)

    const result = await createDraftAction(vin)
    if ('error' in result) {
      setServerError(result.error)
      return
    }

    onSuccess(result.id)
  }

  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
      <h2 className="mb-1 text-xl font-semibold text-[#1c1917]">VIN Lookup</h2>
      <p className="mb-6 text-sm text-[#78716c]">Enter the Vehicle Identification Number to auto-fill vehicle details.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="vin"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#78716c]">VIN</FormLabel>
                <FormControl>
                  <Input
                    placeholder="1HGCM82633A004352"
                    className="border-[#e7e5e4] bg-white font-mono text-[#1c1917] uppercase placeholder:normal-case placeholder:text-[#a8a29e] focus:border-blue-600"
                    maxLength={17}
                    {...field}
                    onChange={e => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />

          {serverError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {form.formState.isSubmitting ? 'Looking up VIN...' : 'Look Up VIN'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
