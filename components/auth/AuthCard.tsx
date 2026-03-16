import Link from 'next/link'
import { cn } from '@/lib/utils'

interface AuthCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function AuthCard({ title, description, children, className }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className={cn(
        'w-full max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-sm',
        className
      )}>
        {/* Logo */}
        <div className="mb-8">
          <Link href="/" className="text-[22px] font-extrabold tracking-tight text-[#111]">
            Coast<span className="text-[#2563eb]">.</span>
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0f172a] tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1.5 text-sm text-[#64748b]">{description}</p>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}
