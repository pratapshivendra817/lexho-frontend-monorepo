import {
  clearSession,
  getRefreshToken,
  getToken,
  loadSession,
  saveSession,
  type SessionUser,
} from "../utils/storage";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export const tokenStorage = {
  getAccessToken: getToken,
  getRefreshToken,
  getSession: loadSession,

  async saveTokens(tokens: AuthTokens, user?: SessionUser | null) {
    await saveSession(tokens.accessToken, tokens.refreshToken, user);
  },

  clear: clearSession,
};

