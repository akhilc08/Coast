interface GradeBadgeProps {
  grade: string | null | undefined
}

function gradeColors(grade: string) {
  if (grade.startsWith('A')) return 'border-green-200 bg-green-50 text-green-700'
  if (grade.startsWith('B')) return 'border-blue-200 bg-blue-50 text-blue-700'
  if (grade.startsWith('C')) return 'border-yellow-200 bg-yellow-50 text-yellow-700'
  return 'border-red-200 bg-red-50 text-red-700'
}

export function GradeBadge({ grade }: GradeBadgeProps) {
  if (!grade) {
    return (
      <span className="inline-flex items-center rounded-full border border-[#e7e5e4] bg-[#f5f5f4] px-3 py-1 text-sm font-medium text-[#a8a29e]">
        Grade Pending
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${gradeColors(grade)}`}>
      {grade}
    </span>
  )
}
