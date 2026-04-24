import { create } from 'zustand'
import { UserRole } from '@lexho/constants'

interface AuthState {
  userId: string | null
  email: string | null
  role: UserRole | null
  accessToken: string | null
  setAuth: (payload: {
    userId: string
    email: string
    role: UserRole
    accessToken: string
  }) => void
  clearAuth: () => void
}

export const useAuth = create<AuthState>((set) => ({
  userId: null,
  email: null,
  role: null,
  accessToken: null,
  setAuth: (payload) => set(payload),
  clearAuth: () =>
    set({
      userId: null,
      email: null,
      role: null,
      accessToken: null
    })
}))
