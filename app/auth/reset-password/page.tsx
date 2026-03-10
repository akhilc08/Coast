import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { AuthCard } from '@/components/auth/AuthCard'

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Set new password"
      description="Enter your new password below."
    >
      <ResetPasswordForm />
    </AuthCard>
  )
}
