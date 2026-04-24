import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
}

export const Button = ({ children, loading = false, ...props }: PropsWithChildren<ButtonProps>) => {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading ? 'Please wait...' : children}
    </button>
  )
}
