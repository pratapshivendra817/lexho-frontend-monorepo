import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export const Input = ({ label, error, ...props }: InputProps) => {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label ? <span>{label}</span> : null}
      <input
        {...props}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 10,
          border: '1px solid #4b5563',
          background: '#1f2937',
          color: '#e5e7eb',
          ...(props.style ?? {})
        }}
      />
      {error ? <span style={{ color: 'crimson' }}>{error}</span> : null}
    </label>
  )
}
