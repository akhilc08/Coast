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
    // Always show success message — don't leak whether email exists
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-800 bg-blue-950 p-4">
          <p className="text-sm text-blue-200">
            If an account exists with that email, you will receive a password reset link shortly.
          </p>
        </div>
        <Link
          href="/login"
          className="block text-center text-sm text-zinc-500 hover:text-zinc-300"
        >
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
              <FormLabel className="text-zinc-300">Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-600"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {form.formState.isSubmitting ? 'Sending...' : 'Send reset link'}
        </Button>

        <p className="text-center text-sm text-zinc-500">
          Remembered it?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Back to login
          </Link>
        </p>
      </form>
    </Form>
  )
}
