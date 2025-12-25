import { db } from "../firebase";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";

export type LocationSharingMode = "always" | "rideOnly" | "off";

export type UserSettings = {
  locationSharingMode: LocationSharingMode;
  rideActive?: boolean;
};

export function subscribeToUserSettings(userId: string, cb: (s: UserSettings) => void) {
  const ref = doc(db, "users", userId);
  return onSnapshot(ref, async (snap) => {
    if (!snap.exists()) {
      await setDoc(ref, { locationSharingMode: "always", rideActive: false }, { merge: true });
      cb({ locationSharingMode: "always", rideActive: false });
      return;
    }
    const data = snap.data() as any;
    cb({
      locationSharingMode: (data.locationSharingMode as LocationSharingMode) || "always",
      rideActive: !!data.rideActive,
    });
  });
}

export async function updateLocationSharingMode(userId: string, mode: LocationSharingMode) {
  await updateDoc(doc(db, "users", userId), { locationSharingMode: mode });
}

export async function setRideActive(userId: string, rideActive: boolean) {
  await updateDoc(doc(db, "users", userId), { rideActive });
}
