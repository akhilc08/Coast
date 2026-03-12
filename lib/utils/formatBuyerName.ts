/**
 * Derives a privacy-safe display name from a buyer's full_name.
 * Returns "First L." for "First Last", full name if single-word, "Anonymous" if blank/null.
 */
export function formatBuyerName(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim() ?? ''
  if (!trimmed) return 'Anonymous'

  const spaceIdx = trimmed.indexOf(' ')
  if (spaceIdx === -1) return trimmed

  const firstName = trimmed.slice(0, spaceIdx)
  const remainder = trimmed.slice(spaceIdx + 1)
  // Find first non-space character in the remainder for the initial
  const lastInitialChar = remainder.trimStart()[0]
  if (!lastInitialChar) return firstName

  return `${firstName} ${lastInitialChar.toUpperCase()}.`
}
