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

  // Show error from email confirmation failure if redirected with ?error=verification_failed
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

    // Redirect based on role
    const { data: { user: loggedInUser } } = await supabase.auth.getUser()
    const role = loggedInUser?.app_metadata?.role
    if (role === 'admin') {
      router.push('/admin')
    } else if (role === 'wholesaler') {
      router.push('/seller')
    } else {
      router.push('/')
    }
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {paramError === 'verification_failed' && (
          <div className="rounded-md border border-red-800 bg-red-950 px-3 py-2">
            <p className="text-sm text-red-300">Email verification failed. Please request a new link.</p>
          </div>
        )}

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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className="text-zinc-300">Password</FormLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-600"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        {serverError && (
          <p className="rounded-md bg-red-950 border border-red-800 px-3 py-2 text-sm text-red-300">
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {form.formState.isSubmitting ? 'Logging in...' : 'Log in'}
        </Button>

        <p className="text-center text-sm text-zinc-500">
          New to Coast?{' '}
          <Link href="/signup" className="text-blue-400 hover:text-blue-300">
            Create account
          </Link>
        </p>
      </form>
    </Form>
  )
}
