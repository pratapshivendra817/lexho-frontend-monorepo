import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  label?: string
  variant?: 'green' | 'red' | 'default'
}

const variantClassMap: Record<NonNullable<ButtonProps['variant']>, string> = {
  green: 'bg-green-600 hover:bg-green-700',
  red: 'bg-red-600 hover:bg-red-700',
  default: 'bg-gray-700 hover:bg-gray-600'
}

export const Button = ({
  children,
  loading = false,
  label,
  className,
  variant = 'default',
  ...props
}: PropsWithChildren<ButtonProps>) => {
  const baseClass = 'px-4 py-2 rounded-lg text-sm font-medium text-white'
  const mergedClassName = `${baseClass} ${variantClassMap[variant]} ${className ?? ''}`.trim()

  return (
    <button {...props} className={mergedClassName} disabled={loading || props.disabled}>
      {loading ? 'Please wait...' : (children ?? label)}
    </button>
  )
}
