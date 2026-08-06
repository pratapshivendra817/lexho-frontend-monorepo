declare module "react-native-config" {
  export interface NativeConfig {
    API_BASE_URL?: string;
    MAPBOX_PUBLIC_TOKEN?: string;
    TURN_URL?: string;
    TURN_USERNAME?: string;
    TURN_PASSWORD?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
