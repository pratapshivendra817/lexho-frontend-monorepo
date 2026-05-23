import Geolocation from "react-native-geolocation-service";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export async function getCurrentCoordinates(timeout = 15000): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(error.message || "Unable to fetch GPS location"));
      },
      {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 10000,
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );
  });
}
