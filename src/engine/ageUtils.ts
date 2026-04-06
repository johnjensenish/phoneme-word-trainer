/**
 * Compute a child's age in months from birth month/year.
 */
export function computeAgeMonths(birthMonth: number, birthYear: number): number {
  const now = new Date()
  return (now.getFullYear() - birthYear) * 12 + (now.getMonth() + 1 - birthMonth)
}

export function formatAge(months: number): string {
  if (months < 24) return `${months} months old`
  const y = Math.floor(months / 12)
  const m = months % 12
  if (m === 0) return `${y} year${y > 1 ? 's' : ''} old`
  return `${y} year${y > 1 ? 's' : ''}, ${m} month${m !== 1 ? 's' : ''} old`
}

export function formatAgeShort(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}m`
  if (m === 0) return `${y}y`
  return `${y}y ${m}m`
}
