import { db } from "../firebase";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

export type UserProfile = {
  uid: string;
  displayName: string;
  onboardingCompleted: boolean;
  termsAcceptedAt?: any;
  locationPermission?: "granted" | "denied" | "unknown";
  settings?: {
    locationSharingEnabled?: boolean;
  };
  emergencyName?: string;
  emergencyPhone?: string;
  bloodGroup?: string;
  createdAt?: any;
  updatedAt?: any;
};

export async function ensureUserProfile(uid: string, displayName: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      displayName,
      onboardingCompleted: false,
      locationPermission: "unknown",
      settings: { locationSharingEnabled: true },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as UserProfile);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function completeOnboarding(uid: string) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    onboardingCompleted: true,
    termsAcceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setEmergencyDetails(uid: string, patch: Partial<UserProfile>) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

export async function setLocationPermission(uid: string, status: "granted" | "denied") {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { locationPermission: status, updatedAt: serverTimestamp() });
}

export async function setLocationSharingEnabled(uid: string, enabled: boolean) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    settings: { locationSharingEnabled: enabled },
    updatedAt: serverTimestamp(),
  });
}
