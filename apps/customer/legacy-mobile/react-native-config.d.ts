declare module 'react-native-config' {
  export interface NativeConfig {
    API_BASE_URL?: string;
    TURN_URL?: string;
    TURN_USERNAME?: string;
    TURN_PASSWORD?: string;
    ANDROID_EMULATOR_HOST?: string;
    AUTH_FALLBACK_BASE_URLS?: string;
    DEV_LAN_HOST?: string;
    MANUAL_REAL_DEVICE_API_HOST?: string;
    MAPBOX_PUBLIC_TOKEN?: string;
    SSL_PINNING_ENABLED?: string;
    SSL_PINNING_CERT_NAME?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
