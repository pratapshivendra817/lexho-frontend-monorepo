import { NativeModules, Platform } from 'react-native';
import { detectDeviceSecurityStatus } from '../src/services/security/rootDetectionService';

jest.mock('../src/services/crashlyticsService', () => ({ recordCrash: jest.fn() }));
jest.mock('../src/services/firebaseAnalytics', () => ({
  trackEvent: jest.fn(),
  PARTNER_ANALYTICS_EVENTS: { securityBlocked: 'security_blocked' },
}));
jest.mock('jail-monkey', () => ({
  isJailBroken: () => true,
  isDebuggedMode: () => true,
}));

describe('emulator development security', () => {
  const originalConstants = NativeModules.PlatformConstants;
  const originalDev = __DEV__;
  const originalOs = Platform.OS;
  beforeEach(() => { Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' }); });
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOs });
    NativeModules.PlatformConstants = originalConstants;
    (global as any).__DEV__ = originalDev;
  });

  it('allows a debug emulator', async () => {
    (global as any).__DEV__ = true;
    NativeModules.PlatformConstants = { Fingerprint: 'generic/sdk', Model: 'sdk' };
    expect((await detectDeviceSecurityStatus()).blocked).toBe(false);
  });

  it('keeps security checks on release emulators', async () => {
    (global as any).__DEV__ = false;
    NativeModules.PlatformConstants = { Fingerprint: 'generic/sdk', Model: 'sdk' };
    expect((await detectDeviceSecurityStatus()).blocked).toBe(true);
  });

  it('keeps security checks on physical debug devices', async () => {
    (global as any).__DEV__ = true;
    NativeModules.PlatformConstants = { Fingerprint: 'samsung/device', Model: 'Galaxy' };
    expect((await detectDeviceSecurityStatus()).blocked).toBe(true);
  });
});
