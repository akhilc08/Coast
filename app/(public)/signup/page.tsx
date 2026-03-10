import { AuthCard } from '@/components/auth/AuthCard'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata = { title: 'Create Account — Coast' }

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Join Coast to browse and purchase wholesale vehicles."
    >
      <SignupForm />
    </AuthCard>
  )
}
