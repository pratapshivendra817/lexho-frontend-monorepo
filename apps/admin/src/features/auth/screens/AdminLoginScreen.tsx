import { useState } from 'react'
import { Button, Input } from '@lexho/ui'
import { isValidEmail } from '@lexho/utils'
import { validateOtpPayload } from '@lexho/auth'

export const AdminLoginScreen = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'PASSWORD' | 'OTP'>('PASSWORD')

  const submitPassword = () => {
    if (!isValidEmail(email) || !password) {
      return
    }

    // call auth API from @lexho/api package here
    setStep('OTP')
  }

  const submitOtp = () => {
    if (!validateOtpPayload({ email, otp })) {
      return
    }

    // verify OTP and persist token with @lexho/auth session manager
  }

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Input label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />

      {step === 'PASSWORD' ? (
        <>
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button onClick={submitPassword}>Request OTP</Button>
        </>
      ) : (
        <>
          <Input label="OTP" value={otp} onChange={(event) => setOtp(event.target.value)} />
          <Button onClick={submitOtp}>Verify OTP</Button>
        </>
      )}
    </div>
  )
}
