'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordRequestSchema, type ResetPasswordRequestInput } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import Link from 'next/link'

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<ResetPasswordRequestInput>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: ResetPasswordRequestInput) {
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            If an account exists with that email, you will receive a password reset link shortly.
          </p>
        </div>
        <Link href="/login" className="block text-center text-sm text-[#6b7280] hover:text-[#111]">
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#374151]">Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  className="border-[#d1d5db] bg-white text-[#111] placeholder:text-[#9ca3af] focus:border-[#2563eb]"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50"
        >
          {form.formState.isSubmitting ? 'Sending...' : 'Send reset link'}
        </Button>

        <p className="text-center text-sm text-[#6b7280]">
          Remembered it?{' '}
          <Link href="/login" className="text-[#2563eb] hover:underline font-medium">
            Back to login
          </Link>
        </p>
      </form>
    </Form>
  )
}
