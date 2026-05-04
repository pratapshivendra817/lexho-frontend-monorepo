import type { PropsWithChildren } from 'react'

interface CardProps {
  className?: string
}

export const Card = ({ children, className }: PropsWithChildren<CardProps>) => {
  return (
    <div className={`bg-gray-900 p-5 rounded-2xl shadow border border-gray-800 ${className ?? ''}`.trim()}>
      {children}
    </div>
  )
}
