export interface TokenStorage {
  setAccessToken(token: string): Promise<void>
  getAccessToken(): Promise<string | null>
  clear(): Promise<void>
}

export const createInMemoryTokenStorage = (): TokenStorage => {
  let token: string | null = null

  return {
    async setAccessToken(value: string) {
      token = value
    },
    async getAccessToken() {
      return token
    },
    async clear() {
      token = null
    }
  }
}
