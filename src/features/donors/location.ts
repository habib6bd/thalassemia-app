import * as Location from "expo-location";

export type ApproxPoint = { latitude: number; longitude: number };

/** Rounds to 2 decimals (~1 km); the server rounds again. */
export function approximate(point: ApproxPoint): ApproxPoint {
  return {
    latitude: Math.round(point.latitude * 100) / 100,
    longitude: Math.round(point.longitude * 100) / 100,
  };
}

/**
 * Asks for foreground permission and reads one coarse position. Returns
 * null if the user says no. Nothing runs in the background.
 */
export async function getApproximatePosition(): Promise<ApproxPoint | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Low,
  });
  return approximate(position.coords);
}
