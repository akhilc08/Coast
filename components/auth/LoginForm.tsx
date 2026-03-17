'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/browser'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import Link from 'next/link'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)

  const paramError = searchParams.get('error')

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: LoginInput) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setServerError('Invalid email or password. Please try again.')
      return
    }

    const { data: { user: loggedInUser } } = await supabase.auth.getUser()
    const role = loggedInUser?.app_metadata?.role
    if (role === 'admin') {
      router.push('/admin')
    } else if (role === 'wholesaler') {
      router.push('/seller/dashboard')
    } else {
      router.push('/')
    }
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {paramError === 'verification_failed' && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-sm text-red-600">Email verification failed. Please request a new link.</p>
          </div>
        )}

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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className="text-[#374151]">Password</FormLabel>
                <Link href="/forgot-password" className="text-xs text-[#6b7280] hover:text-[#111]">
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  className="border-[#d1d5db] bg-white text-[#111] placeholder:text-[#9ca3af] focus:border-[#2563eb]"
                  {...field}
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
          className="w-full bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50"
        >
          {form.formState.isSubmitting ? 'Logging in...' : 'Log in'}
        </Button>

        <p className="text-center text-sm text-[#6b7280]">
          New to Coast?{' '}
          <Link href="/signup" className="text-[#2563eb] hover:underline font-medium">
            Create account
          </Link>
        </p>
      </form>
    </Form>
  )
}
