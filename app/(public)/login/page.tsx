import { AuthCard } from '@/components/auth/AuthCard'
import { LoginForm } from '@/components/auth/LoginForm'
import { Suspense } from 'react'

export const metadata = { title: 'Log In — Coast' }

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Log in to your Coast account."
    >
      {/* Suspense required because LoginForm uses useSearchParams() */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  )
}
