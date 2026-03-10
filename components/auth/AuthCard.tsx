import { cn } from '@/lib/utils'

interface AuthCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function AuthCard({ title, description, children, className }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className={cn(
        'w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl',
        className
      )}>
        {/* Logo mark */}
        <div className="mb-8 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-zinc-100 font-semibold text-lg tracking-tight">Coast</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1.5 text-sm text-zinc-400">{description}</p>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}
