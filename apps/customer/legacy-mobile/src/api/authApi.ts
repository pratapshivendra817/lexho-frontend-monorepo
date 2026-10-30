import { api, parseApiError } from './client';
import axios from 'axios';
import { API_BASE_URL, AUTH_FALLBACK_BASE_URLS } from '../constants/env';
import type {
  RefreshTokenRequest,
  RefreshTokenResponse,
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '../types/contracts';
import { getOrCreateDeviceId } from '../utils/storage';

const AUTH_RETRY_TIMEOUT_MS = 6000;
const MAX_FALLBACK_ATTEMPTS = 3;

function removeTrailingSlashes(value: string): string {
  let end = value.length;

  while (end > 0 && value.codePointAt(end - 1) === 47) {
    end -= 1;
  }

  return end === value.length ? value : value.slice(0, end);
}

function buildAuthBaseCandidates() {
  const normalized = removeTrailingSlashes(API_BASE_URL);
  return Array.from(
    new Set([normalized, ...AUTH_FALLBACK_BASE_URLS].filter(Boolean)),
  );
}

async function postWithBaseAndPathFallback<T>(
  paths: string[],
  payload: any,
): Promise<T> {
  const normalizedPaths = Array.from(
    new Set(
      paths
        .map(value => String(value ?? '').trim())
        .filter(value => value.length > 0),
    ),
  );
  if (normalizedPaths.length === 0) {
    throw new Error('Auth path is missing');
  }

  let lastError: any = null;
  try {
    const { data } = await api.post(normalizedPaths[0], payload);
    return data as T;
  } catch (error: any) {
    lastError = error;
    const message = String(error?.message ?? '').toLowerCase();
    const status = Number(error?.response?.status ?? 0);
    const code = String(error?.code ?? '').toUpperCase();
    const shouldFallback =
      message.includes('network error') ||
      code === 'ERR_NETWORK' ||
      code === 'ECONNABORTED' ||
      status === 404 ||
      status === 405;
    if (!shouldFallback) {
      throw lastError;
    }

    const bases = buildAuthBaseCandidates();
    const candidateUrls = normalizedPaths.flatMap(path =>
      bases.map(base => `${base}${path}`),
    );
    const uniqueCandidateUrls = Array.from(new Set(candidateUrls)).slice(
      0,
      MAX_FALLBACK_ATTEMPTS,
    );

    for (const url of uniqueCandidateUrls) {
      try {
        const { data } = await axios.post(url, payload, {
          timeout: AUTH_RETRY_TIMEOUT_MS,
        });
        return data as T;
      } catch (retryError: any) {
        lastError = retryError;
        // try next candidate
      }
    }
    throw lastError;
  }
}

export async function sendOtp(mobile: string): Promise<SendOtpResponse> {
  try {
    const payload: SendOtpRequest = { mobile, role: 'CUSTOMER' };
    const data = await postWithBaseAndPathFallback<SendOtpResponse>(
      ['/customer/otp/send', '/otp/send', '/api/customer/otp/send'],
      payload,
    );
    return data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && !error.response) {
      throw new Error(
        `Network Error: cannot reach ${removeTrailingSlashes(
          API_BASE_URL,
        )}/customer/otp/send from device. Ensure phone and PC are on same Wi-Fi and backend is running on port 8082.`,
      );
    }
    throw new Error(parseApiError(error, 'Failed to send OTP'));
  }
}

export async function verifyOtp(
  mobile: string,
  otp: string,
): Promise<VerifyOtpResponse> {
  try {
    const payload: VerifyOtpRequest = {
      mobile,
      otp,
      role: 'CUSTOMER',
    };
    return await postWithBaseAndPathFallback<VerifyOtpResponse>(
      ['/customer/otp/verify', '/otp/verify', '/api/customer/otp/verify'],
      payload,
    );
  } catch (error) {
    throw new Error(parseApiError(error, 'OTP verification failed'));
  }
}

export async function logoutApi() {
  try {
    const { data } = await api.post('/auth/logout');
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, 'Logout failed'));
  }
}

export async function refreshTokenApi(
  refreshToken: string,
): Promise<RefreshTokenResponse> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const payload: RefreshTokenRequest & { deviceId: string } = {
      refreshToken,
      deviceId,
    };
    const { data } = await api.post('/api/auth/refresh', payload);
    return data as RefreshTokenResponse;
  } catch (error) {
    throw new Error(parseApiError(error, 'Refresh token failed'));
  }
}
