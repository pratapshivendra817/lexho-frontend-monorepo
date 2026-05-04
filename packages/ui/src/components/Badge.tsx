type BadgeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | string

interface BadgeProps {
  status: BadgeStatus
}

const styleMap: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400'
}

export const Badge = ({ status }: BadgeProps) => {
  const baseClass = 'px-3 py-1 rounded-full text-xs font-medium'
  const statusClass = styleMap[status] ?? 'bg-gray-700 text-gray-200'
  return <span className={`${baseClass} ${statusClass}`}>{status}</span>
}
