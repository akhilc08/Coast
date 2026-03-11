'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { createWholesalerSchema, type CreateWholesalerInput } from '@/lib/validations/admin'
import { createWholesalerAction } from '@/app/actions/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CreateWholesalerForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWholesalerInput>({
    resolver: zodResolver(createWholesalerSchema),
  })

  async function onSubmit(data: CreateWholesalerInput) {
    const result = await createWholesalerAction(data)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Wholesaler account created')
      reset()
    }
  }

  return (
    <Card className="border-[#e7e5e4] bg-white">
      <CardHeader>
        <CardTitle className="text-[#1c1917] text-base font-semibold">
          Create Wholesaler Account
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-[#78716c] mb-1">
              Business Name
            </label>
            <input
              type="text"
              {...register('businessName')}
              className="w-full rounded-md border border-[#e7e5e4] bg-[#faf9f6] px-3 py-2 text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
              placeholder="Acme Auto Wholesale"
            />
            {errors.businessName && (
              <p className="text-red-600 text-xs mt-1">
                {errors.businessName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-[#78716c] mb-1">Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full rounded-md border border-[#e7e5e4] bg-[#faf9f6] px-3 py-2 text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
              placeholder="seller@example.com"
            />
            {errors.email && (
              <p className="text-red-600 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-[#78716c] mb-1">
              Password
            </label>
            <input
              type="password"
              {...register('password')}
              className="w-full rounded-md border border-[#e7e5e4] bg-[#faf9f6] px-3 py-2 text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
              placeholder="Min 8 characters"
            />
            {errors.password && (
              <p className="text-red-600 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-[#1c1917] px-4 py-2 text-sm font-medium text-white hover:bg-[#292524] disabled:opacity-50 cursor-pointer transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </CardContent>
    </Card>
  )
}
