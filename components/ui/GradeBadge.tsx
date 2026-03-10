interface GradeBadgeProps {
  grade: string | null | undefined
}

export function GradeBadge({ grade }: GradeBadgeProps) {
  if (!grade) {
    return (
      <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-500">
        Grade Pending
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full border border-blue-800 bg-blue-950 px-2 py-0.5 text-xs font-medium text-blue-300">
      Grade: {grade}
    </span>
  )
}
