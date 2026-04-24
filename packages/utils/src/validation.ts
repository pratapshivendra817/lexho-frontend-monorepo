export const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export const isStrongPassword = (value: string): boolean => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value)
}

export const isValidOtp = (value: string): boolean => {
  return /^\d{6}$/.test(value)
}
