declare module "react-native-vector-icons/MaterialCommunityIcons";

declare module "react-native-geolocation-service" {
  export type GeolocationResponse = {
    coords: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      altitude?: number | null;
      heading?: number | null;
      speed?: number | null;
    };
    timestamp: number;
  };

  export type GeolocationError = { code: number; message: string };

  const Geolocation: {
    getCurrentPosition: (
      success: (position: GeolocationResponse) => void,
      error?: (error: GeolocationError) => void,
      options?: {
        enableHighAccuracy?: boolean;
        timeout?: number;
        maximumAge?: number;
        forceRequestLocation?: boolean;
        showLocationDialog?: boolean;
      },
    ) => void;
  };

  export default Geolocation;
}

declare module "react-native-permissions" {
  export const PERMISSIONS: {
    ANDROID: { ACCESS_FINE_LOCATION: string };
    IOS: { LOCATION_WHEN_IN_USE: string };
  };

  export const RESULTS: {
    GRANTED: "granted";
    DENIED: "denied";
    BLOCKED: "blocked";
    UNAVAILABLE: "unavailable";
    LIMITED: "limited";
  };

  export function check(permission: string): Promise<string>;
  export function request(permission: string): Promise<string>;
  export function openSettings(): Promise<void>;
}
