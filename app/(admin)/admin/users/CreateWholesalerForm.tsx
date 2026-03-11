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
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-zinc-50 text-base font-semibold">
          Create Wholesaler Account
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Business Name
            </label>
            <input
              type="text"
              {...register('businessName')}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Acme Auto Wholesale"
            />
            {errors.businessName && (
              <p className="text-red-400 text-xs mt-1">
                {errors.businessName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="seller@example.com"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Password
            </label>
            <input
              type="password"
              {...register('password')}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min 8 characters"
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </CardContent>
    </Card>
  )
}
