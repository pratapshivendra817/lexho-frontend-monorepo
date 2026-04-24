import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export const Input = ({ label, error, ...props }: InputProps) => {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label ? <span>{label}</span> : null}
      <input {...props} />
      {error ? <span style={{ color: 'crimson' }}>{error}</span> : null}
    </label>
  )
}
