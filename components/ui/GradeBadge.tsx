interface GradeBadgeProps {
  grade: string | null | undefined
}

export function GradeBadge({ grade }: GradeBadgeProps) {
  if (!grade) {
    return (
      <span className="inline-flex items-center rounded-full border border-[#e7e5e4] bg-[#f5f5f4] px-2 py-0.5 text-xs font-medium text-[#a8a29e]">
        Grade Pending
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
      Grade: {grade}
    </span>
  )
}
